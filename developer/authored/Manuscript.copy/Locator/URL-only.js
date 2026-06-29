/*
    URL_only.js

  We have four scenarios

  immediate - used in the RT-Style distribution itself (authored, consumer, staged)
  direct - used in the RT-Style project itself, but not in the distribution
  indirect - the version all Harmony projects use
  URL-only - always pulls style through a URL, a webserver must be present
*/

window.RT = window.RT || {};

(function() {
  window.RT.dirpr_library = "https://style.ReasoningTechnology.com/Manuscript"; // Production URL
  
  document.write(
      '<script src="'
      + window.RT.dirpr_library
      + '/Core/RT-Manuscript_make.js"'
      + '><\/script>'
  );

})();
