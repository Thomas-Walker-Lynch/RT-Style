/*
  direct.js


  We have four scenarios

  immediate - used in the RT-style distribution itself (authored, consummer, staged)
  direct - used in the RT-style project itself, but not in the distribution
  indirect - the version all Harmony projects use
  URL_only - always pulls style through a URL, a webserver must be present
  
*/

window.RT = window.RT || {};

(function() {
  const project_name = "RT-Style"; 
  const path = window.location.pathname;
  const project_root_index = path.indexOf('/' + project_name + '/');
  
  if (project_root_index !== -1) {
    // substring(0, x) excludes the trailing slash. We must prepend it to the payload.
    const absolute_project_root = path.substring(0, project_root_index + project_name.length + 1);
    window.RT.dirpr_library = absolute_project_root + "/consumer/Manuscript";
  } else {
    // Fallback for when served via local Python HTTP daemon from the project root
    window.RT.dirpr_library = "../consumer/made/Manuscript";
  }
  
  document.write('<script src="' + window.RT.dirpr_library + '/Core/loader.js"><\/script>');

})();
