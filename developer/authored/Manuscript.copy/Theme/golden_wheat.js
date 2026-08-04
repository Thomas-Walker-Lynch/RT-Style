// Theme/golden_wheat.js

(function(){

   if (!window.RT) {
    console.error("RT not defined - was RT-Manuscript_make run?");
    return;
  }

  // Prevent duplicate initialization
  if (window.RT.theme_library instanceof Set) {
    console.error("RT.theme_library missing,- was theme_make run?");
    return;
  }

  window.RT.theme_library['golden_wheat'] = {
    meta: {
      is_dark: false,
      name: "golden_wheat"
    },
    surface: {
      0: "oklch(0.95 0.02 90)",
      1: "oklch(0.92 0.02 90)",
      2: "oklch(0.97 0.01 90)",
      3: "oklch(0.99 0 0)",
      input: "oklch(0.94 0.01 90)",
      code: "oklch(0.90 0.02 90)",
      select: "oklch(0.85 0.05 25)"
    },
    content: {
      main: "oklch(0.20 0.02 25)",
      muted: "oklch(0.35 0.03 25)",
      subtle: "oklch(0.55 0.02 25)",
      inverse: "oklch(0.92 0.02 90)"
    },
    brand: {
      primary: "oklch(0.40 0.15 25)",
      secondary: "oklch(0.45 0.14 25)",
      tertiary: "oklch(0.50 0.12 25)",
      link: "oklch(0.40 0.16 25)"
    },
    border: {
      faint: "oklch(0.85 0.02 90)",
      regular: "oklch(0.75 0.03 90)",
      strong: "oklch(0.50 0.08 25)"
    },
    state: {
      success: "oklch(0.45 0.10 130)",
      warning: "oklch(0.55 0.15 45)",
      error: "oklch(0.45 0.15 25)",
      info: "oklch(0.50 0.12 240)"
    },
    syntax: {
      keyword: "oklch(0.45 0.15 25)",
      string: "oklch(0.40 0.10 130)",
      func: "oklch(0.45 0.12 35)",
      comment: "oklch(0.60 0.02 90)"
    },
    page: {
      width: "6.5in",
      min_height: "9in",
      padding: "0.5in 1in",
      margin: "20px auto",
      bg_color: "oklch(0.95 0.02 90)",
      border_color: "oklch(0.85 0.02 90)",
      text_color: "oklch(0.20 0.02 25)",
      shadow: "0 4px 15px rgba(0,0,0,0.1)"
    },
    custom_css: `
    RT-article p, RT-article li { text-shadow: 0px 0px 0.5px rgba(0,0,0, 0.2); }
    .MathJax, .MathJax_Display, .mjx-chtml {
        color: oklch(0.20 0.02 25) !important;
        fill: oklch(0.20 0.02 25) !important;
        stroke: oklch(0.20 0.02 25) !important;
    }
  `
  };

})();
