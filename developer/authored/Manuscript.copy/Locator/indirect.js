/*
  We have four scenarios

  immediate - used in the RT-Style distribution itself (authored, consummer, staged)
  direct - used in the RT-Style project itself, but not in the distribution
  indirect - the version all Harmony projects use
  URL_only - always pulls style through a URL, a webserver must be present
  
*/

window.RT = window.RT || {};

// --- Configuration ---
// Define the consumer project name to allow dynamic local file:// calculation.
window.RT.project_name = "Harmony"; 

// Fallback URL when served over a network where the project root is not in the URI.
window.RT.server_url = "http://localhost:8000/shared/linked-project/RT-Style/made/Manuscript";

(function() {
  let style_path = window.RT.server_url;

  if (window.RT.project_name) {
    const path = window.location.pathname;
    const project_root_index = path.indexOf('/' + window.RT.project_name + '/');
    
    if (project_root_index !== -1) {
      // substring(0, stop) extracts up to the project name, leaving off the trailing slash.
      // We append the explicit forward slash before navigating into the shared boundary.
      const absolute_project_root = path.substring(0, project_root_index + window.RT.project_name.length + 1);
      
      // The symlink 'RT-Style' already drops us inside the 'consumer/' directory, 
      // so we proceed directly to 'made/Manuscript'.
      style_path = absolute_project_root + "/shared/linked-project/RT-Style/made/Manuscript";
    } else {
      console.warn("RT-Style: Cannot locate project root '/" + window.RT.project_name + "/' in URI. Falling back to server_url.");
    }
  }
  
  window.RT.dirpr_library = style_path;
  
  // 1. Inject the loader script
  document.write('<script src="' + window.RT.dirpr_library + '/Core/loader.js"><\/script>');
  
  // 2. Inject the secondary script block for core dependencies
  document.write(
    '<script>' +
    'window.RT.load("Core/utility");' +
    'window.RT.load("Core/block_visibility_during_layout");' +
    'window.RT.load("Theme");' +
    'window.RT.load("Element/theme_selector");' +
    '<\/script>'
  );
})();
