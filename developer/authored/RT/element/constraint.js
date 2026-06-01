// developer/authored/RT/element/constraint.js
window.StyleRT = window.StyleRT || {};

window.StyleRT.constraint = function(){
  document.querySelectorAll('rt-constraint').forEach( (el) => {
    el.style.display = 'block';
    el.style.borderLeft = '4px solid var(--rt-state-warning)';
    el.style.backgroundColor = 'var(--rt-surface-1)';
    el.style.padding = '1rem';
    el.style.margin = '1.5rem 0';
    el.style.color = 'var(--rt-content-main)';
  });
};
