/*
Currently built into the paginator

*/
(function(){
  if(!window.RT) return;

  if(RT.Element.Footnote) return;      // already plugged in
  const ns = RT.Element.Footnote = {};
  const apply_style = function(el, config) {};
  // Footnote processing is structurally evaluated by the paginator.
  // This closure exists strictly to validate the semantic footprint.
  RT.task_add('element' ,function() {
    const config = window.RT.layout_config || {};
    document.querySelectorAll('rt·footnote').forEach(el => apply_style(el, config));
  });
})();
