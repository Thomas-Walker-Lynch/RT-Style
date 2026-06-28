// Theme/inverse_wheat.js

window.RT = window.RT || {};
window.RT.theme_library = window.RT.theme_library || {};

window.RT.theme_library['inverse_wheat'] = {
  meta: {
    is_dark: true,
    name: "Inverse Wheat"
  },
  surface: {
    0: "oklch(0.15 0 0)",
    1: "oklch(0.18 0 0)",
    2: "oklch(0.21 0 0)",
    3: "oklch(0.24 0 0)",
    input: "oklch(0.19 0 0)",
    code: "oklch(0.17 0 0)",
    select: "oklch(0.30 0.05 80)"
  },
  content: {
    main: "oklch(0.85 0.05 90)",
    muted: "oklch(0.70 0.03 90)",
    subtle: "oklch(0.50 0.02 90)",
    inverse: "oklch(0.15 0 0)"
  },
  brand: {
    primary: "oklch(0.75 0.15 80)",
    secondary: "oklch(0.65 0.12 70)",
    tertiary: "oklch(0.60 0.10 60)",
    link: "oklch(0.75 0.15 85)"
  },
  border: {
    faint: "oklch(0.25 0.01 90)",
    regular: "oklch(0.35 0.02 90)",
    strong: "oklch(0.45 0.03 90)"
  },
  state: {
    success: "oklch(0.60 0.12 130)",
    warning: "oklch(0.65 0.15 50)",
    error: "oklch(0.55 0.15 25)",
    info: "oklch(0.60 0.10 240)"
  },
  syntax: {
    keyword: "oklch(0.70 0.15 50)",
    string: "oklch(0.75 0.10 130)",
    func: "oklch(0.80 0.12 85)",
    comment: "oklch(0.55 0.02 90)"
  },
  custom_css: `
    img.rt-diagram { filter: invert(1) hue-rotate(180deg); }
  `
};
