/*
  Layout/article_tech_ref.js
  Applies base technical document styling in Phase 1, 
  and applies structural page wrappers in Phase 3.
*/

(function(){

   if (!window.RT) {
    console.error("RT not defined - was RT-Manuscript_make run?");
    return;
  }

  // 1. The Explicit Element Roster 
  const required_elements = [
    'chapter'
    ,'code'
    ,'endnote'
    ,'math'
    ,'term'
    ,'title'
    ,'TOC'
  ];

  // Shared utility functions
  const t = function(...path) { return window.RT.theme('read', ...path); };

  const apply = function(selector, rules) {
    document.querySelectorAll(selector).forEach(el => {
      for (let p in rules) {
        if (typeof rules[p] === 'string' && rules[p].includes('!important')) {
          el.style.setProperty(p.replace(/[A-Z]/g, m => "-" + m.toLowerCase()), rules[p].replace(' !important', ''), 'important');
        } else {
          el.style[p] = rules[p];
        }
      }
    });
  };

  // =========================================================
  // Phase 1: Base Element & Article Styling
  // =========================================================
  function apply_base_styles() {
    const surface_0 = t('surface', '0');
    const surface_code = t('surface', 'code');
    const content_main = t('content', 'main');
    const brand_primary = t('brand', 'primary');
    const brand_secondary = t('brand', 'secondary');
    const brand_tertiary = t('brand', 'tertiary');
    const is_dark = t('meta', 'is_dark');

    const font_weight = is_dark === false ? "600" : "400";

    // Apply base geometry
    apply('body, html, RT·article', { overflowAnchor: "none !important" });
    apply('RT·article', {
      display: "block",
      fontFamily: "'Noto Sans JP', Arial, sans-serif",
      fontSize: "16px",
      lineHeight: "1.8",
      fontWeight: font_weight,
      maxWidth: "46.875rem !important",
      margin: "0 auto",
      backgroundColor: surface_0,
      color: content_main,
      boxSizing: "border-box !important"
    });
    
    // Default padding if pagination fails or is bypassed
    apply('RT·article:not(:has(RT·page))', { padding: "3rem !important" });

    // Apply specific element scales
    const element_styles = [
      [ 'RT·article h1', { 
          fontSize:   "1.5rem", 
          textAlign:  "center", 
          color:      brand_primary, 
          fontWeight: "500", 
          marginTop:  "1.5rem", 
          lineHeight: "1.15" 
      }],
      
      [ 'RT·article h2', { 
          fontSize:   "1.25rem", 
          color:      brand_secondary, 
          textAlign:  "left", 
          marginTop:  "2rem", 
          marginLeft: "0" 
      }],
      
      [ 'RT·article h3', { 
          fontSize:   "1.125rem", 
          color:      brand_tertiary, 
          textAlign:  "left", 
          marginTop:  "1.5rem", 
          marginLeft: "4ch" 
      }],
      
      [ 'RT·article h4', { 
          fontSize:   "1.05rem", 
          color:      content_main, 
          fontWeight: "600", 
          textAlign:  "left", 
          marginTop:  "1.25rem", 
          marginLeft: "8ch" 
      }],
      
      [ 'RT·article p, RT·article ul, RT·article ol', { 
          color:        content_main, 
          textAlign:    "justify", 
          marginBottom: "1rem", 
          marginLeft:   "0" 
      }],
      
      [ 'RT·article li', { 
          marginBottom: "0.5rem" 
      }],
      
      [ 'RT·article RT·code', { 
          fontFamily:      "'Courier New', Courier, monospace", 
          backgroundColor: surface_code, 
          padding:         "0.125rem 0.25rem", 
          color:           content_main 
      }],
      
      [ 'RT·article img', { 
          maxWidth: "100%", 
          height:   "auto", 
          display:  "block", 
          margin:   "1.5rem auto" 
      }],

      [ 'RT·article table', { 
          width: "100%", 
          borderCollapse: "collapse", 
          marginBottom: "1.5rem" 
      }],
      
      [ 'RT·article th, RT·article td', { 
          verticalAlign: "top", 
          padding: "0.75rem 1rem 0.75rem 0", 
          textAlign: "left" 
      }]

    ];

    element_styles.forEach(rule => apply(rule[0], rule[1]));
  }

  // =========================================================
  // Phase 3: Post-Pagination Styling
  // =========================================================
  function apply_page_styles() {
    const surface_0 = t('surface', '0');
    const brand_primary = t('brand', 'primary');

    // Strip internal padding so the pages can dictate the margin/padding layout
    apply('RT·article:has(RT·page)', { padding: "0 !important" });
    
    // Style the actual page wrappers
    apply('RT·article RT·page', {
      position: "relative", 
      display: "block", 
      padding: "3rem",
      margin: "1.25rem auto", 
      backgroundColor: surface_0,
      boxShadow: `0 0 0.625rem ${brand_primary}`
    });
  }

  //----------------------------------------
  // Registration upon load
  //
  
  // Load the element files
  required_elements.forEach(name => RT.load('Element/' + name));

  if (RT.Element && RT.PageStyle) {
    RT.Element.add(apply_base_styles);
    RT.PageStyle.add(apply_page_styles);
  } else {
    console.error("RT.Element or RT.PageStyle not defined, was the stage_manager run?");
  }

})();
