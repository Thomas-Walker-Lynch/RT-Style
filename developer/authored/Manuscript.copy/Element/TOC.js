/*
  Element/TOC.js
  Processes <RT·TOC> tags.
  Iterates nested RT_section boundaries, evaluates tree depth, 
  and duplicates the title payload for automated navigation.
*/

(function(){

  if(!window.RT) return;

  const apply_style = function(a ,config){
    a.style.textDecoration = 'none';
    a.style.color = 'inherit';
    a.style.display = 'block';

    a.onmouseover = () => a.style.color = config.brand_primary || '#000';
    a.onmouseout  = () => a.style.color = 'inherit';
  };

  RT.Element.add(function(){
    const debug = window.RT.Debug || { log: function(){} };
    if(debug.log) debug.log('TOC' ,'Generating Table of Contents from expanded section steps');
    
    const config = window.RT.layout_config || {};
    const TOC_seq = document.querySelectorAll('RT·TOC, rt·toc');

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

      const sections = [];
      const all_sections = document.querySelectorAll('RT·counter·step[counter="RT_section"], rt·counter·step[counter="RT_section"]');
      
      all_sections.forEach(section => {
        let depth = 0;
        let curr = section.parentElement;
        
        while(curr){
          const tag = (curr.tagName || '').toLowerCase();
          if(tag === 'rt·counter·step' && curr.getAttribute('counter') === 'RT_section'){
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
      title.textContent = start_level === 1 ? 'Table of Contents' : 'Section Contents';
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
