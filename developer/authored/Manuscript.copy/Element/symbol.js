// developer/authored/RT/element/symbol.js
window.RT = window.RT || {};

window.RT.symbol = function(){
  document.querySelectorAll('rt-symbol').forEach( (el) => {
    el.style.fontFamily = '"Courier New", Courier, monospace';
    el.style.fontWeight = '600';
    el.style.padding = '0 0.1em';
  });
};
