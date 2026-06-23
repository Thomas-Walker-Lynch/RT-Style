// RT-style_url_only.js
window.RT = window.RT || {};

(function() {
  window.RT.dirpr_library = "https://style.ReasoningTechnology.com/Manuscript"; // Production URL
  
  document.write('<script src="' + window.RT.dirpr_library + '/Core/loader.js"><\/script>');
  document.write(
    '<script>' +
    'window.RT.load("Core/utility");' +
    'window.RT.load("Core/block_visibility_during_layout");' +
    'window.RT.load("Theme");' +
    'window.RT.load("Element/theme_selector");' +
    '<\/script>'
  );
})();
