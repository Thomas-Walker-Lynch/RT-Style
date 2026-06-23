/*
  We have four scenarios

  immediate - used in the RT-style distribution itself (authored, consummer, staged)
  direct - used in the RT-style project itself, but not in the distribution
  indirect - the version all Harmony projects use
  URL_only - always pulls style through a URL, a webserver must be present

*/

window.RT = window.RT || {};

(function() {
  // We are the style library, so ...
  window.RT.dirpr_library = "..";
  
  // 1. Inject the loader script
  document.write('<script src="' + window.RT.dirpr_library + '/Core/loader.js"><\/script>');
  
  // 2. Inject a secondary script block for the core dependencies
  document.write(
    '<script>' +
    'window.RT.load("Core/utility");' +
    'window.RT.load("Core/block_visibility_during_layout");' +
    'window.RT.load("Theme");' +
    'window.RT.load("Element/theme_selector");' +
    '<\/script>'
  );
})();
