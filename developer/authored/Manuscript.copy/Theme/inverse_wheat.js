/*
  Theme: Inverse Wheat (Dark)
  Standard: Theme 1.0
  Description: High contrast Amber on Deep Charcoal.
*/
(function(){
  const RT = window.RT = window.RT || {};
  
  RT.theme = function(){
    const dictionary = {
       meta_is_dark: true
      ,meta_name:    "Inverse Wheat"

      // --- SURFACES ---
      ,surface_0:       "oklch(0.15 0 0)"
      ,surface_1:       "oklch(0.18 0 0)"
      ,surface_2:       "oklch(0.21 0 0)"
      ,surface_3:       "oklch(0.24 0 0)"
      ,surface_input:   "oklch(0.19 0 0)"
      ,surface_code:    "oklch(0.17 0 0)"
      ,surface_select:  "oklch(0.30 0.05 80)"

      // --- CONTENT ---
      ,content_main:    "oklch(0.85 0.05 90)"
      ,content_muted:   "oklch(0.70 0.03 90)"
      ,content_subtle:  "oklch(0.50 0.02 90)"
      ,content_inverse: "oklch(0.15 0 0)"

      // --- BRAND & ACTION ---
      ,brand_primary:   "oklch(0.75 0.15 80)"
      ,brand_secondary: "oklch(0.65 0.12 70)"
      ,brand_tertiary:  "oklch(0.60 0.10 60)"
      ,brand_link:      "oklch(0.75 0.15 85)"

      // --- BORDERS ---
      ,border_faint:    "oklch(0.25 0.01 90)"
      ,border_default:  "oklch(0.35 0.02 90)"
      ,border_strong:   "oklch(0.45 0.03 90)"

      // --- STATE & FEEDBACK ---
      ,state_success:   "oklch(0.60 0.12 130)"
      ,state_warning:   "oklch(0.65 0.15 50)"
      ,state_error:     "oklch(0.55 0.15 25)"
      ,state_info:      "oklch(0.60 0.10 240)"

      // --- SYNTAX ---
      ,syntax_keyword:  "oklch(0.70 0.15 50)"
      ,syntax_string:   "oklch(0.75 0.10 130)"
      ,syntax_func:     "oklch(0.80 0.12 85)"
      ,syntax_comment:  "oklch(0.55 0.02 90)"
    };

    // 1. Populate the Dictionary
    for (const [key, value] of Object.entries(dictionary)) {
      window.RT.theme('write', key, value);
    }

    // 2. Structural Safety Net
    if (!window.RT.theme('is_defined')) {
      window.RT.debug.error('theme', `Theme '${dictionary.meta_name}' failed structural completeness check. Missing keys detected.`);
    }

    // 3. Global Pseudo Elements
    const style_id = 'rt-global-overrides';
    if (!document.getElementById(style_id)) {
      const style = document.createElement('style');
      style.id = style_id;
      
      const [select_bg, select_fg, scroll_bg, scroll_thumb, scroll_hover] = 
        window.RT.theme('read', 'surface_select', 'brand_primary', 'surface_0', 'border_default', 'brand_secondary');

      style.textContent = `
        ::selection { background: ${select_bg}; color: ${select_fg}; }
        ::-moz-selection { background: ${select_bg}; color: ${select_fg}; }
        
        ::-webkit-scrollbar { width: 12px; }
        ::-webkit-scrollbar-track { background: ${scroll_bg}; }
        ::-webkit-scrollbar-thumb { 
           background: ${scroll_thumb};
           border: 2px solid ${scroll_bg};
           border-radius: 8px; 
        }
        ::-webkit-scrollbar-thumb:hover { background: ${scroll_hover}; }

        img.rt-diagram { filter: invert(1) hue-rotate(180deg); }
      `;
      document.head.appendChild(style);
    }
  };
})();
