/*
  Theme: Inverse Wheat (Dark)
  Standard: Theme 1.0
  Description: High contrast Amber on Deep Charcoal.
*/
( function(){
  const RT = window.StyleRT = window.StyleRT || {};
  
  RT.theme = function(){
    RT.config = RT.config || {};
    
    // THEME 1.0 DATA CONTRACT
    RT.config.theme = {
       meta_is_dark: true
      ,meta_name:    "Inverse Wheat"

      // --- SURFACES (Depth & Container Hierarchy) ---
      ,surface_0:       "hsl(0, 0%, 5%)"      // App Background (Deepest)
      ,surface_1:       "hsl(0, 0%, 10%)"     // Sidebar / Nav / Panels
      ,surface_2:       "hsl(0, 0%, 14%)"     // Cards / Floating Elements
      ,surface_3:       "hsl(0, 0%, 18%)"     // Modals / Dropdowns / Popovers
      ,surface_input:   "hsl(0, 0%, 12%)"     // Form Inputs
      ,surface_code:    "hsl(0, 0%, 11%)"     // Code Block Background
      ,surface_select:  "hsl(45, 100%, 15%)"  // Text Selection Highlight

      // --- CONTENT (Text & Icons) ---
      ,content_main:    "hsl(50, 60%, 85%)"   // Primary Reading Text
      ,content_muted:   "hsl(36, 15%, 60%)"   // Metadata, subtitles
      ,content_subtle:  "hsl(36, 10%, 40%)"   // Placeholders, disabled states
      ,content_inverse: "hsl(0, 0%, 5%)"      // Text on high-contrast buttons

      // --- BRAND & ACTION (The "Wheat" Identity) ---
      ,brand_primary:   "hsl(45, 100%, 50%)"  // Main Action / H1 / Focus Ring
      ,brand_secondary: "hsl(38, 90%, 65%)"   // Secondary Buttons / H2
      ,brand_tertiary:  "hsl(30, 60%, 70%)"   // Accents / H3
      ,brand_link:      "hsl(48, 100%, 50%)"  // Hyperlinks (High Visibility)

      // --- BORDERS & DIVIDERS ---
      ,border_faint:    "hsl(36, 20%, 15%)"   // Subtle separation
      ,border_default:  "hsl(36, 20%, 25%)"   // Standard Card Borders
      ,border_strong:   "hsl(36, 20%, 40%)"   // Active states / Inputs

      // --- STATE & FEEDBACK (Earth Tones) ---
      ,state_success:   "hsl(100, 50%, 45%)"  // Olive Green
      ,state_warning:   "hsl(35, 90%, 55%)"   // Burnt Orange
      ,state_error:     "hsl(0, 60%, 55%)"    // Brick Red
      ,state_info:      "hsl(200, 40%, 55%)"  // Slate Blue

      // --- SYNTAX HIGHLIGHTING (For Code) ---
      ,syntax_keyword:  "hsl(35, 100%, 65%)"  // Orange
      ,syntax_string:   "hsl(75, 50%, 60%)"   // Sage Green
      ,syntax_func:     "hsl(45, 90%, 70%)"   // Light Gold
      ,syntax_comment:  "hsl(36, 15%, 45%)"   // Brown/Gray
    };

    // --- APPLY THEME ---
    const palette = RT.config.theme;
    const body = document.body;
    const html = document.documentElement;

    // 1. Paint Base
    html.style.backgroundColor = palette.surface_0;
    body.style.backgroundColor = palette.surface_0;
    body.style.color = palette.content_main;

    // 2. Export Variables (Standardization)
    const s = body.style;
    for (const [key, value] of Object.entries(palette)) {
      s.setProperty(`--rt-${key.replace(/_/g, '-')}`, value);
    }
    
    // 3. Global Overrides
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
      `;
      document.head.appendChild(style);
    }
  };
  
} )();
