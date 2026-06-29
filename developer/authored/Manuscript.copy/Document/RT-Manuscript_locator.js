/*
  immediate.js

  There are 4 variations for RT-Manuscript-locator.js:

  URL_only - used by websites
  indirect - used by Harmony projects, except for RT-Manuscript

  immediate - used by RT-Manuscript in the distribution (authored, consummer, staged)
  direct - used by RT-Manuscript project outside of the distribution, e.g. the main document directory
*/

window.RT = window.RT || {};

(function() {
  window.RT.dirpr_library = "..";
  document.write(
      '<script src="'
      + window.RT.dirpr_library
      + '/Core/RT-Manuscript_make.js"'
      + '><\/script>'
  );
})();
