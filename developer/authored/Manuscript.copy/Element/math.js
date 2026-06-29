/*
  Processes <RT·math> tags.
  Prepares the content with appropriate MathJax delimiters and loads the MathJax library.
*/

(function() {

  if (!window.RT) {
    console.error("RT not defined - was RT-Manuscript_make run?");
    return;
  }
  if (!window.RT.Element) {
    console.error("RT.Element not defined - was the state_manager run?");
    return;
  }

  RT.Element.add( function() {
    const debug = window.RT.Debug || { log: function(){} };
    if (debug.log) debug.log('math', 'Processing math tags and loading MathJax');

    // querySelector treats 'rt·math' as case-insensitive for the tag
    document.querySelectorAll('rt·math').forEach(el => {
      if (el.textContent.startsWith('$')) return;

      const is_block = el.parentElement.tagName === 'DIV' || 
                       el.textContent.includes('\n') ||
                       el.parentElement.childNodes.length === 1;

      const delimiter = is_block ? '$$' : '$';
      el.style.display = is_block ? 'block' : 'inline';
      el.textContent = `${delimiter}${el.textContent.trim()}${delimiter}`;
    });

    // MathJax must find its config at window.MathJax
    window.MathJax = window.MathJax || {
      tex: { 
        inlineMath: [['$', '$']], 
        displayMath: [['$$', '$$']] 
      }
    };

    // Prevent multiple script injections if the element pipeline runs more than once
    if (!document.querySelector('script[src*="mathjax@3"]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      script.async = true;
      document.head.appendChild(script);
    }
  });

})();
