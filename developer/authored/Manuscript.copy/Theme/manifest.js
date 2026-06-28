// Theme/manifest.js

window.RT = window.RT || {};

(function() {
  const themes = [
    'inverse_wheat',
    'golden_wheat',
    'wheat'
  ];

  themes.forEach(theme_name => {
    window.RT.load('Theme/' + theme_name);
  });
})();

