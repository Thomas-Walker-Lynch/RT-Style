/*
  Processes <rt·crossref> tags.
  Applies default styling and interaction cues using the active RT theme.
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
    if (debug.log) debug.log('crossref', 'Processing cross-references');

    document.querySelectorAll('rt·crossref').forEach( (el) => {
      el.style.color = window.RT.theme('read', 'brand', 'link');
      el.style.textDecoration = 'underline';
      el.style.cursor = 'pointer';
      el.style.fontWeight = '500';
    });
  });

})();
