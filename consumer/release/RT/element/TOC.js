/*
  Processes <RT-TOC> tags.
  Populates each with headings found below it.

  Attributes:
    level="N" : Explicitly sets the target heading level (1-6).
                e.g., level="1" collects H1s. level="2" collects H2s.
                Stops collecting if it hits a heading of (level - 1) or higher.

  Default (No attribute):
    Context Aware. Looks backwards for the nearest heading H(N).
    Targets H(N+1). Stops at the next H(N).
*/
window.StyleRT = window.StyleRT || {};

window.StyleRT.TOC = function(){
  const debug = window.StyleRT.debug || { log: function(){} };
  const TOC_seq = document.querySelectorAll('rt-toc');

  TOC_seq.forEach( (container ,TOC_index) => {
    container.style.display = 'block';

    // 1. Determine Target Level
    const attr_level = parseInt( container.getAttribute('level') );
    let target_level;

    if( !isNaN(attr_level) ){
       // EXPLICIT MODE
       target_level = attr_level;
       if(debug.log) debug.log('TOC' ,`TOC #${TOC_index} explicit target: H${target_level}`);
    } else {
       // IMPLICIT / CONTEXT MODE
       let context_level = 0; // Default 0 (Root)
       let prev = container.previousElementSibling;
       while(prev){
         const match = prev.tagName.match(/^H([1-6])$/);
         if(match){
           context_level = parseInt( match[1] );
           break;
         }
         prev = prev.previousElementSibling;
       }
       target_level = context_level + 1;
       if(debug.log) debug.log('TOC' ,`TOC #${TOC_index} context implied target: H${target_level}`);
    }

    // Stop condition: Stop if we hit a heading that is a "parent" or "sibling" of the context.
    // Mathematically: Stop if found_level < target_level.
    const stop_threshold = target_level;

    // 2. Setup Container
    container.innerHTML = '';
    const title = document.createElement('h1');
    // Title logic: If targeting H1, the element serves as a Main TOC. Otherwise the element serves as a Section TOC.
    title.textContent = target_level === 1 ? 'Table of Contents' : 'Section Contents';
    title.style.textAlign = 'center';
    container.appendChild(title);

    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.paddingLeft = '0';
    container.appendChild(list);

    // 3. Scan Forward
    let next_el = container.nextElementSibling;
    while(next_el){
      const match = next_el.tagName.match(/^H([1-6])$/);
      if(match){
        const found_level = parseInt( match[1] );

        // STOP Logic:
        // If we are looking for H2s, we stop if we hit an H1 (level 1).
        // If we are looking for H1s, we stop if we hit nothing (level 0).
        if(found_level < target_level){
          break;
        }

        // COLLECT Logic:
        if(found_level === target_level){
          if(!next_el.id) next_el.id = `TOC-ref-${TOC_index}-${found_level}-${list.children.length}`;

          const li = document.createElement('li');
          li.style.marginBottom = '0.5rem';

          const a = document.createElement('a');
          a.href = `#${next_el.id}`;
          a.textContent = next_el.textContent;
          a.style.textDecoration = 'none';
          a.style.color = 'inherit';
          a.style.display = 'block';

          a.onmouseover = () => a.style.color = 'var(--rt-brand-primary)';
          a.onmouseout = () => a.style.color = 'inherit';

          li.appendChild(a);
          list.appendChild(li);
        }
      }
      next_el = next_el.nextElementSibling;
    }
  });
};
