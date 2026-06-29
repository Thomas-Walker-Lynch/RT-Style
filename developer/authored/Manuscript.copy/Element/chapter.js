/*
  Processes <RT·chapter> tags.
  Transforms the tag into an <RT·page-break> followed by an <h1> with the RT·chapter class.
*/

(function() {

  if (!RT) {
    console.error("RT not defined – was RT-Manuscript_make run?");
    return;
  }
  if (!RT.Element) {
    console.error("RT.Element not defined – was the state_manager run?");
    return;
  }

  RT.Element.add( function() {
    const debug = RT.Debug || { log: function(){} };

    document.querySelectorAll('RT·chapter').forEach((el, index) => {
      if (debug.log) debug.log('chapter', `Processing chapter ${index + 1}`);

      const brk = document.createElement('RT·page-break');
      const h1 = document.createElement('h1');

      h1.innerHTML = el.innerHTML;

      if (el.className) {
        h1.className = el.className;
      }
      h1.classList.add('RT·chapter');

      Array.from(el.attributes).forEach((attr) => {
        if (attr.name !== 'class') {
          h1.setAttribute(attr.name, attr.value);
        }
      });

      el.parentNode.insertBefore(brk, el);
      el.replaceWith(h1);
    });
  })

})();
