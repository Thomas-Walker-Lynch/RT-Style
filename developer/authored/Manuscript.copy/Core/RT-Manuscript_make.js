/*
  Core/RT-Manuscript_make.js

  Bootstrap. Establishes the module registry and the loader ,then requests the
  rest of the system.

  RT.load emits a script tag with document.write ,so a requested file does not
  run until the current file has finished. Everything here must therefore be
  self contained: a service this file needs cannot be one this file loads.
  Shared services accordingly live in Core/utility ,which is requested first so
  that every file after it may rely on RT.Debug existing.

  RT.load works only while the document is parsing. Called after load it writes
  into a closed stream and destroys the document.
*/

window.RT = window.RT || {};
window.RT.Module = window.RT.Module || new Set();

window.RT.load = function(module_path){
  const key = module_path.endsWith('.js') ? module_path : module_path + '.js';
  if(window.RT.Module.has(key)) return;
  window.RT.Module.add(key);
  document.write('<script src="' + window.RT.dirpr_library + '/' + key + '"></script>');
};

// Shared services first ,so RT.Debug exists for everything below.
window.RT.load('Core/utility');

window.RT.load('Core/stage_manager');
window.RT.load('Core/theme_make');
window.RT.load('Theme/manifest');
window.RT.load('Layout/counter');
window.RT.load('Layout/note');
