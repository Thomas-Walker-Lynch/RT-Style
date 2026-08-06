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
        exact_px *= 0.95;
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
    }
  });

})();
