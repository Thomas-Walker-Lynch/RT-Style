// Theme/inverse_wheat.js

window.RT = window.RT || {};
window.RT.theme_library = window.RT.theme_library || {};

window.RT.theme_library['inverse_wheat'] = {
  meta: {
    is_dark: true,
    name: "inverse_wheat"
  },
  surface: {
    0: "oklch(0.157 0 0)",
    1: "oklch(0.198 0 0)",
    2: "oklch(0.221 0 0)",
    3: "oklch(0.240 0 0)",
    input: "oklch(0.210 0 0)",
    code: "oklch(0.204 0 0)",
    select: "oklch(0.358 0.073 88)"
  },
  content: {
    main: "oklch(0.927 0.050 97)",
    muted: "oklch(0.699 0.030 78)",
    subtle: "oklch(0.522 0.022 82)",
    inverse: "oklch(0.157 0 0)"
  },
  brand: {
    primary: "oklch(0.841 0.173 85)",
    secondary: "oklch(0.827 0.135 78)",
    tertiary: "oklch(0.795 0.081 66)",
    link: "oklch(0.865 0.177 90)"
  },
  border: {
    faint: "oklch(0.280 0.018 78)",
    regular: "oklch(0.386 0.028 82)",
    strong: "oklch(0.533 0.041 77)"
  },
  state: {
    success: "oklch(0.671 0.168 137)",
    warning: "oklch(0.767 0.159 68)",
    error: "oklch(0.591 0.172 24)",
    info: "oklch(0.661 0.078 232)"
  },
  syntax: {
    keyword: "oklch(0.825 0.146 72)",
    string: "oklch(0.804 0.132 122)",
    func: "oklch(0.756 0.134 39)",
    comment: "oklch(0.573 0.035 78)"
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
    img.rt-diagram { filter: invert(1) hue-rotate(180deg); }
  `
};
