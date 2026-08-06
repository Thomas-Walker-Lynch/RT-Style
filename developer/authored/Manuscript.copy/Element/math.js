/*
  Processes <RT·math> tags.
*/

(function(){

  if(!window.RT){
    console.error("RT not defined. Was RT Manuscript make run?");
    return;
  }

  if(RT.Element.Math) return;      // already plugged in
  const ns = RT.Element.Math = {};
  if(!window.RT.Element){
    console.error("RT.Element not defined. Was the stage manager run?");
    return;
  }

  window.MathJax = window.MathJax || {};
  
  window.MathJax.startup = {
    typeset: false
  };

  window.MathJax.options = {
    // Disable the screen-reader block to prevent duplicate text rendering
    enableAssistiveMml: false
  };

  window.MathJax.svg = {
    // Force paths to draw directly instead of referencing a global cache
    fontCache: 'none' 
  };

  const scan_tags = function(){
    const debug = window.RT.Debug || { log: function(){} };
    if(debug.log) debug.log('math' ,'Processing math tags directly');

    const math_elements = Array.from(document.querySelectorAll('RT·math'));

    if(math_elements.length === 0) return;

    if(!window.MathJax || typeof window.MathJax.tex2svg !== 'function'){
      console.error("MathJax not loaded or synchronous tex2svg unavailable.");
      return;
    }

    math_elements.forEach(el => {
      const is_block = el.innerHTML.includes('\n');

      if (is_block) {
        el.style.display = 'block';
        el.style.textAlign = 'center';
        el.style.margin = '1rem 0';
      } else {
        el.style.display = 'inline';
      }
      
      const raw_math = el.textContent;
      const svg_node = window.MathJax.tex2svg(raw_math ,{display: is_block});
      
      // Safety net: Strip the block manually if the config fails to catch it
      const assistive = svg_node.querySelector('mjx-assistive-mml');
      if(assistive) assistive.remove();

      el.innerHTML = '';
      el.appendChild(svg_node);
    });

  };

  RT.load('Math/mathjax_svg');
  RT.task_add('element' ,scan_tags);

})();
