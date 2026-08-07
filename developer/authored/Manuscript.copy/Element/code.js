/*
  Element/code.js
  Processes <RT·code> tags, enforcing alignment and typographic boundaries.
*/

(function(){

  if(!window.RT) return;

  if(RT.Element.Code) return;      // already plugged in
  const ns = RT.Element.Code = {};

  const apply_style = function(el ,is_block ,exact_px ,offset_px ,text_color ,overlay_color ,config){
    el.style.fontFamily = "'Courier New', Courier, monospace";
    el.style.backgroundColor = overlay_color;
    el.style.color = text_color;

    if(is_block){
      el.style.display = 'block';
      el.style.whiteSpace = 'pre';
      el.style.fontSize = exact_px + 'px';
      el.style.padding = '1.2rem';
      el.style.margin = '1.5rem 0';
      el.style.borderLeft = '4px solid ' + (config.brand_secondary || 'gold');
    } else {
      el.style.display = 'inline';
      el.style.fontSize = exact_px + 'px';
      el.style.padding = '0.1rem 0.35rem';
      el.style.borderRadius = '3px';
      el.style.verticalAlign = offset_px + 'px';
    }
  };

  /* Wrapping an overflowing code line.

     Code is set in a fixed pitch face with white-space: pre ,so it does not
     wrap and a long line runs off the right edge and is lost. Three responses
     were considered. Shrinking the face to fit lets one long line dictate the
     size of every block on the page. Scrolling works on a screen and fails on
     paper ,and fails silently ,which is the property worth avoiding above all.
     Wrapping with a mark works the same in both and loses nothing.

     The convention is the compositor's: mark the broken line so the reader
     knows it continues ,and set the carried portion flush right so it reads as
     a continuation rather than as a new line of code. Indentation carries most
     of the meaning in a listing ,and a carried fragment starting at the left
     margin would read as a statement in its own right. Pushed to the right
     margin it cannot be mistaken for one.

     A fixed pitch face makes the arithmetic exact: one character width divides
     into the measure and gives the columns available ,with no search needed.
  */
  /* The cue is a pair. A mark at the end of a broken line says the line goes
     on; a mark at the start of the carried fragment says this is where it went.
     One alone leaves the reader to infer the other end. */
  const BREAKS   = '\u21A9';           // leftwards arrow with hook: continues
  const RESUMES  = '\u21AA';           // rightwards arrow with hook: continued

  function wrap_code_line(line ,columns){
    if(columns < 8 || line.length <= columns) return [line];
    const out = [];

    // The opening fragment surrenders one column to the break mark.
    out.push(line.slice(0 ,columns - 1) + BREAKS);
    let rest = line.slice(columns - 1);

    // Fragments that are themselves full carry both marks.
    while(rest.length > columns - 1){
      out.push(RESUMES + rest.slice(0 ,columns - 2) + BREAKS);
      rest = rest.slice(columns - 2);
    }

    // The last fragment resumes and is set flush right.
    const tail = RESUMES + rest;
    out.push(' '.repeat(Math.max(0 ,columns - tail.length)) + tail);
    return out;
  }

  function columns_available(el){
    const probe = document.createElement('span');
    probe.style.font = window.getComputedStyle(el).font;
    probe.style.visibility = 'hidden';
    probe.style.whiteSpace = 'pre';
    probe.textContent = '0'.repeat(100);
    el.appendChild(probe);
    const char_w = probe.getBoundingClientRect().width / 100;
    el.removeChild(probe);
    if(!(char_w > 0)) return 0;

    const cs = window.getComputedStyle(el);
    const inner = el.clientWidth
                - parseFloat(cs.paddingLeft || 0)
                - parseFloat(cs.paddingRight || 0);
    return Math.floor(inner / char_w);
  }

  RT.task_add('element' ,function(){
    const U = window.RT.Utility;
    const config = window.RT.layout_config || {};
    const metrics = U.Font.measure_ink_ratio('monospace');
    
    const nodes = document.querySelectorAll('rt·code');

    for(let i = 0; i < nodes.length; i++){
      const el = nodes[i];
      const is_block = el.innerHTML.includes('\n');
      const computed = window.getComputedStyle(el);
      
      const is_text_light = U.Color.is_light(config.content_main);
      const alpha = is_block ? 0.08 : 0.15;
      const overlay = is_text_light ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
      const text_color = is_text_light ? '#ffffff' : '#000000';

      let exact_px = parseFloat(computed.fontSize) * metrics.ratio;
      let offset_px = metrics.baseline_diff * (exact_px / 100);

      if(is_block){
        /* A fixed pitch face reads larger than a proportional one at the same
           size, since its widest glyphs set the measure. The tradition is a
           point or two smaller: eleven against twelve, sometimes ten. The ink
           ratio corrects for the face; this corrects for the impression. */
        exact_px *= ((RT.config && RT.config.code && RT.config.code.size_ratio) || 0.85);
        let tagIndent = '';
        const prevNode = el.previousSibling;
        
        if(prevNode && prevNode.nodeType === 3){
          const prevText = prevNode.nodeValue;
          const lastNewLineIndex = prevText.lastIndexOf('\n');
          if(lastNewLineIndex !== -1){
            tagIndent = prevText.substring(lastNewLineIndex + 1);
          } else if(/^\s*$/.test(prevText)){
            tagIndent = prevText;
          }
        }

        const rawLines = el.textContent.split('\n');
        const contentLines = rawLines.filter(line => line.trim().length > 0);
        let commonIndent = '';

        if(contentLines.length > 0){
          const firstMatch = contentLines[0].match(/^\s*/);
          commonIndent = firstMatch ? firstMatch[0] : '';
          for(let k = 1; k < contentLines.length; k++){
            const line = contentLines[k];
            let j = 0;
            while(j < commonIndent.length && j < line.length && commonIndent[j] === line[j]) j++;
            commonIndent = commonIndent.substring(0 ,j);
            if(commonIndent.length === 0) break;
          }
        }

        let finalString = '';
        if(commonIndent.length > 0 && commonIndent.startsWith(tagIndent)){
          const cleanedLines = rawLines.map(line => line.startsWith(commonIndent) ? line.replace(commonIndent ,'') : line);
          if(cleanedLines.length > 0 && cleanedLines[0].length === 0) cleanedLines.shift();
          if(cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim().length === 0) cleanedLines.pop();
          finalString = cleanedLines.join('\n');
        } else {
          finalString = el.textContent.trim();
        }
        el.textContent = finalString;
      }

      apply_style(el ,is_block ,exact_px ,offset_px ,text_color ,overlay ,config);

      /* Wrap after styling, since the columns available depend on the size just
         set. An overflow is reported as well as repaired: a line long enough to
         need carrying is usually a line the author would rather rewrite, and a
         wrapped listing is a compromise even when it is a correct one. The
         report names the block and the first line that overflowed, so the source
         can be found without hunting. */
      if(is_block){
        const columns = columns_available(el);
        if(columns > 0){
          const lines = el.textContent.split('\n');
          let first_over = -1;
          let longest = 0;
          const wrapped = [];
          for(let k = 0; k < lines.length; k++){
            if(lines[k].length > columns){
              if(first_over === -1) first_over = k;
              if(lines[k].length > longest) longest = lines[k].length;
            }
            const parts = wrap_code_line(lines[k] ,columns);
            for(let p = 0; p < parts.length; p++) wrapped.push(parts[p]);
          }
          if(first_over !== -1){
            el.textContent = wrapped.join('\n');
            el.setAttribute('data-rt-wrapped' ,'true');
            window.RT.Debug.error('code'
              ,'code block overflows the measure: ' + columns + ' columns available ,'
              + 'longest line ' + longest + '. Wrapped with continuation marks. '
              + 'First overflowing line ' + (first_over + 1) + ': '
              + lines[first_over].trim().slice(0 ,60));
          }
        }
      }
    }
  });

})();
