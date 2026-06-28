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

  if (!window.RT) {
    console.error("RT not defined - was RT-Style_make run?");
    return;
  }
  if (!window.RT.Element) {
    console.error("RT.Element not defined - was the state_manager run?");
    return;
  }

  RT.Element.add( function() {
    const debug = window.RT.Debug || { log: function(){} };
    const TOC_seq = document.querySelectorAll('rt·toc');

    TOC_seq.forEach( (container ,TOC_index) => {
      container.style.display = 'block';

      // 1. Parse attribute: single number N or range A-B
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
            if (debug.log) debug.log('TOC', `TOC #${TOC_index} range: H${a}-H${b}`);
          } else {
            if (debug.log) debug.log('TOC', `Invalid range "${attr_val}" -> implicit mode`);
          }
        } else {
          const single = parseInt(attr_val);
          if (!isNaN(single) && single >= 1 && single <= 6) {
            start_level = single;
            end_level   = single;
            if (debug.log) debug.log('TOC', `TOC #${TOC_index} single level: H${single}`);
          } else {
            if (debug.log) debug.log('TOC', `Invalid level "${attr_val}" -> implicit mode`);
          }
        }
      }

      // 2. Implicit mode (no attribute or invalid)
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
        if (debug.log) debug.log('TOC', `TOC #${TOC_index} implicit target: H${target_level}`);
      }

      // 3. Collect all matching headings until a higher-level heading stops us
      const headings = [];
      let next_el = container.nextElementSibling;
      while (next_el) {
        const match = next_el.tagName.match(/^H([1-6])$/);
        if (match) {
          const found_level = parseInt(match[1]);

          // Stop if we hit a heading that is a parent of the lowest level we collect
          if (found_level < start_level) break;

          // Collect if within the requested range
          if (found_level >= start_level && found_level <= end_level) {
            // Ensure it has an id
            if (!next_el.id) {
              next_el.id = `TOC-ref-${TOC_index}-${found_level}-${headings.length}`;
            }
            headings.push({ el: next_el, level: found_level });
          }
        }
        next_el = next_el.nextElementSibling;
      }

      // 4. Build the container (title + list)
      container.innerHTML = '';
      const title = document.createElement('h1');
      title.textContent = start_level === 1 ? 'Table of Contents' : 'Section Contents';
      title.style.textAlign = 'center';
      container.appendChild(title);

      if (headings.length === 0) return; // nothing to show

      // Top-level list
      const topList = document.createElement('ul');
      topList.style.listStyle = 'none';
      topList.style.paddingLeft = '0';
      container.appendChild(topList);

      // Stack of <ul> elements; index 0 = top-level list
      const listStack = [topList];

      for (const item of headings) {
        // Depth relative to start_level
        const depth = item.level - start_level;   // 0 = top-level, 1 = sub-level, etc.

        // Ensure we have the correct nesting depth
        while (listStack.length - 1 > depth) {
          // Pop until we are at the right depth
          listStack.pop();
        }

        // If we need to go deeper, open new sub-lists inside the last <li>
        while (listStack.length - 1 < depth) {
          const parentList = listStack[listStack.length - 1];
          const lastLi = parentList.lastElementChild;
          if (lastLi) {
            const subList = document.createElement('ul');
            subList.style.listStyle = 'none';
            subList.style.paddingLeft = '1.5rem';   // indentation for nested items
            lastLi.appendChild(subList);
            listStack.push(subList);
          } else {
            // No parent <li> yet - stay at current depth (flatten)
            break;
          }
        }

        // Create the <li> for this heading
        const li = document.createElement('li');
        li.style.marginBottom = '0.5rem';

        const a = document.createElement('a');
        a.href = `#${item.el.id}`;
        a.textContent = item.el.textContent;
        a.style.textDecoration = 'none';
        a.style.color = 'inherit';
        a.style.display = 'block';

        a.onmouseover = () => a.style.color = 'var(--RT·brand-primary)';
        a.onmouseout  = () => a.style.color = 'inherit';

        li.appendChild(a);
        // Add to the current deepest list
        listStack[listStack.length - 1].appendChild(li);
      }
    });
  });

})();
