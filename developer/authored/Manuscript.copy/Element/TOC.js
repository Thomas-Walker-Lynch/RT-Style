/*
  Element/TOC.js
  Processes <RT·TOC> tags.
  Iterates nested RT·Section·counter step boundaries, evaluates tree depth, 
  and duplicates the title payload for automated navigation.
*/

(function(){

  if(!window.RT) return;

  if(RT.Element.TOC) return;      // already plugged in
  const ns = RT.Element.TOC = {};

  const apply_style = function(a ,config){
    a.style.textDecoration = 'none';
    a.style.color = 'inherit';
    a.style.display = 'block';

    a.onmouseover = () => a.style.color = config.brand_primary || '#000';
    a.onmouseout  = () => a.style.color = 'inherit';
  };


  /* Splitting a table of contents.

     A contents list is one of the few things in a document that is nearly
     always too long for a page, and it divides cleanly: entries are siblings in
     a list, and cutting between two of them loses nothing.

     The title is repeated on the continuation. A page of entries with no
     heading above them tells the reader nothing about what they are looking at,
     and a contents list is consulted by people who have turned to it directly
     rather than arrived by reading. The repeat is marked so a theme can set it
     apart — "continued" ,or a lighter weight — without the splitter deciding
     how that should look.
  */
  window.RT.Component = window.RT.Component || {};
  window.RT.Component['RT·TOC'] = {
    split: function(el ,remaining ,measure_fn){
      const title = el.querySelector('.RT·TOC-title');
      const list  = el.querySelector('ul');
      if(!list) return { first: null ,rest: el ,firstHeight: 0 };

      const items = Array.from(list.children);
      if(items.length < 2) return { first: null ,rest: el ,firstHeight: 0 };

      const probe = el.cloneNode(false);
      const probe_list = list.cloneNode(false);
      if(title) probe.appendChild(title.cloneNode(true));
      probe.appendChild(probe_list);

      let height = measure_fn(probe);
      let taken = 0;
      for(let i = 0; i < items.length; i++){
        const row = items[i].cloneNode(true);
        probe_list.appendChild(row);
        const h = measure_fn(probe);
        if(h > remaining){ probe_list.removeChild(row); break; }
        height = h;
        taken = i + 1;
      }

      // No entry fits beneath the title, or everything fits: nothing to do.
      if(taken === 0 || taken >= items.length){
        return { first: null ,rest: el ,firstHeight: 0 };
      }

      const build = function(from ,to ,is_continuation){
        const frag = el.cloneNode(false);
        if(title){
          const t = title.cloneNode(true);
          if(is_continuation) t.setAttribute('data-rt-continued' ,'true');
          frag.appendChild(t);
        }
        const l = list.cloneNode(false);
        for(let i = from; i < to; i++) l.appendChild(items[i].cloneNode(true));
        frag.appendChild(l);
        return frag;
      };

      return {
        first: build(0 ,taken ,false)
        ,rest: build(taken ,items.length ,true)
        ,firstHeight: height
      };
    }
  };

  RT.task_add('element' ,function(){
    const debug = window.RT.Debug || { log: function(){} };
    if(debug.log) debug.log('TOC' ,'Generating table of contents from expanded section steps');
    
    const config = window.RT.layout_config || {};
    const TOC_seq = document.querySelectorAll('RT·TOC');

    TOC_seq.forEach((container ,TOC_index) => {
      container.style.display = 'block';

      const attr_val = container.getAttribute('level');
      let start_level = 1;
      let end_level = 6; 
      
      if(attr_val){
        const range_match = attr_val.match(/^(\d)-(\d)$/);
        if(range_match){
          start_level = parseInt(range_match[1]);
          end_level   = parseInt(range_match[2]);
        }else{
          const single = parseInt(attr_val);
          if(!isNaN(single)){
            start_level = single;
            end_level   = single;
          } 
        }
      }

      /* Every section ,whichever series it belongs to.

         Naming the body counter here would have listed the chapters and left
         the front matter and the appendices out of the contents ,which is
         where a reader looks for them first. Steps mark themselves as sections
         when they are built ,so the query does not have to know what counters
         exist ,and depth is counted against the step's own counter so the
         divisions nest independently. */
      const sections = [];
      const all_sections = document.querySelectorAll('RT·counter·step[data-RT-section]');
      
      all_sections.forEach(section => {
        const counter_name = section.getAttribute('counter');
        let depth = 0;
        let curr = section.parentElement;
        
        while(curr){
          const tag = (curr.tagName || '').toLowerCase();
          if(tag === 'rt·counter·step' && curr.getAttribute('counter') === counter_name){
            depth++;
          }
          curr = curr.parentElement;
        }
        
        const level = depth + 1;
        if(level >= start_level && level <= end_level){
          const title_node = section.querySelector('.RT·section-title');
          
          if(title_node){
            sections.push({ 
               id: section.id
               ,level: level
               ,html: title_node.innerHTML 
            });
          }
        }
      });

      container.innerHTML = '';
      const title = document.createElement('div');
      title.className = 'RT·TOC-title';
      title.textContent = start_level === 1 ? 'Table of contents' : 'Section contents';
      title.style.textAlign = 'center';
      title.style.fontWeight = '600';
      title.style.fontSize = '1.5em';
      title.style.marginBottom = '1.5rem';
      title.style.color = config.brand_primary || '#000';
      container.appendChild(title);

      if(sections.length === 0) return; 

      const top_list = document.createElement('ul');
      top_list.style.listStyle = 'none';
      top_list.style.paddingLeft = '0';
      top_list.style.marginBottom = '0';
      container.appendChild(top_list);

      // Capability plus per instance permission ,as everywhere else.
      container.setAttribute('data-rt-component' ,'RT·TOC');
      container.setAttribute('splitable' ,'true');

      const list_stack = [top_list];

      for(const item of sections){
        const depth = item.level - start_level;   

        while(list_stack.length - 1 > depth){
          list_stack.pop();
        }

        while(list_stack.length - 1 < depth){
          const parent_list = list_stack[list_stack.length - 1];
          const last_li = parent_list.lastElementChild;

          if(last_li){
            const sub_list = document.createElement('ul');
            sub_list.style.listStyle = 'none';
            sub_list.style.paddingLeft = '1.5rem';
            sub_list.style.marginBottom = '0';
            last_li.appendChild(sub_list);
            list_stack.push(sub_list);
          }else{
            break;
          }
        }

        const li = document.createElement('li');
        li.style.marginBottom = '0';
        li.style.marginTop = depth === 0 ? '1.25rem' : '0.25rem';

        const a = document.createElement('a');
        a.href = `#${item.id}`;
        a.innerHTML = item.html; 
        
        apply_style(a ,config);

        li.appendChild(a);
        list_stack[list_stack.length - 1].appendChild(li);
      }
    });
  });

})();
