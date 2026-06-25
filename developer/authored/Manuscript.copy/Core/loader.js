window.RT = window.RT || {};

// 1. Establish the module registry
window.RT._loaded_modules = window.RT._loaded_modules || new Set();

window.RT.load = function(module_path){
  let target_module = module_path;

  // Strict enforcement of the PascalCase namespace
  if (target_module === 'Theme') {
    let saved_theme = localStorage.getItem('RT·theme_preference');
    if (!saved_theme) {
      saved_theme = 'dark_gold';
      localStorage.setItem('RT·theme_preference', saved_theme);
    }
    target_module = 'Theme/' + saved_theme;
  }

  // 2. The Idempotency Check: Abort if already loaded
  if (window.RT._loaded_modules.has(target_module)) {
    return; 
  }
  
  // 3. Register the module
  window.RT._loaded_modules.add(target_module);

  let resolved_path = window.RT.dirpr_library + '/' + target_module;

  if (!resolved_path.endsWith('.js')) {
    resolved_path = resolved_path + '.js';
  }

  document.write('<script src="' + resolved_path + '"></script>');
};
