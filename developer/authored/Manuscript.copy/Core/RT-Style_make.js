// Core/loader.js

window.RT = window.RT || {};
window.RT.Module = window.RT.Module || new Set();

// 2. Establish the Debug System
window.RT.Debug = {
  active_tokens: new Set([
    'scroll'
  ]),

  log: function(token, message) {
    if (this.active_tokens.has(token)) {
      console.log(`[RT:${token}]`, message);
    }
  },

  warn: function(token, message) {
    if (this.active_tokens.has(token)) {
      console.warn(`[RT:${token}]`, message);
    }
  },
  
  error: function(token, message) {
    console.error(`[RT:${token}] CRITICAL:`, message);
  },
  
  enable: function(token) { this.active_tokens.add(token); console.log(`Enabled: ${token}`); },
  disable: function(token) { this.active_tokens.delete(token); console.log(`Disabled: ${token}`); }
};

// 3. Establish the Utilities
window.RT.Utility = {

  String: {
    to_roman: function(num) {
      if (num < 1) return num.toString();
      const lookup = {M:1000, CM:900, D:500, CD:400, C:100, XC:90, L:50, XL:40, X:10, IX:9, V:5, IV:4, I:1};
      let roman = '';
      for (let i in lookup) {
        while (num >= lookup[i]) {
          roman += i;
          num -= lookup[i];
        }
      }
      return roman;
    },

    strip_common_indent: function(text, tag_indent = '') {
      const raw_lines = text.split('\n');
      const content_lines = raw_lines.filter(line => line.trim().length > 0);
      let common_indent = '';

      if (content_lines.length > 0) {
        const first_match = content_lines[0].match(/^\s*/);
        common_indent = first_match ? first_match[0] : '';

        for (let i = 1; i < content_lines.length; i++) {
          const line = content_lines[i];
          let j = 0;
          while (j < common_indent.length && j < line.length && common_indent[j] === line[j]) {
            j++;
          }
          common_indent = common_indent.substring(0, j);
          if (common_indent.length === 0) break;
        }
      }

      let final_string = '';
      if (common_indent.length > 0 && common_indent.startsWith(tag_indent)) {
         const cleaned_lines = raw_lines.map(line => {
            return line.startsWith(common_indent) ? line.replace(common_indent, '') : line;
         });
         
         if (cleaned_lines.length > 0 && cleaned_lines[0].length === 0) {
           cleaned_lines.shift();
         }
         if (cleaned_lines.length > 0 && cleaned_lines[cleaned_lines.length - 1].trim().length === 0) {
            cleaned_lines.pop();
         }
         final_string = cleaned_lines.join('\n');
      } else {
         final_string = text.trim();
      }

      return final_string;
    }
  },

  Dom: {
    measure_outer_height: function(el) {
      const wasInDOM = el.parentNode !== null;
      if (!wasInDOM) document.body.appendChild(el);
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const margin = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
      if (!wasInDOM) el.remove();
      return (rect.height || 0) + (margin || 0);
    },

    is_block_content: function(element) {
      return element.textContent.trim().includes('\n');
    }
  },

  Font: {
    measure_ink_ratio: function(target_font, ref_font = null) {
      const debug = window.RT.Debug;
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

      return { 
        ratio: ratio,
        baseline_diff: ref_m.descent - target_m.descent 
      };
    }
  },

  Color: {
    extract_l: function(color_string) {
      const str = String(color_string).trim();
      
      if (!str.startsWith('oklch')) {
        console.error(`[RT:color] Invalid format: Expected oklch color string, received '${str}'`);
        return 0; 
      }

      const match = str.match(/oklch\(\s*([\d.]+%?)/);
      if (!match) {
        console.error(`[RT:color] Parsing error: Could not extract lightness from '${str}'`);
        return 0;
      }

      const l_value = match[1];
      return l_value.includes('%') ? parseFloat(l_value) / 100 : parseFloat(l_value);
    },

    is_high_contrast: function(bg_color, text_color) {
      const bg_l = this.extract_l(bg_color);
      const text_l = this.extract_l(text_color);
      return Math.abs(text_l - bg_l) >= 0.7;
    },

    is_readable: function(bg_color, text_color) {
      const bg_l = this.extract_l(bg_color);
      const text_l = this.extract_l(text_color);
      return Math.abs(text_l - bg_l) >= 0.5;
    },
    
    is_light: function(color_string) {
      return this.extract_l(color_string) > 0.75;
    },

    is_gray: function(color_string) {
      const l = this.extract_l(color_string);
      return l >= 0.25 && l <= 0.75;
    },

    is_dark: function(color_string) {
      return this.extract_l(color_string) < 0.25;
    }
  }

};

window.RT.theme_preference = function(author_pref, default_color = "#FF00FF") {
  const reader_pref = localStorage.getItem('RT-Style·theme_preference');
  const theme_to_load = reader_pref ? reader_pref : author_pref;
  
  window.RT.theme('load', theme_to_load, default_color);
};


window.RT.load = function(module_path) {
  if (window.RT.Module.has(module_path)) {
    return;
  }
  window.RT.Module.add(module_path);

  let resolved_path = window.RT.dirpr_library + '/' + module_path;
  if (!resolved_path.endsWith('.js')) {
    resolved_path = resolved_path + '.js';
  }

  document.write('<script src="' + resolved_path + '"></script>');
};

window.RT.load('Core/stage_manager');
window.RT.load('Core/theme_make');
window.RT.load('Theme/manifest.js')
