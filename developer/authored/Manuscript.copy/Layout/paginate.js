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

  /* Pages carry padding, so the width available to content inside a page is
     narrower than the article. Measuring at the article's width lets text wrap
     less than it will when rendered, which reports every height short and makes
     the paginator believe content fits when it does not. Pages then run long,
     with no indication that anything went wrong.

     One value, read by both the paginator and whatever applies the geometry. */
  const page_padding = page_conf.padding || '3rem';

  /* ---------------------------------------------------------------
     Pagination tracing.

     Splitting is the most intricate part of the engine and the hardest to
     reason about after the fact ,because the decisions are made against
     measurements that no longer exist by the time the output is inspected.
     This narrates what the paginator saw and what it decided.

       RT.Debug.enable('paginate')    decisions ,one line per element
       RT.Debug.enable('paginate_v')  verbose: per child measurement inside
                                      a split ,which is noisy but is where
                                      the difficult faults hide

     Both are inert when their token is off ,beyond a set membership test.
  --------------------------------------------------------------- */

  let trace_depth = 0;

  function tracing(){ return window.RT.Debug.active_tokens.has('paginate'); }
  function tracing_verbose(){ return window.RT.Debug.active_tokens.has('paginate_v'); }

  function trace(msg){
    if(!tracing()) return;
    window.RT.Debug.log('paginate' ,'  '.repeat(trace_depth) + msg);
  }

  function trace_v(msg){
    if(!tracing_verbose()) return;
    window.RT.Debug.log('paginate_v' ,'  '.repeat(trace_depth) + msg);
  }

  // A short human readable handle for an element ,so trace lines identify
  // which node is being discussed without dumping markup.
  function el_id(el){
    if(!el) return '(null)';
    if(el.nodeType !== Node.ELEMENT_NODE) return '#text';
    const tag = (el.tagName || '?').toLowerCase();
    const bits = [];
    const counter = el.getAttribute && el.getAttribute('counter');
    if(counter) bits.push('counter=' + counter);
    if(el.className && typeof el.className === 'string' && el.className.trim()){
      bits.push('.' + el.className.trim().split(/\s+/)[0]);
    }
    if(el.getAttribute && el.getAttribute('continued') === 'true') bits.push('CONTINUED');
    if(el.getAttribute && el.getAttribute('continuation') === 'true') bits.push('CONTINUATION');
    // first few words of text ,to make sections recognizable in the log
    const txt = (el.textContent || '').trim().replace(/\s+/g ,' ').slice(0 ,32);
    if(txt) bits.push('"' + txt + (txt.length >= 32 ? '…' : '') + '"');
    return tag + (bits.length ? ' [' + bits.join(' ') + ']' : '');
  }

  /* ---------------------------------------------------------------
     What counts as a heading ,and what counts as nothing.

     A heading is not content. It announces the content beneath it ,and a page
     that ends on one leaves the announcement on one leaf and the thing
     announced on the next. The paginator therefore has to recognize a heading
     when it sees one.

     Tag name alone no longer answers this. Before sections were scoped and
     counted ,a heading was an <h1>–<h6> and the test could be a regular
     expression over the tag. A section title is now a composed division
     carrying counter reads ,so that test matches nothing and the widow
     control it guards has been silently inert since the change. Section titles
     are marked at construction instead ,and the mark is what is read here:
     the paginator does not need to know how a title is built.

     'Ghost' names a node that occupies no space — a snapshot ,a make tag ,a
     name tag ,a run of whitespace. They are not content ,so a fragment ending
     in a heading followed by ghosts still ends in a heading. Deciding this by
     tag rather than by measurement keeps it free.
  --------------------------------------------------------------- */

  function is_heading(el){
    if(!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if( /^H[1-6]$/i.test(el.tagName || '') ) return true;
    return el.hasAttribute && el.hasAttribute('data-RT-heading');
  }

  const Set_ghost_tag = new Set([
    'rt·counter·snapshot' ,'rt·counter·make' ,'rt·name' ,'rt·note·write'
  ]);

  function is_ghost(node){
    if(!node) return true;
    if(node.nodeType === Node.TEXT_NODE) return !node.textContent.trim();
    if(node.nodeType !== Node.ELEMENT_NODE) return true;
    return Set_ghost_tag.has((node.tagName || '').toLowerCase());
  }

  let measure_container = null;

  // 1. DOM Measurement Utilities
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
    const article = document.querySelector('RT·article');
    if(!article){
      const temp = document.createElement('div');
      temp.style.visibility = 'hidden';
      temp.style.position = 'absolute';
      temp.style.width = '100%'; 
      document.body.appendChild(temp);
      measure_container = temp;
      return temp;
    }
    /* Measure at the width content will actually occupy: a page's content box,
       not the article. The probe carries the page padding so the arithmetic is
       done by the browser in whatever units the padding was written in. */
    /* The probe stays in flow. An absolutely positioned box resolves a
       percentage width against its nearest positioned ancestor ,which the
       article is not ,so it would measure against the viewport instead — wider
       than the article ,not narrower ,and every height would come back shorter
       still. In flow ,100% is the article's content width ,which is what is
       wanted. It is removed before anything else runs. */
    const probe = document.createElement('div');
    probe.style.visibility = 'hidden';
    probe.style.width = '100%';
    probe.style.height = '0';
    probe.style.overflow = 'hidden';
    probe.style.boxSizing = 'border-box';
    probe.style.padding = page_padding;
    article.appendChild(probe);
    const probe_style = window.getComputedStyle(probe);
    const content_width = probe.clientWidth
                        - parseFloat(probe_style.paddingLeft || 0)
                        - parseFloat(probe_style.paddingRight || 0);
    article.removeChild(probe);

    const container = document.createElement('div');
    const article_style = window.getComputedStyle(article);
    container.style.visibility = 'hidden';
    container.style.position = 'absolute';
    container.style.width = (content_width > 0 ? content_width + 'px' : article_style.width);

    RT.Debug.log('paginate' ,'measuring at page content width '
      + (content_width > 0 ? content_width + 'px' : article_style.width)
      + ' (article ' + article_style.width + ' ,page padding ' + page_padding + ')');
    container.style.fontFamily = article_style.fontFamily;
    container.style.fontSize = article_style.fontSize;
    container.style.lineHeight = article_style.lineHeight;
    container.style.fontWeight = article_style.fontWeight;
    container.style.contain = 'layout paint style';
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

  // Splitting Logic
  function is_splittable(el){
    if(!el || el.nodeType !== Node.ELEMENT_NODE) return null;

    /* Component registry: capability keyed by instance rather than by tag ,for
       elements whose tag says nothing useful about how they divide. A rendered
       grid is a plain division ,and registering a splitter for every division
       would be plainly wrong.

       The instance gate applies here as it does everywhere else ,so splitable
       is required alongside the registration. Capability without permission is
       not permission. */
    const component_id = el.getAttribute('data-rt-component');
    if(component_id && el.hasAttribute('splitable')
       && window.RT.Component && window.RT.Component[component_id]
       && window.RT.Component[component_id].split){
      return (remaining) => window.RT.Component[component_id].split(el ,remaining ,measure_fragment);
    }

    if(el.hasAttribute('splitable') && window.RT.Splitter && window.RT.Splitter[(el.tagName || '').toLowerCase()]){
      return (remaining) => window.RT.Splitter[(el.tagName || '').toLowerCase()](el ,remaining ,measure_fragment ,is_splittable);
    }

    /* An element may claim splitable and have no splitter registered for its
       tag. Capability is what actually decides ,so the element is atomic and
       the claim is inert — but it is almost always a mistake ,and a silent one:
       the element is then unbreakable ,and if it exceeds a page it falls to the
       overflow path rather than being cut. Report it once per tag. */
    if(el.hasAttribute('splitable')){
      const tag_l = (el.tagName || '').toLowerCase();
      if(!is_splittable.warned) is_splittable.warned = new Set();
      if(!is_splittable.warned.has(tag_l)){
        is_splittable.warned.add(tag_l);
        window.RT.Debug.warn('paginate'
          ,"<" + tag_l + "> claims splitable but no splitter is registered for it. "
          + "Treating as atomic. Register RT.Splitter['" + tag_l + "'] or drop the attribute.");
      }
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
    return (remaining) => {
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

      if(best_count === 0) return { first: null ,rest: el ,firstHeight: 0 };

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

    return (remaining) => {
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

      if(best_count === 0) return { first: null ,rest: el ,firstHeight: 0 };

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

  // RT ELEMENT SPLITTERS
  window.RT.Splitter = window.RT.Splitter || {};

  window.RT.Splitter['rt·counter·step'] = function(el ,remaining ,measure_fn ,is_splittable_fn){
    trace_v('split ' + el_id(el) + ' into ' + remaining + 'px');
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
        trace_v('  child ' + i + ' ' + el_id(child) + ': cumulative ' + frag_height
                + 'px <= ' + remaining + 'px ,keep');
        best_count = i + 1;
        best_height = frag_height;
      }else{
        trace_v('  child ' + i + ' ' + el_id(child) + ': cumulative ' + frag_height
                + 'px > ' + remaining + 'px ,cut here');
        temp_container.removeChild(temp_container.lastChild);
        const child_splitter = child.nodeType === Node.ELEMENT_NODE ? is_splittable_fn(child) : null;
        if(child_splitter){
          trace_v('    child is splittable ,recursing with ' + (remaining - best_height) + 'px');
          trace_depth++;
          const child_split = child_splitter(remaining - best_height);
          trace_depth--;
          if(child_split && child_split.first){
            split_child_result = child_split;
            best_height += child_split.firstHeight;
            best_count = i;
          }
        }
        break;
      }
    }

    if(best_height === 0 && !split_child_result && !forced_break){
      /* No progress. Either nothing fit at all ,or everything that fit has zero
         height — make tags ,snapshots ,whitespace — which is not progress.

         Abandoning here (returning no first fragment) hands the whole subtree
         back to the caller ,whose overflow path places all of it on one grown
         page ,dragging every following subsection along: that is how the tail
         of a chapter arrives as a single monster page. Emitting the zero height
         children as a fragment is no better ,since it produces a page holding
         nothing but its own page number.

         Take one more child instead ,whatever its size. The page grows just
         enough to hold it and everything after it flows on normally. Growth is
         meant to be local ,and this applies it at the smallest scope that needs
         it rather than the largest.

         Testing height rather than count matters: a fragment may hold several
         children and still be empty ,which is exactly the case that produced a
         blank page between two full ones.
      */
      if(best_count < children.length){
        temp_container.appendChild(children[best_count].cloneNode(true));
        best_height = measure_fn(temp_container);
        best_count++;
        trace_v('  -> no progress; taking ' + el_id(children[best_count - 1])
                + ' whole at ' + best_height + 'px ,remainder flows on');
      }else{
        return { first: null ,rest: el ,firstHeight: 0 };
      }
    }

    /* Widow control.

       A section fragment must not end on its own title ,nor on the title of a
       subsection it has only just opened. The cut is moved back above the
       heading ,which travels to the next page with the text it introduces.

       Only the tail is examined ,and only when this scope cut its own child
       list. Where a child was itself split ,that child's own splitter has
       already applied this rule to its tail ,and the fragment ends inside the
       child rather than on a heading.

       If nothing but the heading fitted ,no fragment is emitted at all: the
       whole scope moves on. The caller reads a null first as 'cannot be broken
       here' and either closes the page and retries with a full page ,or ,on a
       page that is already empty ,places the scope whole and grows the page.
       Both terminate ,and neither can return here with the same room twice.
    */
    if(!split_child_result && best_count > 0){
      let tail = best_count;
      while( tail > 0 && is_ghost(children[tail - 1]) ) tail--;

      if( tail > 0 && is_heading(children[tail - 1]) ){
        trace_v('  -> fragment ends on ' + el_id(children[tail - 1])
                + ' ,moving the cut above it');
        best_count = tail - 1;

        const kept = el.cloneNode(false);
        for(let i = 0; i < best_count; i++) kept.appendChild(children[i].cloneNode(true));
        best_height = best_count > 0 ? measure_fn(kept) : 0;

        if( !(best_height > 0) ){
          trace_v('  -> nothing but the heading fits; the whole scope moves on');
          return { first: null ,rest: el ,firstHeight: 0 };
        }
      }
    }

    /* Decide whether a remainder exists BEFORE marking the fragment.

       A fragment marked 'continued' is soft closed: the counter walk suppresses
       its exit and parks the machine under the split id, to be resumed by the
       matching continuation fragment. If no remainder is produced there is no
       continuation fragment ,so the scope would be suspended permanently ,its
       exit never running. The next sibling step would then enter from status
       'preamble' rather than 'between' ,indenting instead of incrementing.

       This path is reached whenever a splitable element fits entirely ,which is
       the common case: the caller invokes the splitter for every splitable
       element without first testing whether it overflows.
    */
    const has_rest = (best_count < children.length) || !!split_child_result || forced_break;

    trace_v('  -> ' + best_count + ' of ' + children.length + ' children fit'
            + (split_child_result ? ' ,plus a split child' : '')
            + (forced_break ? ' ,forced break present' : '')
            + ' ,has_rest=' + has_rest
            + (has_rest ? ' (soft close ,scope continues)' : ' (no soft close ,scope intact)'));

    const first = el.cloneNode(false);
    const split_id = 'split_' + Math.random().toString(36).substr(2 ,9);

    if(has_rest){
      first.setAttribute('continued' ,'true');
      first.setAttribute('split-id' ,split_id);
    }
    
    for(let i = 0; i < best_count; i++){
      first.appendChild(children[i].cloneNode(true));
    }
    if(split_child_result) first.appendChild(split_child_result.first);

    let rest = null;
    if(has_rest){
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

  // PAGINATE 0: CHUNKING & INJECTING STRUCTURE
  function paginate_0(){
    if(debug.log) debug.log('paginate_0' ,'Running initial document chunking');

    const article_seq = document.querySelectorAll('RT·article, RT·memo');
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
      /* An <RT·page> written by the author is kept ,not filtered away.

         Some leaves are composed rather than flowed. A title page ,a
         dedication ,a plate: the author has decided what is on it and the
         paginator has no business measuring it or adding to it. Dropping such
         pages ,which is what excluding them here used to do ,silently lost
         whatever the author had put on them.

         Written with no-number the leaf is neither numbered nor counted ,so a
         title page does not consume the number that belongs to the first page
         of text. Written plainly it takes its number in sequence like any
         other. */
      const raw_element_seq = Array.from(article.children).filter(el =>
        !['SCRIPT' ,'STYLE' ,'RT·COUNTER·MAKE'].includes((el.tagName || '').toUpperCase()) 
      );

      const global_makes = Array.from(article.children).filter(el => (el.tagName || '').toUpperCase() === 'RT·COUNTER·MAKE');

      if(raw_element_seq.length === 0) return;

      const page_seq = [];
      let current_batch_seq = [];
      let current_h = 0;
      let i = 0;

      trace('=== paginate ' + el_id(article) + ' : ' + raw_element_seq.length
            + ' top level elements ,page limit ' + page_height_limit + 'px ===');

      while(i < raw_element_seq.length){
        const el = raw_element_seq[i];

        // A composed leaf. It closes whatever page is open and stands as one.
        if( (el.tagName || '').toLowerCase() === 'rt·page' ){
          trace(el_id(el) + ' -> AUTHORED PAGE ,carried through whole'
                + (el.hasAttribute('no-number') ? ' ,unnumbered' : ''));
          if(current_h > 0){
            page_seq.push(current_batch_seq);
            current_batch_seq = [];
            current_h = 0;
          }
          page_seq.push(el);
          i++;
          continue;
        }

        const splitter = is_splittable(el);

        if(splitter){
          const remaining = page_height_limit - current_h;

          /* A break belongs to this element only if it falls strictly inside it.

             When the element fits in the space remaining ,any break falls after
             it — in the gap between this scope and the next sibling — and that
             gap belongs to the parent ,not to this element. Neither sibling is
             cut ,so neither should be soft closed; the counter walk simply
             enters and exits each intact scope in turn ,across the page
             boundary ,and the numbering follows.

             Splitting here regardless is what produced sibling top level
             sections numbered 1 then 1.1: the first was marked continued ,its
             exit suppressed ,and with no remainder there was no continuation
             fragment to resume it. The scope stayed open ,so the next sibling
             entered from 'preamble' and indented instead of incrementing.

             An interior forced break still requires splitting even when the
             element fits ,since the break is genuinely inside it.
          */
          const el_h = get_el_height(el);
          const has_interior_break = !!el.querySelector('RT·page-break, RT·page-break-primitive');

          if(el_h <= remaining && !has_interior_break){
            trace(el_id(el) + ': ' + el_h + 'px fits in ' + remaining
                  + 'px remaining -> PLACE WHOLE (break falls after it ,not inside)');
            current_batch_seq.push(el);
            current_h += el_h;
            i++;
            continue;
          }

          trace(el_id(el) + ': ' + el_h + 'px vs ' + remaining + 'px remaining'
                + (has_interior_break ? ' ,has interior page break' : '')
                + ' -> SPLIT');
          trace_depth++;
          const { first ,rest ,firstHeight } = splitter(remaining);
          trace_depth--;

          if(first){
            trace('  -> first fragment ' + firstHeight + 'px'
                  + (rest ? ' ,remainder continues on next page' : ' ,NO remainder'));
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
            trace('  -> NOTHING FITS. Element cannot be broken at this position.');
            if(current_h === 0){
              /* Elastic pages. The break has migrated all the way to the start
                 of the page ,so there is nothing left to relocate. Place the
                 element whole and let the page grow around it.

                 Growth is local and terminal: no content moves ,so no page
                 number changes ,so no cross reference changes length ,so
                 nothing further is perturbed. Clipping into a scroll frame
                 instead ,as this once did ,both hid content and — because the
                 frame's height was never added to current_h — left the page
                 looking empty ,so the next forced page break was discarded and
                 the following chapter ran on without its break. */
              trace('  -> page is empty; PLACE WHOLE and grow page to ' + el_h + 'px');
              window.RT.Debug.warn('paginate'
                ,'oversized: ' + el_id(el) + ' is ' + el_h + 'px against a '
                + page_height_limit + 'px limit and cannot be split. Growing the page.');
              current_batch_seq.push(el);
              current_h += el_h;
              i++; 
            }else{
              let backtrack_seq = [];
              let backtrack_h = 0;
              
              while(current_batch_seq.length > 0){
                const last = current_batch_seq[current_batch_seq.length - 1];
                if(!is_heading(last)) break;
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

                // Same elastic page rule as above: nothing left to relocate ,so
                // place whole and grow. current_h must include it ,or a later
                // forced break will read this page as empty and be discarded.
                trace('  -> cannot emit a page here; PLACE WHOLE and grow page by ' + el_h + 'px');
                window.RT.Debug.warn('paginate'
                  ,'oversized: ' + el_id(el) + ' is ' + el_h + 'px against a '
                  + page_height_limit + 'px limit and cannot be split. Growing the page.');
                current_batch_seq.push(el);
                current_h += el_h;
                i++;
              }
            }
          }
          continue;
        }

        const h = get_el_height(el);
        const tag = (el.tagName || '').toLowerCase();
        const is_RT_page_break = tag === 'rt·page-break' || tag === 'rt·page-break-primitive';

        if(is_RT_page_break){
          trace(el_id(el) + ' -> FORCED PAGE BREAK'
                + (current_h > 0 ? ' ,emitting page' : ' ,page already empty ,ignored'));
          if(current_h > 0){
            page_seq.push(current_batch_seq);
            current_batch_seq = [];
            current_h = 0;
          }
          i++;
          continue; 
        }

        if(current_h + h > page_height_limit && current_h > 0){
          trace(el_id(el) + ': ' + h + 'px would exceed limit at ' + current_h
                + 'px used -> MOVE TO NEXT PAGE (atomic ,no splitter)');
          let backtrack_seq = [];
          let backtrack_h = 0;
          
          while(current_batch_seq.length > 0){
            const last = current_batch_seq[current_batch_seq.length - 1];
            if(!is_heading(last)) break;
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

        trace(el_id(el) + ': ' + h + 'px -> place (atomic) ,page now ' + (current_h + h) + 'px');
        current_batch_seq.push(el);
        current_h += h;
        i++;
      }

      if(current_batch_seq.length > 0){
        page_seq.push(current_batch_seq);
      }

      trace('=== ' + page_seq.length + ' pages produced ===');

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
        const is_authored = !Array.isArray(batch);
        const page_el = is_authored ? batch : document.createElement('RT·page');
        
        page_el.style.minHeight = page_height_limit + 'px';
        page_el.style.position = 'relative';
        page_el.style.paddingBottom = '5rem';
        page_el.style.boxSizing = 'border-box';
        
        if(!is_authored) batch.forEach( item => page_el.appendChild(item) );

        /* An unnumbered leaf takes no step ,so the counter does not advance
           across it and the leaf after it holds the number this one would have
           taken. Not counted rather than counted and hidden ,which is what a
           title page wants: the reader's page one is the first page of text. */
        if(is_authored && page_el.hasAttribute('no-number')){
          article.appendChild(page_el);
          p++;
          continue;
        }

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
      const rendered_pages = article.querySelectorAll('RT·page');
      
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

    const rendered_pages = document.querySelectorAll('RT·page');
    Array.from(rendered_pages).forEach(page => {
      const actual_height = page.scrollHeight;
      if(actual_height > page_height_limit){
        page.style.minHeight = actual_height + 'px';
      }
    });
  }

  RT.task_add('paginate_0' ,paginate_0);
  RT.task_add('paginate_1' ,paginate_1);

})();
