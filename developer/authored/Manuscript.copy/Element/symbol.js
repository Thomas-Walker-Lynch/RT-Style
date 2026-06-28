/*
  Processes <rt·symbol> tags.
  Applies standard monospaced formatting to code symbols inline.
*/

(function() {

  if (!window.RT) {
    console.error("RT not defined - was RT-Style_make run?");
    return;
  }
  if (!window.RT.Element) {
    console.error("RT.Element not defined - was the state_manager run?");
    return;
  }

  RT.Element.add( function() {
    const debug = window.RT.Debug || { log: function(){} };
    if (debug.log) debug.log('symbol', 'Processing symbols');

    document.querySelectorAll('rt·symbol').forEach( (el) => {
      el.style.fontFamily = '"Courier New", Courier, monospace';
      el.style.fontWeight = '600';
      el.style.padding = '0 0.1em';
    });
  });

})();
