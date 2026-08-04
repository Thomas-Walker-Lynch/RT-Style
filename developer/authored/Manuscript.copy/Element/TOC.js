/*
  Element/TOC.js
  Processes <RT·TOC> tags.
  Iterates nested <RT·section> boundaries, evaluates tree depth, 
  and duplicates the title payload for automated navigation.
*/

(function() {

  if (!window.RT) return;

  const apply_style = function(a ,config) {
    a.style.textDecoration = 'none';
    a.style.color = 'inherit';
    a.style.display = 'block';

    a.onmouseover = () => a.style.color = config.brand_primary || '#000';
    a.onmouseout  = () => a.style.color = 'inherit';
  };

  RT.Element.add( function() {
    const debug = window.RT.Debug || { log: function(){} };
    if (debug.log) debug.log('TOC' ,'Generating Table of Contents from nested sections');
    
    const config = window.RT.layout_config || {};
    const TOC_seq = document.querySelectorAll('rt·toc, RT·TOC');

    TOC_seq.forEach( (container ,TOC_index) => {
      container.style.display = 'block';

      const attr_val = container.getAttribute('level');
      let start_level = 1;
      let end_level = 6; 
      
      if (attr_val) {
        const rangeMatch = attr_val.match(/^(\d)-(\d)$/);
        if (rangeMatch) {
          start_level = parseInt(rangeMatch[1]);
          end_level   = parseInt(rangeMatch[2]);
        } else {
          const single = parseInt(attr_val);
          if (!isNaN(single)) {
            start_level = single;
            end_level   = single;
          } 
        }
      }

      const sections = [];
      const all_sections = document.querySelectorAll('rt·section, RT·section');
      
      all_sections.forEach(section => {
        let depth = 0;
        let curr = section.parentElement;
        
        while (curr) {
          if (curr.tagName && curr.tagName.toLowerCase() === 'rt·section') {
            depth++;
          }
          curr = curr.parentElement;
        }
        
        const level = depth + 1;
        if (level >= start_level && level <= end_level) {
          
          // Use querySelector to safely find the title regardless of nested wrapper logic
          const title_node = section.querySelector('.RT·section-title');
          
          if (title_node) {
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

      if (sections.length === 0) return; 

      const topList = document.createElement('ul');
      topList.style.listStyle = 'none';
      topList.style.paddingLeft = '0';
      topList.style.marginBottom = '0';
      container.appendChild(topList);

      const listStack = [topList];

      for (const item of sections) {
        const depth = item.level - start_level;   

        while (listStack.length - 1 > depth) {
          listStack.pop();
        }

        while (listStack.length - 1 < depth) {
          const parentList = listStack[listStack.length - 1];
          const lastLi = parentList.lastElementChild;

          if (lastLi) {
            const subList = document.createElement('ul');
            subList.style.listStyle = 'none';
            subList.style.paddingLeft = '1.5rem';
            subList.style.marginBottom = '0';
            lastLi.appendChild(subList);
            listStack.push(subList);
          } else {
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
        listStack[listStack.length - 1].appendChild(li);
      }
    });
  });

})();
