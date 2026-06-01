// developer/authored/RT/element/crossref.js
window.StyleRT = window.StyleRT || {};

window.StyleRT.crossref = function(){
  document.querySelectorAll('rt-crossref').forEach( (el) => {
    el.style.color = 'var(--rt-brand-link)';
    el.style.textDecoration = 'underline';
    el.style.cursor = 'pointer';
    el.style.fontWeight = '500';
    
    // Note: To make this fully context-aware across soft limits,
    // this module will eventually need to hook into the page 
    // registry built by paginate_by_element.js.
  });
};
