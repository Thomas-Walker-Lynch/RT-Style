/*
  Layout/paginate.js
  Processes <RT·article> tags and paginates their contents.
  Handles inline footnotes, element splitting, and page height limits.
*/

(function(){

  if(!window.RT){
    console.error("RT not defined - was RT-Style_make run?");
    return;
  }

  const RT = window.RT;
  const debug = RT.Debug || { log: function(){} ,error: function(){} };
  const page_conf = (RT.config && RT.config.page) ? RT.config.page : {};
  const page_height_limit = page_conf.height_limit || 1000;

  let measureContainer = null;

  // =========================================================
  // 1. DOM Measurement Utilities
  // =========================================================
  function getElHeight(el){
    const wasInDOM = el.parentNode !== null;
    if(!wasInDOM) document.body.appendChild(el);
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const margin = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    if(!wasInDOM) el.remove();
    return (rect.height || 0) + (margin || 0);
  }

  function getMeasureContainer(){
    if(measureContainer && measureContainer.parentNode) return measureContainer;
    const article = document.querySelector('RT·article');
    if(!article){
      const temp = document.createElement('div');
      temp.style.visibility = 'hidden';
      temp.style.position = 'absolute';
      temp.style.width = '100%'; 
      document.body.appendChild(temp);
      measureContainer = temp;
      return temp;
    }
    const container = document.createElement('div');
    const articleStyle = window.getComputedStyle(article);
    container.style.visibility = 'hidden';
    container.style.position = 'absolute';
    container.style.width = articleStyle.width;
    container.style.fontFamily = articleStyle.fontFamily;
    container.style.fontSize = articleStyle.fontSize;
    container.style.lineHeight = articleStyle.lineHeight;
    container.style.fontWeight = articleStyle.fontWeight;
    document.body.appendChild(container);
    measureContainer = container;
    return container;
  }

  function measureFragment(frag){
    const container = getMeasureContainer();
    container.appendChild(frag);
    const h = getElHeight(frag);
    container.removeChild(frag);
    return h;
  }

  // =========================================================
  // Splitting Logic
  // =========================================================
  function isSplittable(el){

    // Component Dictionary Execution
    const componentId = el.getAttribute('data-rt-component');
    if (componentId && window.RT.Component && window.RT.Component[componentId] && window.RT.Component[componentId].split) {
      return (remaining) => window.RT.Component[componentId].split(el, remaining, measureFragment);
    }

    // Custom RT splitable attribute delegation
    if (el.hasAttribute('splitable') && window.RT.Splitter && window.RT.Splitter[el.tagName.toLowerCase()]) {
      return (remaining) => window.RT.Splitter[el.tagName.toLowerCase()](el, remaining, measureFragment, isSplittable);
    }

    // Native HTML Fallbacks

    const tag = el.tagName;
    if(tag === 'UL' || tag === 'OL'){
      const items = Array.from(el.children).filter(c => c.tagName === 'LI');
      if(items.length === 0) return null;

      const itemHeights = items.map(li => getElHeight(li));
      const emptyClone = el.cloneNode(false);
      const overhead = getElHeight(emptyClone);

      el._splitInfo = { type: 'list' ,itemHeights ,overhead ,offset: 0 };
      return makeListSplitter(el ,el._splitInfo);
    }

    if(tag === 'TABLE'){
      const thead = el.querySelector('thead');
      const tbody = el.querySelector('tbody');
      const rows = tbody ? Array.from(tbody.rows) : Array.from(el.rows);
      if(rows.length === 0) return null;

      const theadHeight = thead ? getElHeight(thead) : 0;
      const rowHeights = rows.map(row => getElHeight(row));

      const emptyClone = el.cloneNode(false);
      if(thead) emptyClone.appendChild(thead.cloneNode(true));
      emptyClone.appendChild(document.createElement('tbody'));
      const overhead = getElHeight(emptyClone) - theadHeight;

      el._splitInfo = { type: 'table' ,rowHeights ,overhead ,theadHeight ,offset: 0 };
      return makeTableSplitter(el ,el._splitInfo);
    }
    return null; 
  }

  function makeListSplitter(el ,info){
    return (remaining) => {
      const children = Array.from(el.children).filter(c => c.tagName === 'LI');
      const start = info.offset;

      let bestCount = 0;
      let bestHeight = 0;
      const tempList = el.cloneNode(false);
      
      for(let i = 0; i < children.length; i++){
        const itemClone = children[i].cloneNode(true);
        tempList.appendChild(itemClone);
        const fragHeight = measureFragment(tempList);
        if(fragHeight <= remaining){
          bestCount = i + 1;
          bestHeight = fragHeight;
        } else {
          tempList.removeChild(itemClone);
          break;
        }
      }

      if(bestCount === 0) return { first: null ,rest: el ,firstHeight: 0 };

      const first = el.cloneNode(false);
      for(let i = 0; i < bestCount; i++){
        first.appendChild(children[i].cloneNode(true));
      }

      let rest = null;
      if(bestCount < children.length){
        rest = el.cloneNode(false);
        for(let i = bestCount; i < children.length; i++){
          rest.appendChild(children[i].cloneNode(true));
        }

        if(el.tagName === 'OL'){
          const currentStart = parseInt(el.getAttribute('start') ,10) || 1;
          rest.setAttribute('start' ,currentStart + bestCount);
        }

        rest._splitInfo = {
          type: 'list'
          ,itemHeights: info.itemHeights
          ,overhead: info.overhead
          ,offset: start + bestCount
        };
      }

      return { first ,rest ,firstHeight: bestHeight };
    };
  }

  function makeTableSplitter(el ,info){
    const thead = el.querySelector('thead');
    const createShell = () => {
      const shell = el.cloneNode(false);
      if(thead) shell.appendChild(thead.cloneNode(true));
      const newTbody = document.createElement('tbody');
      shell.appendChild(newTbody);
      return shell;
    };

    return (remaining) => {
      const tbody = el.querySelector('tbody');
      const rows = tbody ? Array.from(tbody.rows) : Array.from(el.rows);
      const start = info.offset;

      let bestCount = 0;
      let bestHeight = 0;
      const tempTable = createShell();
      const tempBody = tempTable.querySelector('tbody');
      
      for(let i = 0; i < rows.length; i++){
        tempBody.appendChild(rows[i].cloneNode(true));
        const h = measureFragment(tempTable);
        if(h <= remaining){
          bestCount = i + 1;
          bestHeight = h;
        } else {
          tempBody.removeChild(tempBody.lastChild);
          break;
        }
      }

      if(bestCount === 0) return { first: null ,rest: el ,firstHeight: 0 };

      const first = createShell();
      const firstBody = first.querySelector('tbody');
      for(let i = 0; i < bestCount; i++){
        firstBody.appendChild(rows[i].cloneNode(true));
      }

      let rest = null;
      if(bestCount < rows.length){
        rest = createShell();
        const restBody = rest.querySelector('tbody');
        for(let i = bestCount; i < rows.length; i++){
          restBody.appendChild(rows[i].cloneNode(true));
        }

        rest._splitInfo = {
          type: 'table'
          ,rowHeights: info.rowHeights
          ,overhead: info.overhead
          ,theadHeight: info.theadHeight
          ,offset: start + bestCount
        };
      }

      return { first ,rest ,firstHeight: bestHeight };
    };
  }


  // =========================================================
  // RT ELEMENT SPLITTERS
  // =========================================================
  window.RT.Splitter = window.RT.Splitter || {};

  window.RT.Splitter['rt·counter·step'] = function(el, remaining, measureFn, isSplittableFn) {
    const children = Array.from(el.children);
    let bestCount = 0;
    let bestHeight = 0;
    const tempContainer = el.cloneNode(false);
    let splitChildResult = null;
    let forcedBreak = false;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      // Break on explicit splitting break
      if (child.tagName && child.tagName.toLowerCase() === 'rt·page-break') {
        forcedBreak = true;
        bestCount = i;
        break;
      }

      tempContainer.appendChild(child.cloneNode(true));
      const fragHeight = measureFn(tempContainer);

      if (fragHeight <= remaining) {
        bestCount = i + 1;
        bestHeight = fragHeight;
      } else {
        tempContainer.removeChild(tempContainer.lastChild);
        const childSplitter = isSplittableFn(child);
        if (childSplitter) {
          const childSplit = childSplitter(remaining - bestHeight);
          if (childSplit && childSplit.first) {
            splitChildResult = childSplit;
            bestHeight += childSplit.firstHeight;
            bestCount = i;
          }
        }
        break;
      }
    }

    if (bestCount === 0 && !splitChildResult && !forcedBreak) {
      return { first: null, rest: el, firstHeight: 0 };
    }

    const first = el.cloneNode(false);
    first.setAttribute('continued', 'true');
    const splitId = 'split_' + Math.random().toString(36).substr(2, 9);
    first.setAttribute('split-id', splitId);
    
    for (let i = 0; i < bestCount; i++) {
      first.appendChild(children[i].cloneNode(true));
    }
    if (splitChildResult) first.appendChild(splitChildResult.first);

    let rest = null;
    if (bestCount < children.length || splitChildResult || forcedBreak) {
      rest = el.cloneNode(false);
      rest.setAttribute('continuation', 'true');
      if (splitChildResult && splitChildResult.rest) rest.appendChild(splitChildResult.rest);

      const startIndex = forcedBreak ? bestCount + 1 : (splitChildResult ? bestCount + 1 : bestCount);
      for (let i = startIndex; i < children.length; i++) {
        rest.appendChild(children[i].cloneNode(true));
      }

      const makeTag = document.createElement('rt·counter·make');
      makeTag.setAttribute('counter', el.getAttribute('counter'));
      makeTag.setAttribute('continues', splitId); 

      rest = [makeTag, rest];
    }

    return { first, rest, firstHeight: bestHeight };
  };

  // =========================================================
  // PAGINATE 0: CHUNKING & INJECTING STRUCTURE
  // =========================================================
  function paginate_0(){
    if(debug.log) debug.log('paginate_0' ,'Running initial document chunking');

    const article_seq = document.querySelectorAll('RT·article');
    if(article_seq.length === 0){
      debug.error('pagination' ,'No <RT·article> elements found. Pagination aborted.');
      return;
    }

    const footnote_registry = {};
    let footnote_counter = 1;

    // Strip and tag footnotes
    Array.from(article_seq).forEach(article => {
      const all_nodes = Array.from(article.querySelectorAll('*'));
      const raw_footnotes = all_nodes.filter(node => node.tagName.toLowerCase() === 'rt·footnote');
      
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

    function paginateArticle(article){
      const raw_element_seq = Array.from(article.children).filter(el =>
        !['SCRIPT' ,'STYLE' ,'RT·PAGE'].includes((el.tagName || '').toUpperCase())
      );

      if(raw_element_seq.length === 0) return;

      const page_seq = [];
      let current_batch_seq = [];
      let current_h = 0;
      let i = 0;

      while(i < raw_element_seq.length){
        const el = raw_element_seq[i];
        const splitter = isSplittable(el);

        if(splitter){
          const remaining = page_height_limit - current_h;
          const { first ,rest ,firstHeight } = splitter(remaining);

          if(first){
            current_batch_seq.push(first);
            current_h += firstHeight;

            if(rest){
              if (Array.isArray(rest)) {
                raw_element_seq.splice(i, 1, ...rest);
              } else {
                raw_element_seq.splice(i, 1, rest);
              }
              // Force page boundary push because element spanned boundary
              page_seq.push(current_batch_seq);
              current_batch_seq = [];
              current_h = 0;
              continue; 
            } else {
              raw_element_seq.splice(i, 1);
              continue; 
            }
          } else {
            if(current_batch_seq.length === 0){
              const frame = document.createElement('RT·scroll-frame');
              frame.style.display = 'block';
              frame.style.overflowY = 'auto';
              frame.style.maxHeight = page_height_limit + 'px';
              frame.appendChild(el);
              current_batch_seq.push(frame);
              i++; 
            } else {
              // Element is split but first chunk fails to fit. Evict any stranded headings.
              let backtrack_seq = [];
              let backtrack_h = 0;
              
              while(current_batch_seq.length > 0){
                const last = current_batch_seq[current_batch_seq.length - 1];
                if(!/^H[1-6]$/i.test(last.tagName)) break;
                const popped = current_batch_seq.pop();
                backtrack_seq.unshift(popped);
                backtrack_h += getElHeight(popped);
              }

              if(current_batch_seq.length > 0){
                page_seq.push(current_batch_seq);
                current_batch_seq = backtrack_seq;
                current_h = backtrack_h;
                // Leave 'i' alone to re-evaluate 'el' against the fresh page sequence
              } else {
                // If only headings existed, accept the massive frame inline to avoid loops
                const frame = document.createElement('RT·scroll-frame');
                frame.style.display = 'block';
                frame.style.overflowY = 'auto';
                frame.style.maxHeight = page_height_limit + 'px';
                frame.appendChild(el);
                
                current_batch_seq = backtrack_seq;
                current_h = backtrack_h;
                
                current_batch_seq.push(frame);
                i++;
              }
            }
          }
          continue;
        }

        const h = getElHeight(el);
        const is_RT_page_break = el.tagName && el.tagName.toLowerCase() === 'rt·page-break';
        const is_RT_page_break_primitive = el.tagName && el.tagName.toLowerCase() === 'rt·page-break-primitive';

        // Explicit Page Break Logic - Execute immediately without backward traversal
        if(is_RT_page_break || is_RT_page_break_primitive){
          if(current_batch_seq.length > 0){
            page_seq.push(current_batch_seq);
            current_batch_seq = [];
            current_h = 0;
          }
          i++;
          continue; 
        }

        // Standard Dimension Overflow Logic - Check for orphaned headers
        if( current_h + h > page_height_limit && current_batch_seq.length > 0 ){
          let backtrack_seq = [];
          let backtrack_h = 0;
          
          while(current_batch_seq.length > 0){
            const last = current_batch_seq[current_batch_seq.length - 1];
            if(!/^H[1-6]$/i.test(last.tagName)) break;
            const popped = current_batch_seq.pop();
            backtrack_seq.unshift(popped);
            backtrack_h += getElHeight(popped);
          }

          if(current_batch_seq.length > 0){
            page_seq.push(current_batch_seq);
            current_batch_seq = backtrack_seq;
            current_h = backtrack_h;
          } else {
            // Document structure resolved entirely to sequential headings that breached bounds.
            current_batch_seq = backtrack_seq;
            current_h = backtrack_h;
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
      
      // Inject global page counter initialization
      const page_counter_make = document.createElement('rt·counter·make');
      page_counter_make.setAttribute('counter' ,'RT_page_number');
      page_counter_make.setAttribute('style' ,'NaturalNumber');
      page_counter_make.setAttribute('on-first-step' ,'1');
      page_counter_make.setAttribute('mode' ,'milestone');
      article.appendChild(page_counter_make);

      let p = 0;
      while(p < page_seq.length){
        const batch = page_seq[p];
        const page_el = document.createElement('RT·page');
        
        batch.forEach(item => page_el.appendChild(item));

        // Inject step and snapshot tags into the page
        const page_step = document.createElement('rt·counter·step');
        page_step.setAttribute('counter' ,'RT_page_number');
        page_el.appendChild(page_step);

        const snapshot_name = `page_snap_${p + 1}`;
        const page_snap = document.createElement('rt·counter·snapshot');
        page_snap.setAttribute('counter' ,'RT_page_number');
        page_snap.setAttribute('snapshot' ,snapshot_name);
        page_el.appendChild(page_snap);

        // Optional footer text injection reading the counter snapshot
        const page_footer = document.createElement('div');
        page_footer.className = 'RT·page-footer';
        const page_read = document.createElement('rt·counter·read');
        page_read.setAttribute('snapshot' ,snapshot_name);
        page_footer.appendChild(page_read);
        page_el.appendChild(page_footer);

        article.appendChild(page_el);
        p++;
      }
    }

    Array.from(article_seq).forEach(article => paginateArticle(article));

    // Resolve footnotes inside the generated pages
    Array.from(article_seq).forEach(article => {
      const rendered_pages = article.querySelectorAll('RT·page');
      
      Array.from(rendered_pages).forEach(page => {
        const all_page_nodes = Array.from(page.querySelectorAll('*'));
        const markers = all_page_nodes.filter(node => node.tagName.toLowerCase() === 'rt·fn-marker');
        
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

    if(measureContainer && measureContainer.parentNode){
      measureContainer.remove();
      measureContainer = null;
    }
  }

  // =========================================================
  // PAGINATE 1: ABSORB DIMENSIONAL DELTA
  // =========================================================
  function paginate_1(){
    if(debug.log) debug.log('paginate_1' ,'Adjusting final page heights after component injections');

    const rendered_pages = document.querySelectorAll('RT·page');
    Array.from(rendered_pages).forEach(page => {
      const actual_height = page.scrollHeight;
      if(actual_height > page_height_limit){
        page.style.minHeight = actual_height + 'px';
      }
    });
  }

  //----------------------------------------
  // Registration upon load
  //

  window.RT.paginate_0 = paginate_0;
  window.RT.paginate_1 = paginate_1;


})();
