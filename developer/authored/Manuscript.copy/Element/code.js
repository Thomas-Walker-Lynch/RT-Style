/*
  Processes <RT·code> tags.
  Uses the central config or CSS variables from the theme.

  Removes common indent from lines of code.
*/
(function(){

  if (!RT) {
    console.error("RT not defined – was RT-Manuscript_make run?");
    return;
  }
  if (!RT.Element) {
    console.error("RT.Element not defined – was the state_manager run?");
    return;
  }

  RT.Element.add( function() {
    const RT = window.RT;
    const U = RT.Utility;
    const debug = RT.Debug;

    debug.log('code', 'Starting render cycle.');

    const metrics = U.Font.measure_ink_ratio('monospace');
    
    document.querySelectorAll('rt·code').forEach((el) => {
      el.style.fontFamily = 'monospace';

      const computed = window.getComputedStyle(el);
      const accent = window.RT.theme('read', 'brand', 'secondary') || 'gold';
      
      const is_block = U.Dom.is_block_content(el);
      const parentColor = window.RT.theme('read', 'content', 'main');
      const is_text_light = U.Color.is_light(parentColor);
      
      const alpha = is_block ? 0.08 : 0.15;
      const overlay = is_text_light ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
      const text_color = is_text_light ? '#ffffff' : '#000000';

      el.style.backgroundColor = overlay;

      if (is_block) {
        el.style.display = 'block';

        // --- Tag-Relative Auto-Dedent Logic ---
        
        // 1. Get Tag Indentation (The Anchor)
        let tagIndent = '';
        const prevNode = el.previousSibling;
        if (prevNode && prevNode.nodeType === 3) {
          const prevText = prevNode.nodeValue;
          const lastNewLineIndex = prevText.lastIndexOf('\n');
          if (lastNewLineIndex !== -1) {
            tagIndent = prevText.substring(lastNewLineIndex + 1);
          } else if (/^\s*$/.test(prevText)) {
            tagIndent = prevText;
          }
        }

        // 2. Calculate Common Leading Whitespace from Content
        const rawLines = el.textContent.split('\n');
        
        // Filter out empty lines for calculation purposes so they don't break the logic
        const contentLines = rawLines.filter(line => line.trim().length > 0);

        let commonIndent = null;

        if (contentLines.length > 0) {
          // Assume the first line sets the standard
          const firstMatch = contentLines[0].match(/^\s*/);
          commonIndent = firstMatch ? firstMatch[0] : '';

          // Reduce the commonIndent if subsequent lines have LESS indentation
          for (let i = 1; i < contentLines.length; i++) {
            const line = contentLines[i];
            // Determine how much of commonIndent this line shares
            let j = 0;
            while (j < commonIndent.length && j < line.length && commonIndent[j] === line[j]) {
              j++;
            }
            commonIndent = commonIndent.substring(0, j);
            if (commonIndent.length === 0) break; // Optimization
          }
        } else {
          commonIndent = '';
        }

        // 3. Process Content
        // Rule: Only strip if the Common Indent contains the Tag Indent (Safety Check)
        // This handles the Emacs case: Tag is "  ", Common is "    ". "    " starts with "  ".
        // We strip "    ", leaving the code flush left.
        let finalString = '';

        if (commonIndent.length > 0 && commonIndent.startsWith(tagIndent)) {
          const cleanedLines = rawLines.map(line => {
            // Strip the common indent from valid lines
            return line.startsWith(commonIndent) ? line.replace(commonIndent, '') : line;
          });

          // Remove artifact lines (first/last empty lines)
          if (cleanedLines.length > 0 && cleanedLines[0].length === 0) {
            cleanedLines.shift();
          }
          if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim().length === 0) {
            cleanedLines.pop();
          }
          finalString = cleanedLines.join('\n');
        } else {
          // Fallback: Code is to the left of the tag or weirdly formatted. 
          // Just trim the wrapper newlines.
          finalString = el.textContent.trim();
        }

        el.textContent = finalString;
        // --- End Indentation Logic ---

        el.style.whiteSpace = 'pre';
        el.style.fontSize = (parseFloat(computed.fontSize) * metrics.ratio * 0.95) + 'px'; 
        el.style.padding = '1.2rem';
        el.style.margin = '1.5rem 0';
        el.style.borderLeft = `4px solid ${accent}`;
        el.style.color = 'inherit'; 
      } else {
        el.style.display = 'inline';
        const exactPx = parseFloat(computed.fontSize) * metrics.ratio * 1.0; 
        el.style.fontSize = exactPx + 'px';
        el.style.padding = '0.1rem 0.35rem';
        el.style.borderRadius = '3px';
        const offsetPx = metrics.baseline_diff * (exactPx / 100);
        el.style.verticalAlign = offsetPx + 'px';
        el.style.color = text_color; 
      }
    });
    
    debug.log('code', 'Render cycle complete.');
  })

})();
