/*
  General utilities for the StyleRT library.
*/

window.StyleRT = window.StyleRT || {};

// --- DEBUG SYSTEM ---
window.StyleRT.debug = {

  // all debug messages enabled
/*
  active_tokens: new Set([
    'style', 'layout', 'pagination'
    ,'selector', 'config', 'error'
    ,'term'
  ]),
*/
  active_tokens: new Set([
    'term'
  ]),
  
  log: function(token, message) {
    if (this.active_tokens.has(token)) {
      console.log(`[StyleRT:${token}]`, message);
    }
  },

  warn: function(token, message) {
    if (this.active_tokens.has(token)) {
      console.warn(`[StyleRT:${token}]`, message);
    }
  },
  
  // New: Always log errors regardless of token, but tag them
  error: function(token, message) {
    console.error(`[StyleRT:${token}] CRITICAL:`, message);
  },
  
  enable: function(token) { this.active_tokens.add(token); console.log(`Enabled: ${token}`); },
  disable: function(token) { this.active_tokens.delete(token); console.log(`Disabled: ${token}`); }
};

// --- UTILITIES ---
window.StyleRT.utility = {
  // --- FONT PHYSICS ---
  measure_ink_ratio: function(target_font, ref_font = null) {
    const debug = window.StyleRT.debug;
    debug.log('layout', `Measuring ink ratio for ${target_font}`);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ref_font) {
      const bodyStyle = window.getComputedStyle(document.body);
      ref_font = bodyStyle.fontFamily;
    }

    const get_metrics = (font) => {
      ctx.font = '100px ' + font; 
      const metrics = ctx.measureText('M');
      return {
        ascent: metrics.actualBoundingBoxAscent, 
        descent: metrics.actualBoundingBoxDescent 
      };
    };

    const ref_m = get_metrics(ref_font);
    const target_m = get_metrics(target_font);
    
    const ratio = ref_m.ascent / target_m.ascent;
    // debug.log('layout', `Ink Ratio calculated: ${ratio.toFixed(3)}`);

    return { 
      ratio: ratio,
      baseline_diff: ref_m.descent - target_m.descent 
    };
  },

  // --- COLOR PHYSICS ---
  is_color_light: function(color_string) {
    const debug = window.StyleRT.debug;
    
    // 1. HSL Check
    if (color_string.startsWith('hsl')) {
      const numbers = color_string.match(/\d+/g);
      if (numbers && numbers.length >= 3) {
        const lightness = parseInt(numbers[2]);
        return lightness > 50;
      }
    }

    // 2. RGB Check
    const rgb = color_string.match(/\d+/g);
    if (!rgb) {
      // debug.warn('color_layout', `Failed to parse color: "${color_string}". Defaulting to Light.`);
      return true; 
    }

    const r = parseInt(rgb[0]);
    const g = parseInt(rgb[1]);
    const b = parseInt(rgb[2]);
    const luma = (r * 299 + g * 587 + b * 114) / 1000;
    return luma > 128;
  },

  is_block_content: function(element) {
    return element.textContent.trim().includes('\n');
  }
};
