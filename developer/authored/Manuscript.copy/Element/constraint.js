// developer/authored/RT/element/constraint.js
(function() {

  if (!RT) {
    console.error("RT not defined – was RT-Manuscript_make run?");
    return;
  }
  if (!RT.Element) {
    console.error("RT.Element not defined – was the state_manager run?");
    return;
  }

  RT.Element.add( function(){
    document.querySelectorAll('RT·constraint').forEach( (el) => {
      el.style.display = 'block';
      el.style.borderLeft = `4px solid ${RT.theme('read', 'state', 'warning')}`;
      el.style.backgroundColor = RT.theme('read', 'surface', '1');
      el.style.padding = '1rem';
      el.style.margin = '1.5rem 0';
      el.style.color = RT.theme('read', 'content', 'main');
    });
  });

})();

