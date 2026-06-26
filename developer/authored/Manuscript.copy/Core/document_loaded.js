window.RT = window.RT || {};

window.RT.document_loaded = function(layout_callback) {
  const debug = window.RT.debug || { log: function(){} };
  debug.log('lifecycle', 'Processing registered elements.');

  if (window.RT.theme) {
    window.RT.theme();
  }
  
  if (window.RT.Element && Array.isArray(window.RT.Element)) {
    window.RT.Element.forEach(function(element_fn) {
      if (typeof element_fn === 'function') {
        element_fn();
      }
    });
  }

  if (window.MathJax && MathJax.Hub && MathJax.Hub.Queue) {
    MathJax.Hub.Queue(["Typeset", MathJax.Hub], layout_callback);
  } else {
    layout_callback();
  }
};
