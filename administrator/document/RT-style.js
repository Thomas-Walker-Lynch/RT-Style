// RT-style.js (Internal RT-style project router)
window.RT = window.RT || {};

(function() {
  const project_name = "RT-style"; 
  const path = window.location.pathname;
  const project_root_index = path.indexOf('/' + project_name + '/');
  
  if (project_root_index !== -1) {
    // substring(0, x) excludes the trailing slash. We must prepend it to the payload.
    const absolute_project_root = path.substring(0, project_root_index + project_name.length + 1);
    window.RT.dirpr_library = absolute_project_root + "/consumer/made/Manuscript";
  } else {
    // Fallback for when served via local Python HTTP daemon from the project root
    window.RT.dirpr_library = "../consumer/made/Manuscript";
  }
  
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
