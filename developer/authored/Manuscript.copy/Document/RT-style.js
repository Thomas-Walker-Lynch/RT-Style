// for documents in RT-style/Manuscript/document
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
