/*
  Layout/paginate.js
  Processes <RT·article> tags and paginates their contents.
  Handles inline footnotes, element splitting, and page height limits.
*/

(function(){

  if(!window.RT){
    console.error("RT not defined. Was RT-Manuscript_make run?");
    return;
  }

  const RT = window.RT;
  const debug = RT.Debug || { log: function(){} ,error: function(){} };
  const page_conf = (RT.config && RT.config.page) ? RT.config.page : {};
  const page_height_limit = page_conf.height_limit || 1000;

  let measure_container = null;

  function get_el_height(el){
    const was_in_DOM = el.parentNode !== null;
    if(!was_in_DOM) document.body.appendChild(el);
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const margin = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    if(!was_in_DOM) el.remove();
    return (rect.height || 0) + (margin || 0);
  }

  function get_measure_container(){
    if(measure_container && measure_container.parentNode) return measure_container;
    const article = document.querySelector('RT·article, rt·article');
    if(!article){
      const temp = document.createElement('div');
      temp.style.visibility = 'hidden';
      temp.style.position = 'absolute';
      temp.style.width = '100%'; 
      document.body.appendChild(temp);
      measure_container = temp;
      return temp;
    }
    const container = document.createElement('div');
    const article_style = window.getComputedStyle(article);
    container.style.visibility = 'hidden';
    container.style.position = 'absolute';
    container.style.width = article_style.width;
    container.style.fontFamily = article_style.fontFamily;
    container.style.fontSize = article_style.fontSize;
    container.style.lineHeight = article_style.lineHeight;
    container.style.fontWeight = article_style.fontWeight;
    document.body.appendChild(container);
    measure_container = container;
    return container;
  }

  function measure_fragment(frag){
    const container = get_measure_container();
    container.appendChild(frag);
    const h = get_el_height(frag);
    container.removeChild(frag);
    return h;
  }

  function is_splittable(el){
    if(!el || el.nodeType !== Node.ELEMENT_NODE) return null;

    const component_id = el.getAttribute('data-rt-component');
    if(component_id && window.RT.Component && window.RT.Component[component_id] && window.RT.Component[component_id].split){
      return (remaining ,force) => window.RT.Component[component_id].split(el ,remaining ,measure_fragment ,force);
    }

    if(el.hasAttribute('splitable') && window.RT.Splitter && window.RT.Splitter[(el.tagName || '').toLowerCase()]){
      return (remaining ,force) => window.RT.Splitter[(el.tagName || '').toLowerCase()](el ,remaining ,measure_fragment ,is_splittable ,force);
    }

    const tag = (el.tagName || '').toUpperCase();
    if(tag === 'UL' || tag === 'OL'){
      const items = Array.from(el.children).filter(c => (c.tagName || '').toUpperCase() === 'LI');
      if(items.length === 0) return null;

      const item_heights = items.map(li => get_el_height(li));
      const empty_clone = el.cloneNode(false);
      const overhead = get_el_height(empty_clone);

      el._splitInfo = { type: 'list' ,itemHeights: item_heights ,overhead: overhead ,offset: 0 };
      return make_list_splitter(el ,el._splitInfo);
    }

    if(tag === 'TABLE'){
      const thead = el.querySelector('thead');
      const tbody = el.querySelector('tbody');
      const rows = tbody ? Array.from(tbody.rows) : Array.from(el.rows);
      if(rows.length === 0) return null;

      const thead_height = thead ? get_el_height(thead) : 0;
      const row_heights = rows.map(row => get_el_height(row));

      const empty_clone = el.cloneNode(false);
      if(thead) empty_clone.appendChild(thead.cloneNode(true));
      empty_clone.appendChild(document.createElement('tbody'));
      const overhead = get_el_height(empty_clone) - thead_height;

      el._splitInfo = { type: 'table' ,rowHeights: row_heights ,overhead: overhead ,theadHeight: thead_height ,offset: 0 };
      return make_table_splitter(el ,el._splitInfo);
    }
    return null; 
  }

  function make_list_splitter(el ,info){
    return (remaining ,force) => {
      const children = Array.from(el.children).filter(c => (c.tagName || '').toUpperCase() === 'LI');
      const start = info.offset;

      let best_count = 0;
      let best_height = 0;
      const temp_list = el.cloneNode(false);
      
      for(let i = 0; i < children.length; i++){
        const item_clone = children[i].cloneNode(true);
        temp_list.appendChild(item_clone);
        const frag_height = measure_fragment(temp_list);
        if(frag_height <= remaining){
          best_count = i + 1;
          best_height = frag_height;
        }else{
          temp_list.removeChild(item_clone);
          break;
        }
      }

      if(best_count === 0){
        if(force && children.length > 0){
          best_count = 1;
          best_height = measure_fragment(children[0].cloneNode(true));
        }else{
          return { first: null ,rest: el ,firstHeight: 0 };
        }
      }

      if(best_count === children.length){
        return { first: el ,rest: null ,firstHeight: best_height };
      }

      const first = el.cloneNode(false);
      for(let i = 0; i < best_count; i++){
        first.appendChild(children[i].cloneNode(true));
      }

      let rest = null;
      if(best_count < children.length){
        rest = el.cloneNode(false);
        for(let i = best_count; i < children.length; i++){
          rest.appendChild(children[i].cloneNode(true));
        }

        if((el.tagName || '').toUpperCase() === 'OL'){
          const current_start = parseInt(el.getAttribute('start') ,10) || 1;
          rest.setAttribute('start' ,current_start + best_count);
        }

        rest._splitInfo = {
          type: 'list'
          ,itemHeights: info.itemHeights
          ,overhead: info.overhead
          ,offset: start + best_count
        };
      }

      return { first: first ,rest: rest ,firstHeight: best_height };
    };
  }

  function make_table_splitter(el ,info){
    const thead = el.querySelector('thead');
    const create_shell = () => {
      const shell = el.cloneNode(false);
      if(thead) shell.appendChild(thead.cloneNode(true));
      const new_tbody = document.createElement('tbody');
      shell.appendChild(new_tbody);
      return shell;
    };

    return (remaining ,force) => {
      const tbody = el.querySelector('tbody');
      const rows = tbody ? Array.from(tbody.rows) : Array.from(el.rows);
      const start = info.offset;

      let best_count = 0;
      let best_height = 0;
      const temp_table = create_shell();
      const temp_body = temp_table.querySelector('tbody');
      
      for(let i = 0; i < rows.length; i++){
        temp_body.appendChild(rows[i].cloneNode(true));
        const h = measure_fragment(temp_table);
        if(h <= remaining){
          best_count = i + 1;
          best_height = h;
        }else{
          temp_body.removeChild(temp_body.lastChild);
          break;
        }
      }

      if(best_count === 0){
        if(force && rows.length > 0){
          best_count = 1;
          best_height = measure_fragment(rows[0].cloneNode(true));
        }else{
          return { first: null ,rest: el ,firstHeight: 0 };
        }
      }

      if(best_count === rows.length){
        return { first: el ,rest: null ,firstHeight: best_height };
      }

      const first = create_shell();
      const first_body = first.querySelector('tbody');
      for(let i = 0; i < best_count; i++){
        first_body.appendChild(rows[i].cloneNode(true));
      }

      let rest = null;
      if(best_count < rows.length){
        rest = create_shell();
        const rest_body = rest.querySelector('tbody');
        for(let i = best_count; i < rows.length; i++){
          rest_body.appendChild(rows[i].cloneNode(true));
        }

        rest._splitInfo = {
          type: 'table'
          ,rowHeights: info.rowHeights
          ,overhead: info.overhead
          ,theadHeight: info.theadHeight
          ,offset: start + best_count
        };
      }

      return { first: first ,rest: rest ,firstHeight: best_height };
    };
  }

  window.RT.Splitter = window.RT.Splitter || {};

  window.RT.Splitter['rt·counter·step'] = function(el ,remaining ,measure_fn ,is_splittable_fn ,force){
    const children = Array.from(el.childNodes);
    let best_count = 0;
    let best_height = 0;
    const temp_container = el.cloneNode(false);
    let split_child_result = null;
    let forced_break = false;

    for(let i = 0; i < children.length; i++){
      const child = children[i];

      const tag = child.nodeType === Node.ELEMENT_NODE ? (child.tagName || '').toLowerCase() : '';
      if(tag === 'rt·page-break' || tag === 'rt·page-break-primitive'){
        forced_break = true;
        best_count = i;
        break;
      }

      temp_container.appendChild(child.cloneNode(true));
      const frag_height = measure_fn(temp_container);

      if(frag_height <= remaining){
        best_count = i + 1;
        best_height = frag_height;
      }else{
        temp_container.removeChild(temp_container.lastChild);
        const child_splitter = child.nodeType === Node.ELEMENT_NODE ? is_splittable_fn(child) : null;
        if(child_splitter){
          const child_split = child_splitter(remaining - best_height ,false);
          if(child_split && child_split.first){
            split_child_result = child_split;
            best_height += child_split.firstHeight;
            best_count = i;
          }
        }
        break;
      }
    }

    if(best_count === children.length && !split_child_result && !forced_break){
      return { first: el ,rest: null ,firstHeight: best_height };
    }

    if(best_count === 0 && !split_child_result && !forced_break){
      if(force && children.length > 0){
        best_count = 1;
        best_height = measure_fn(children[0].cloneNode(true));
      }else{
        return { first: null ,rest: el ,firstHeight: 0 };
      }
    }

    const first = el.cloneNode(false);
    first.setAttribute('continued' ,'true');
    const split_id = 'split_' + Math.random().toString(36).substr(2 ,9);
    first.setAttribute('split-id' ,split_id);
    
    for(let i = 0; i < best_count; i++){
      first.appendChild(children[i].cloneNode(true));
    }
    if(split_child_result) first.appendChild(split_child_result.first);

    let rest = null;
    if(best_count < children.length || split_child_result || forced_break){
      rest = el.cloneNode(false);
      rest.setAttribute('continuation' ,'true');
      
      if(split_child_result && split_child_result.rest){
        if(Array.isArray(split_child_result.rest)){
          split_child_result.rest.forEach(r_node => rest.appendChild(r_node));
        }else{
          rest.appendChild(split_child_result.rest);
        }
      }

      const start_index = forced_break ? best_count + 1 : (split_child_result ? best_count + 1 : best_count);
      for(let i = start_index; i < children.length; i++){
        rest.appendChild(children[i].cloneNode(true));
      }

      const make_tag = document.createElement('RT·counter·make');
      make_tag.setAttribute('counter' ,el.getAttribute('counter'));
      make_tag.setAttribute('continues' ,split_id); 

      rest = [make_tag ,rest];
    }

    return { first: first ,rest: rest ,firstHeight: best_height };
  };

  function paginate_0(){
    if(debug.log) debug.log('paginate_0' ,'Running initial document chunking');

    const article_seq = document.querySelectorAll('RT·article, rt·article, RT·memo, rt·memo');
    if(article_seq.length === 0){
      debug.error('pagination' ,'No <RT·article> elements found. Pagination aborted.');
      return;
    }

    const footnote_registry = {};
    let footnote_counter = 1;

    Array.from(article_seq).forEach(article => {
      const all_nodes = Array.from(article.querySelectorAll('*'));
      const raw_footnotes = all_nodes.filter(node => (node.tagName || '').toLowerCase() === 'rt·footnote');
      
      raw_footnotes.forEach(fn => {
        const id = footnote_counter++;
        footnote_registry[id] = fn.innerHTML;
        
        const prev = fn.previousSibling;
        if(prev && prev.nodeType === Node.TEXT_NODE){
          prev.textContent = prev.textContent.replace(/\s+$/ ,'');
        }

        const marker = document.createElement('RT·fn-marker');
        marker.setAttribute('data-id' ,id);
        
        if(fn.parentNode){
          fn.parentNode.replaceChild(marker ,fn);
        }
      });
    });

    function paginate_article(article){
      const raw_element_seq = Array.from(article.children).filter(el =>
        !['SCRIPT' ,'STYLE' ,'RT·PAGE' ,'RT·COUNTER·MAKE'].includes((el.tagName || '').toUpperCase()) 
      );

      const global_makes = Array.from(article.children).filter(el => (el.tagName || '').toUpperCase() === 'RT·COUNTER·MAKE');

      if(raw_element_seq.length === 0) return;

      const page_seq = [];
      let current_batch_seq = [];
      let current_h = 0;
      let i = 0;

      while(i < raw_element_seq.length){
        const el = raw_element_seq[i];
        const splitter = is_splittable(el);

        if(splitter){
          const remaining = page_height_limit - current_h;
          let split_res = splitter(remaining ,false);
          
          if(!split_res.first && current_h === 0){
            split_res = splitter(remaining ,true);
          }

          const { first ,rest ,firstHeight } = split_res;

          if(first){
            current_batch_seq.push(first);
            current_h += firstHeight;

            if(rest){
              if(Array.isArray(rest)){
                raw_element_seq.splice(i ,1 ,...rest);
              }else{
                raw_element_seq.splice(i ,1 ,rest);
              }
              
              if(current_h > 0){
                page_seq.push(current_batch_seq);
                current_batch_seq = [];
                current_h = 0;
              }
              continue; 
            }else{
              raw_element_seq.splice(i ,1);
              continue;
            }
          }else{
            let backtrack_seq = [];
            let backtrack_h = 0;
            
            while(current_batch_seq.length > 0){
              const last = current_batch_seq[current_batch_seq.length - 1];
              if(!last.tagName || !/^H[1-6]$/i.test(last.tagName)) break;
              const popped = current_batch_seq.pop();
              backtrack_seq.unshift(popped);
              backtrack_h += get_el_height(popped);
            }

            if(current_h - backtrack_h > 0){
              page_seq.push(current_batch_seq);
              current_batch_seq = backtrack_seq;
              current_h = backtrack_h;
            }else{
              current_batch_seq.push(...backtrack_seq);
              current_h += backtrack_h;
            }
          }
          continue;
        }

        const h = get_el_height(el);
        const tag = (el.tagName || '').toLowerCase();
        const is_RT_page_break = tag === 'rt·page-break' || tag === 'rt·page-break-primitive';

        if(is_RT_page_break){
          if(current_h > 0){
            page_seq.push(current_batch_seq);
            current_batch_seq = [];
            current_h = 0;
          }
          i++;
          continue; 
        }

        if(current_h + h > page_height_limit && current_h > 0){
          let backtrack_seq = [];
          let backtrack_h = 0;
          
          while(current_batch_seq.length > 0){
            const last = current_batch_seq[current_batch_seq.length - 1];
            if(!last.tagName || !/^H[1-6]$/i.test(last.tagName)) break;
            const popped = current_batch_seq.pop();
            backtrack_seq.unshift(popped);
            backtrack_h += get_el_height(popped);
          }

          if(current_h - backtrack_h > 0){
            page_seq.push(current_batch_seq);
            current_batch_seq = backtrack_seq;
            current_h = backtrack_h;
          }else{
            current_batch_seq.push(...backtrack_seq);
            current_h += backtrack_h;
          }
        }

        current_batch_seq.push(el);
        current_h += h;
        i++;
      }

      if(current_batch_seq.length > 0){
        page_seq.push(current_batch_seq);
      }

      article.innerHTML = '';
      
      global_makes.forEach(make => article.appendChild(make));

      const page_counter_make = document.createElement('RT·counter·make');
      page_counter_make.setAttribute('counter' ,'RT_page_number');
      page_counter_make.setAttribute('style' ,'NaturalNumber');
      page_counter_make.setAttribute('on-first-step' ,'1');
      page_counter_make.setAttribute('mode' ,'milestone');
      article.appendChild(page_counter_make);

      let p = 0;
      while(p < page_seq.length){
        const batch = page_seq[p];
        const page_el = document.createElement('RT·page');
        
        page_el.style.minHeight = page_height_limit + 'px';
        page_el.style.position = 'relative';
        page_el.style.paddingBottom = '5rem';
        page_el.style.boxSizing = 'border-box';
        
        batch.forEach(item => page_el.appendChild(item));

        const page_step = document.createElement('RT·counter·step');
        page_step.setAttribute('counter' ,'RT_page_number');
        page_el.appendChild(page_step);

        const snapshot_name = `page_snap_${p + 1}`;
        const page_snap = document.createElement('RT·counter·snapshot');
        page_snap.setAttribute('counter' ,'RT_page_number');
        page_snap.setAttribute('snapshot' ,snapshot_name);
        page_el.appendChild(page_snap);

        const page_footer = document.createElement('div');
        page_footer.className = 'RT·page-footer';
        page_footer.style.position = 'absolute';
        page_footer.style.bottom = '1.5rem';
        page_footer.style.left = '0';
        page_footer.style.width = '100%';
        page_footer.style.textAlign = 'center';

        const page_read = document.createElement('RT·counter·read');
        page_read.setAttribute('snapshot' ,snapshot_name);
        page_footer.appendChild(page_read);
        page_el.appendChild(page_footer);

        article.appendChild(page_el);
        p++;
      }
    }

    Array.from(article_seq).forEach(article => paginate_article(article));

    Array.from(article_seq).forEach(article => {
      const rendered_pages = article.querySelectorAll('RT·page, rt·page');
      
      Array.from(rendered_pages).forEach(page => {
        const all_page_nodes = Array.from(page.querySelectorAll('*'));
        const markers = all_page_nodes.filter(node => (node.tagName || '').toLowerCase() === 'rt·fn-marker');
        
        if(markers.length === 0) return;

        const fn_container = document.createElement('div');
        fn_container.className = 'RT·footnote-container';
        fn_container.style.borderTop = '1px solid var(--RT·border-default)';
        fn_container.style.marginTop = '2rem';
        fn_container.style.paddingTop = '1rem';
        fn_container.style.fontSize = '0.9em';

        markers.forEach(marker => {
          const id = marker.getAttribute('data-id');
          const html = footnote_registry[id];

          const sup = document.createElement('sup');
          sup.innerHTML = `<a href="#fn-${id}" id="fn-ref-${id}" style="color: var(--RT·brand-link); text-decoration: none;">${id}</a>`;
          
          if(marker.parentNode){
            marker.parentNode.replaceChild(sup ,marker);
          }

          const fn_line = document.createElement('div');
          fn_line.id = `fn-${id}`;
          fn_line.style.marginBottom = '0.5rem';
          fn_line.innerHTML = `<span style="padding-right: 0.5em; font-weight: 600;">${id}.</span>${html}`;
          fn_container.appendChild(fn_line);
        });

        page.appendChild(fn_container);
      });
    });

    if(measure_container && measure_container.parentNode){
      measure_container.remove();
      measure_container = null;
    }
  }

  function paginate_1(){
    if(debug.log) debug.log('paginate_1' ,'Adjusting final page heights after component injections');

    const rendered_pages = document.querySelectorAll('RT·page, rt·page');
    Array.from(rendered_pages).forEach(page => {
      const actual_height = page.scrollHeight;
      if(actual_height > page_height_limit){
        page.style.minHeight = actual_height + 'px';
      }
    });
  }

  window.RT.paginate_0 = paginate_0;
  window.RT.paginate_1 = paginate_1;

})();
