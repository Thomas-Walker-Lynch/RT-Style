/*
  immediate.js

  There are 4 variations for RT-Style-locator.js:

  URL_only - used by websites
  indirect - used by Harmony projects, except for RT-style

  immediate - used by RT-style in the distribution (authored, consummer, staged)
  direct - used by RT-style project outside of the distribution, e.g. the main document directory
*/

window.RT = window.RT || {};

(function() {
  window.RT.dirpr_library = "..";
  document.write('<script src="' + window.RT.dirpr_library + '/Core/RT-Style_make.js"><\/script>');
})();
