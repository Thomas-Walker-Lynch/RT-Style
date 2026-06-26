/*
  Theme: Golden Wheat (Light) - "Spanish Gold Edition"
  Standard: Theme 1.0
  Description: Light Parchment background with Oxblood Red ink.
*/
(function(){
  const RT = window.RT = window.RT || {};
  
  RT.theme = function(){
    const dictionary = {
       meta_is_dark: false
      ,meta_name:    "Golden Wheat (Yellow)"

      // --- SURFACES ---
      ,surface_0:       "oklch(0.95 0.02 90)"
      ,surface_1:       "oklch(0.92 0.02 90)"
      ,surface_2:       "oklch(0.97 0.01 90)"
      ,surface_3:       "oklch(0.99 0 0)"
      ,surface_input:   "oklch(0.94 0.01 90)"
      ,surface_code:    "oklch(0.90 0.02 90)"
      ,surface_select:  "oklch(0.85 0.05 25)"

      // --- CONTENT ---
      ,content_main:    "oklch(0.20 0.02 25)"
      ,content_muted:   "oklch(0.35 0.03 25)"
      ,content_subtle:  "oklch(0.55 0.02 25)"
      ,content_inverse: "oklch(0.92 0.02 90)"

      // --- BRAND & ACTION ---
      ,brand_primary:   "oklch(0.40 0.15 25)"
      ,brand_secondary: "oklch(0.45 0.14 25)"
      ,brand_tertiary:  "oklch(0.50 0.12 25)"
      ,brand_link:      "oklch(0.40 0.16 25)"

      // --- BORDERS ---
      ,border_faint:    "oklch(0.85 0.02 90)"
      ,border_default:  "oklch(0.75 0.03 90)"
      ,border_strong:   "oklch(0.50 0.08 25)"

      // --- STATE & FEEDBACK ---
      ,state_success:   "oklch(0.45 0.10 130)"
      ,state_warning:   "oklch(0.55 0.15 45)"
      ,state_error:     "oklch(0.45 0.15 25)"
      ,state_info:      "oklch(0.50 0.12 240)"

      // --- SYNTAX ---
      ,syntax_keyword:  "oklch(0.45 0.15 25)"
      ,syntax_string:   "oklch(0.40 0.10 130)"
      ,syntax_func:     "oklch(0.45 0.12 35)"
      ,syntax_comment:  "oklch(0.60 0.02 90)"
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
      
      const [select_bg, select_fg, scroll_bg, scroll_thumb, scroll_hover, content_main] = 
        window.RT.theme('read', 'surface_select', 'brand_primary', 'surface_0', 'border_default', 'brand_secondary', 'content_main');

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

        rt-article p, rt-article li {
           text-shadow: 0px 0px 0.5px rgba(0,0,0, 0.2);
        }

        .MathJax, .MathJax_Display, .mjx-chtml {
            color: ${content_main} !important;
            fill: ${content_main} !important;
            stroke: ${content_main} !important;
        }
      `;
      document.head.appendChild(style);
    }
  };
})();
