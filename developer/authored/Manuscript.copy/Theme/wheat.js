// Theme/wheat.js

window.RT = window.RT || {};
window.RT.theme_library = window.RT.theme_library || {};

window.RT.theme_library['wheat'] = {
  meta: {
    is_dark: false,
    name: "Classic Wheat"
  },
  surface: {
    0: "oklch(0.95 0.02 80)",
    1: "oklch(0.92 0.02 80)",
    2: "oklch(0.97 0.01 80)",
    3: "oklch(0.99 0 0)",
    input: "oklch(0.96 0.01 80)",
    code: "oklch(0.92 0.01 80)",
    select: "oklch(0.88 0.06 80)"
  },
  content: {
    main: "oklch(0.25 0.02 60)",
    muted: "oklch(0.45 0.03 60)",
    subtle: "oklch(0.65 0.02 60)",
    inverse: "oklch(0.94 0.02 80)"
  },
  brand: {
    primary: "oklch(0.50 0.15 50)",
    secondary: "oklch(0.55 0.12 60)",
    tertiary: "oklch(0.60 0.10 45)",
    link: "oklch(0.50 0.16 50)"
  },
  border: {
    faint: "oklch(0.85 0.02 80)",
    regular: "oklch(0.75 0.02 80)",
    strong: "oklch(0.55 0.04 80)"
  },
  state: {
    success: "oklch(0.50 0.10 130)",
    warning: "oklch(0.60 0.15 50)",
    error: "oklch(0.50 0.15 25)",
    info: "oklch(0.55 0.10 240)"
  },
  syntax: {
    keyword: "oklch(0.50 0.14 50)",
    string: "oklch(0.45 0.10 130)",
    func: "oklch(0.50 0.10 320)",
    comment: "oklch(0.65 0.02 80)"
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
};
