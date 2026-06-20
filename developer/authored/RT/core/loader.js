window.RT = window.RT || {};

window.RT.load = function(module_path){
  let target_module = module_path;

  if(target_module === 'theme'){
    let saved_theme = localStorage.getItem('RT_theme_preference');
    if(!saved_theme){
      saved_theme = 'dark_gold';
      localStorage.setItem('RT_theme_preference', saved_theme);
    }
    target_module = 'theme/' + saved_theme;
  }

  let resolved_path = window.RT.dirpr_library + '/' + target_module;

  if(!resolved_path.endsWith('.js')){
    resolved_path = resolved_path + '.js';
  }

  document.write('<script src="' + resolved_path + '"></script>');
};
