window.StyleRT = window.StyleRT || {};

window.StyleRT.include = function(path_identifier){
  let parts_seq = path_identifier.split('/');
  let namespace = parts_seq[0];
  
  let module_path = parts_seq.slice(1).join('/');

  if(module_path === 'theme'){
    let saved_theme = localStorage.getItem('RT_theme_preference');
    if(!saved_theme){
      saved_theme = 'dark_gold';
      localStorage.setItem('RT_theme_preference' ,saved_theme);
    }
    module_path = 'theme/' + saved_theme;
  }

  let base_path = window.StyleRT_namespaces[namespace];
  if(!base_path){
    console.error("Namespace not found: " + namespace);
    return;
  }

  let full_path = base_path + '/' + module_path + '.js';
  // FIXED: No backslashes in the closing script tag
  document.write('<script src="' + full_path + '"></script>');
};
