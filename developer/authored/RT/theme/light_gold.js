/*
  Theme: Golden Wheat (Light) - "Spanish Gold Edition"
  File: style/theme-light-gold.js
  Standard: Theme 1.0
  Description: Light Parchment background with Oxblood Red ink.
*/
( function(){
  const RT = window.RT = window.RT || {};
  
  RT.theme = function(){
    RT.config = RT.config || {};
    
    RT.config.theme = {
       meta_is_dark: false
      ,meta_name:    "Golden Wheat (Yellow)"

      // --- SURFACES (Light Parchment) ---
      // Shifted lightness up to 94% for a "whiter" feel that still holds the yellow tint.
      ,surface_0:       "hsl(48, 50%, 94%)"   // Main Page: Fine Parchment
      ,surface_1:       "hsl(48, 40%, 90%)"   // Panels: Slightly darker
      ,surface_2:       "hsl(48, 30%, 97%)"   // Cards: Very light
      ,surface_3:       "hsl(0, 0%, 100%)"    // Popups
      ,surface_input:   "hsl(48, 20%, 96%)"   
      ,surface_code:    "hsl(48, 25%, 88%)"   // Distinct Code BG
      ,surface_select:  "hsl(10, 70%, 85%)"   // Red Highlight

      // --- CONTENT (Deep Ink) ---
      ,content_main:    "hsl(10, 25%, 7%)"    // Deep Warm Black (Ink)
      ,content_muted:   "hsl(10, 15%, 35%)"   // Dark Grey-Red
      ,content_subtle:  "hsl(10, 10%, 55%)"   
      ,content_inverse: "hsl(48, 50%, 90%)"   

      // --- BRAND & ACTION (The Red Spectrum) ---
      ,brand_primary:   "hsl(12, 85%, 30%)"   // H1 (Deep Oxblood)
      ,brand_secondary: "hsl(10, 80%, 35%)"   // H2 (Garnet)
      ,brand_tertiary:  "hsl(8, 70%, 40%)"    // H3 (Brick)
      ,brand_link:      "hsl(12, 90%, 35%)"   // Link

      // --- BORDERS ---
      ,border_faint:    "hsl(45, 30%, 80%)"
      ,border_default:  "hsl(45, 30%, 70%)"   // Pencil Grey
      ,border_strong:   "hsl(12, 50%, 40%)"   

      // --- STATE ---
      ,state_success:   "hsl(120, 40%, 30%)"  
      ,state_warning:   "hsl(25, 90%, 45%)"   
      ,state_error:     "hsl(0, 75%, 35%)"    
      ,state_info:      "hsl(210, 60%, 40%)"  

      // --- SYNTAX ---
      ,syntax_keyword:  "hsl(0, 75%, 35%)"    
      ,syntax_string:   "hsl(100, 35%, 25%)"  
      ,syntax_func:     "hsl(15, 85%, 35%)"   
      ,syntax_comment:  "hsl(45, 20%, 50%)"   
    };

    // --- APPLY THEME ---
    const palette = RT.config.theme;
    const body = document.body;
    const html = document.documentElement;

    html.style.backgroundColor = palette.surface_0;
    body.style.backgroundColor = palette.surface_0;
    body.style.color = palette.content_main;

    const s = body.style;
    for (const [key, value] of Object.entries(palette)) {
      s.setProperty(`--rt-${key.replace(/_/g, '-')}`, value);
    }
    
    // Global overrides
    const style_id = 'rt-global-overrides';
    if (!document.getElementById(style_id)) {
      const style = document.createElement('style');
      style.id = style_id;
      style.textContent = `
        ::selection { background: var(--rt-surface-select); color: var(--rt-brand-primary); }
        ::-moz-selection { background: var(--rt-surface-select); color: var(--rt-brand-primary); }
        
        ::-webkit-scrollbar { width: 12px; }
        ::-webkit-scrollbar-track { background: var(--rt-surface-0); }
        ::-webkit-scrollbar-thumb { 
           background: var(--rt-border-default); 
           border: 2px solid var(--rt-surface-0);
           border-radius: 8px; 
        }
        ::-webkit-scrollbar-thumb:hover { background: var(--rt-brand-secondary); }

        rt-article p, rt-article li {
           text-shadow: 0px 0px 0.5px rgba(0,0,0, 0.2); 
        }

        .MathJax, .MathJax_Display, .mjx-chtml {
            color: var(--rt-content-main) !important;
            fill: var(--rt-content-main) !important;
            stroke: var(--rt-content-main) !important;
        }
      `;
      document.head.appendChild(style);
    }
  };
  
} )();
