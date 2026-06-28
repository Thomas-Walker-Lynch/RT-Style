// developer/authored/RT/element/constraint.js
window.RT = window.RT || {};

window.RT.constraint = function(){
  document.querySelectorAll('rt·constraint').forEach( (el) => {
    el.style.display = 'block';
    el.style.borderLeft = `4px solid ${window.RT.theme('read', 'state', 'warning')}`;
    el.style.backgroundColor = window.RT.theme('read', 'surface', '1');
    el.style.padding = '1rem';
    el.style.margin = '1.5rem 0';
    el.style.color = window.RT.theme('read', 'content', 'main');
  });
};
