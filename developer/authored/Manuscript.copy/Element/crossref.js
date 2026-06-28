// developer/authored/RT/element/crossref.js
window.RT = window.RT || {};

window.RT.crossref = function(){
  document.querySelectorAll('rt·crossref').forEach( (el) => {
    el.style.color = window.RT.theme('read', 'brand', 'link');
    el.style.textDecoration = 'underline';
    el.style.cursor = 'pointer';
    el.style.fontWeight = '500';
  });
};

