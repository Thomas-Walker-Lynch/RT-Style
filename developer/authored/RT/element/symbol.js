// developer/authored/RT/element/symbol.js
window.StyleRT = window.StyleRT || {};

window.StyleRT.symbol = function(){
  document.querySelectorAll('rt-symbol').forEach( (el) => {
    el.style.fontFamily = '"Courier New", Courier, monospace';
    el.style.fontWeight = '600';
    el.style.padding = '0 0.1em';
  });
};
