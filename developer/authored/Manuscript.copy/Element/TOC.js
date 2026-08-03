/*
  Processes <RT·TOC> tags.
  Populates each with headings found below it.

  Attributes:
    level="N" : Explicitly sets the target heading level (1-6).
                e.g., level="1" collects H1s. level="2" collects H2s.
                Stops collecting if it hits a heading of (level - 1) or higher.

  Default (No attribute):
    Context Aware. Looks backwards for the nearest heading H(N).
    Targets H(N+1). Stops at the next H(N).

First heading 1               1
    First heading 2          2
    Next heading 2           2
Next heading 2                3

*/

(function() {

  if (!window.RT) return;

  const apply_style = function(a, config) {
    a.style.textDecoration = 'none';
    a.style.color = 'inherit';
    a.style.display = 'block';

    a.onmouseover = () => a.style.color = config.brand_primary || '#000';
    a.onmouseout  = () => a.style.color = 'inherit';
  };

  RT.Element.add( function() {
    const debug = window.RT.Debug || { log: function(){} };
    const config = window.RT.layout_config || {};
    const TOC_seq = document.querySelectorAll('rt·toc, RT·TOC');

    TOC_seq.forEach( (container ,TOC_index) => {
      container.style.display = 'block';

      const attr_val = container.getAttribute('level');
      let start_level, end_level;

      if (attr_val) {
        const rangeMatch = attr_val.match(/^(\d)-(\d)$/);
        if (rangeMatch) {
          const a = parseInt(rangeMatch[1]);
          const b = parseInt(rangeMatch[2]);
          if (a >= 1 && a <= 6 && b >= 1 && b <= 6 && a <= b) {
            start_level = a;
            end_level   = b;
          } 
        } else {
          const single = parseInt(attr_val);
          if (!isNaN(single) && single >= 1 && single <= 6) {
            start_level = single;
            end_level   = single;
          } 
        }
      }

      if (start_level === undefined || end_level === undefined) {
        let context_level = 0;
        let prev = container.previousElementSibling;
        while (prev) {
          const match = prev.tagName.match(/^H([1-6])$/);
          if (match) {
            context_level = parseInt(match[1]);
            break;
          }
          prev = prev.previousElementSibling;
        }
        const target_level = Math.min(context_level + 1, 6);
        start_level = target_level;
        end_level   = target_level;
      }

      const headings = [];
      let next_el = container.nextElementSibling;
      while (next_el) {
        const match = next_el.tagName.match(/^H([1-6])$/);
        if (match) {
          const found_level = parseInt(match[1]);

          if (found_level < start_level) break;

          if (found_level >= start_level && found_level <= end_level) {
            if (!next_el.id) {
              next_el.id = `TOC-ref-${TOC_index}-${found_level}-${headings.length}`;
            }
            headings.push({ el: next_el, level: found_level });
          }
        }
        next_el = next_el.nextElementSibling;
      }

      container.innerHTML = '';
      const title = document.createElement('h1');
      title.textContent = start_level === 1 ? 'Table of Contents' : 'Section Contents';
      title.style.textAlign = 'center';
      container.appendChild(title);

      if (headings.length === 0) return; 

      const topList = document.createElement('ul');
      topList.style.listStyle = 'none';
      topList.style.paddingLeft = '0';
      topList.style.marginBottom = '0';
      container.appendChild(topList);

      const listStack = [topList];

      for (const item of headings) {
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
        a.href = `#${item.el.id}`;
        a.textContent = item.el.textContent;
        
        apply_style(a, config);

        li.appendChild(a);
        listStack[listStack.length - 1].appendChild(li);
      }
    });
  });

})();
