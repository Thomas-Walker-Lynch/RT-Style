/*
  Processes <RT-chapter> tags.
  Transforms the tag into an <RT-page-break> followed by an <h1> with the RT-chapter class.
*/
window.RT = window.RT || {};

window.RT.chapter = function(){
  const debug = window.RT.debug || { log: function(){} };

  document.querySelectorAll('RT-chapter').forEach( (el ,index) => {
    if(debug.log) debug.log('chapter' ,`Processing chapter ${index + 1}`);

    const brk = document.createElement('RT-page-break');
    const h1 = document.createElement('h1');

    h1.innerHTML = el.innerHTML;

    if(el.className){
      h1.className = el.className;
    }
    h1.classList.add('RT-chapter');

    Array.from(el.attributes).forEach( (attr) => {
      if(attr.name !== 'class'){
        h1.setAttribute(attr.name ,attr.value);
      }
    });

    el.parentNode.insertBefore(brk ,el);
    el.replaceWith(h1);
  });
};
