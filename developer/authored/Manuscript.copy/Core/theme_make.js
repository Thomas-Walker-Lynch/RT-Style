// 1. Establish the Generic Theme Dictionary
//  e.g. RT.theme( 'read', 'content_main')
// Establish the global theme library
window.RT.theme_library = window.RT.theme_library || {};

window.RT.theme = (function() {

  const dictionary = {
    meta: { is_dark: false, name: "" },
    surface: { 0: "", 1: "", 2: "", 3: "", input: "", code: "", select: "" },
    content: { main: "", muted: "", subtle: "", inverse: "" },
    brand: { primary: "", secondary: "", tertiary: "", link: "" },
    border: { faint: "", regular: "", strong: "" },
    state: { success: "", warning: "", error: "", info: "" },
    syntax: { keyword: "", string: "", func: "", comment: "" },
    page: { width: "", min_height: "", padding: "", margin: "", bg_color: "", border_color: "", text_color: "", shadow: "" },
    custom_css: ""
  };

  function resolve_path(path_array) {
    let current = dictionary;
    for (let i = 0; i < path_array.length - 1; i++) {
      const step = path_array[i];
      if (current[step] === undefined) return null;
      current = current[step];
    }
    return { container: current, key: path_array[path_array.length - 1] };
  }

  function apply_and_validate_theme(new_theme, fallback_color) {
    const debug = window.RT.Debug || { error: function(){} };

    // Pass 1: Walk the structure of the active dictionary
    function walk_current(curr, source, path) {
      for (const key in curr) {
        const current_path = path ? path + "." + key : key;
        if (typeof curr[key] === 'object' && curr[key] !== null) {
          walk_current(curr[key], source[key] || {}, current_path);
        } else {
          if (source[key] !== undefined && source[key] !== "") {
            curr[key] = source[key];
          } else {
            debug.error('theme', `Missing key in loaded theme: ${current_path}. Assigning fallback.`);
            curr[key] = fallback_color;
          }
        }
      }
    }

    // Pass 2: Walk the structure of the incoming theme dictionary
    function walk_new(source, curr, path) {
      for (const key in source) {
        const current_path = path ? path + "." + key : key;
        if (typeof source[key] === 'object' && source[key] !== null) {
          if (curr[key] === undefined) {
            debug.error('theme', `Unexpected structure in loaded theme: ${current_path} is an object.`);
          } else {
            walk_new(source[key], curr[key] || {}, current_path);
          }
        } else {
          if (curr[key] === undefined) {
            debug.error('theme', `Unexpected key in loaded theme: ${current_path}.`);
          }
        }
      }
    }

    walk_current(dictionary, new_theme, "");
    walk_new(new_theme, dictionary, "");
  }

  return function(command, ...args) {
    if (command === 'read') {
      const target = resolve_path(args);
      return (target && target.container.hasOwnProperty(target.key)) ? target.container[target.key] : null;
    } 
    
    if (command === 'write') {
      if (args.length < 2) return;
      const value = args.pop();
      const target = resolve_path(args);
      if (target && target.container.hasOwnProperty(target.key)) {
        target.container[target.key] = value;
      }
      return;
    }

    if (command === 'load') {
      const theme_name = args[0];
      const fallback = args[1] || "#FF00FF";

      if (!window.RT.theme_library.hasOwnProperty(theme_name)) {
        window.RT.Debug.error('theme', `Load aborted: Theme '${theme_name}' is not in the theme_library.`);
        return false;
      }

      apply_and_validate_theme(window.RT.theme_library[theme_name], fallback);
      
      // --- CSS Fallback for Pseudo-Elements and External Libraries ---
      let style_el = document.getElementById('rt-theme-custom-css');
      if (!style_el) {
        style_el = document.createElement('style');
        style_el.id = 'rt-theme-custom-css';
        document.head.appendChild(style_el);
      }
      // Write the string if it exists, otherwise clear the block
      style_el.textContent = dictionary.custom_css || '';
      
      return true;
    }

    window.RT.Debug.error('theme', 'Invalid command passed to theme dictionary: ' + command);
  };
})();
