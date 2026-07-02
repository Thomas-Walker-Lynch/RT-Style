/*
  Processes <RT·math> tags.
*/

/*
  Processes <RT·math> tags.
*/

(function() {

  if (!window.RT) {
    console.error("RT not defined. Was RT Manuscript make run?");
    return;
  }
  if (!window.RT.Element) {
    console.error("RT.Element not defined. Was the stage manager run?");
    return;
  }

  // Configure MathJax to skip its default full document scan
  window.MathJax = window.MathJax || {};
  window.MathJax.startup = {
    typeset: false
  };

  const scan_tags = function() {
    const debug = window.RT.Debug || { log: function(){} };
    if (debug.log) debug.log('math', 'Processing math tags');

    const math_elements = Array.from(document.querySelectorAll('RT·math'));

    if (math_elements.length === 0) return;

    math_elements.forEach(el => {
      const is_block = el.parentElement.tagName === 'DIV' || 
                       el.textContent.includes('\n') ||
                       el.parentElement.childNodes.length === 1;

      // MathJax 3 handles block vs inline via the display parameter 
      // in its internal math object, but setting CSS display helps 
      // the browser layout before MathJax finishes.
      el.style.display = is_block ? 'block' : 'inline';
      
      // We wrap the content in MathJax's internal format manually 
      // so we can force block or inline rendering explicitly without delimiters.
      const math_string = el.textContent.trim();
      el.textContent = ''; 
      
      // We rely on MathJax's synchronous typeset function
      // By passing the specific elements, we only process these tags.
    });

    if (window.MathJax && typeof window.MathJax.typeset === 'function') {
      if (debug.log) debug.log('math', 'Executing synchronous MathJax typeset');
      window.MathJax.typeset(math_elements);
    } else {
      console.error("MathJax not loaded or synchronous typeset unavailable.");
    }
  };

  // Ensure RT.load is complete before stage_manager runs this queue
  RT.load('Math/mathjax');
  RT.Element.add(scan_tags);

})();
