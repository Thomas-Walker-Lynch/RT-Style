/*
  Theme: Classic Wheat (Light)
  Standard: Theme 1.0
  Description: Warm paper tones with Burnt Orange accents.
*/
( function(){
  const RT = window.RT = window.RT || {};
  
  RT.theme_light = function(){
    RT.config = RT.config || {};
    
    // THEME 1.0 DATA CONTRACT
    RT.config.theme = {
       meta_is_dark: false
      ,meta_name:    "Classic Wheat"

      // --- SURFACES ---
      ,surface_0:       "hsl(40, 30%, 94%)"   // App Background (Cream/Linen)
      ,surface_1:       "hsl(40, 25%, 90%)"   // Sidebar (Slightly darker beige)
      ,surface_2:       "hsl(40, 20%, 98%)"   // Cards (Lighter, almost white)
      ,surface_3:       "hsl(0, 0%, 100%)"    // Modals (Pure White)
      ,surface_input:   "hsl(40, 20%, 98%)"   // Form Inputs
      ,surface_code:    "hsl(40, 15%, 90%)"   // Code Block Background
      ,surface_select:  "hsl(45, 100%, 85%)"  // Text Selection Highlight

      // --- CONTENT ---
      ,content_main:    "hsl(30, 20%, 20%)"   // Deep Umber (Not Black)
      ,content_muted:   "hsl(30, 15%, 45%)"   // Medium Brown
      ,content_subtle:  "hsl(30, 10%, 65%)"   // Light Brown/Gray
      ,content_inverse: "hsl(40, 30%, 94%)"   // Text on dark buttons

      // --- BRAND & ACTION ---
      ,brand_primary:   "hsl(30, 90%, 35%)"   // Burnt Orange (Action)
      ,brand_secondary: "hsl(35, 70%, 45%)"   // Rust / Gold
      ,brand_tertiary:  "hsl(25, 60%, 55%)"   // Copper
      ,brand_link:      "hsl(30, 100%, 35%)"  // Link Color

      // --- BORDERS ---
      ,border_faint:    "hsl(35, 20%, 85%)"
      ,border_default:  "hsl(35, 20%, 75%)"
      ,border_strong:   "hsl(35, 20%, 55%)"

      // --- STATE & FEEDBACK ---
      ,state_success:   "hsl(100, 40%, 40%)"  // Forest Green
      ,state_warning:   "hsl(30, 90%, 50%)"   // Persimmon
      ,state_error:     "hsl(0, 60%, 45%)"    // Crimson
      ,state_info:      "hsl(200, 50%, 45%)"  // Navy Blue

      // --- SYNTAX ---
      ,syntax_keyword:  "hsl(20, 90%, 45%)"   // Rust
      ,syntax_string:   "hsl(100, 35%, 35%)"  // Ivy Green
      ,syntax_func:     "hsl(300, 30%, 40%)"  // Muted Purple
      ,syntax_comment:  "hsl(35, 10%, 60%)"   // Light Brown
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
  };
} )();
