/*
  Core/utility.js
  Shared services: token filtered debug logging ,string ,DOM ,font ,and colour
  helpers ,registry management ,and structural queries.

  Loaded first by Core/RT-Manuscript_make.js ,ahead of the stage manager ,so that
  every later file may rely on RT.Debug existing. Nothing here depends on the
  document ,so it is safe to establish at parse time.

  Note: consumers must look RT.Debug up at call time rather than capturing it
  into a local in a file body. RT.load is deferred ,so a file body may run
  before the service it wants exists.
*/

window.RT = window.RT || {};

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

(function(){

  // Registry Management
  window.RT.Utility.Registry = {
    has: function(namespace_obj, key) {
      return namespace_obj && Object.prototype.hasOwnProperty.call(namespace_obj, key);
    },
    
    register_make: function(namespace_obj, counter_name, node_ref, attributes) {
      namespace_obj[counter_name] = namespace_obj[counter_name] || {};
      namespace_obj[counter_name].node = node_ref;
      
      if (attributes) {
         for (let i = 0; i < attributes.length; i++) {
           namespace_obj[counter_name][attributes[i]] = ""; // Flag presence
         }
      }
    }
  };

  // DOM Structural Operations
  window.RT.Utility.Dom = window.RT.Utility.Dom || {};

  /* A place to measure in ,out of the flow of the book.

     Every question about how text wraps is one only the browser can answer ,
     and it will only answer it about an element that is attached and laid out.
     Attached in the flow ,though ,each answer is dear: setting a width dirties
     the element ,which changes its height ,which moves everything below it ,
     and the browser must lay the rest of the book out again before it can
     reply. A shrink wrap asks a dozen such questions per label. A hundred
     labels in a long manuscript is then a thousand full layouts ,and that is
     where the time went when shrink wrapping was added — the cost is not in
     the wrapping ,it is in the length of the document behind it.

     The host is positioned ,so it is out of flow and its contents cannot
     change the height of anything in the flow. Nothing below it moves ,so
     there is nothing below it to lay out again. It is a child of the element
     the content would really sit in ,so font ,size ,weight and colour are
     inherited exactly as they will be in place ,and it is given that parent's
     content width ,so the wrapping measured is the wrapping that will be
     rendered. Measuring somewhere convenient instead would answer a question
     about a document that does not exist.

     Returns null where a width cannot be established ,which is the caller's
     signal to measure in place as before rather than to measure wrongly.
  */
  window.RT.Utility.Dom.measure_host_make = function(context_el){
    const parent = context_el && context_el.parentElement;
    if(!parent) return null;

    const ps = window.getComputedStyle(parent);
    const width = parent.clientWidth
                - parseFloat(ps.paddingLeft || 0)
                - parseFloat(ps.paddingRight || 0);
    if( !(width > 0) ) return null;

    const host = document.createElement('div');
    host.setAttribute('data-RT-measure-host' ,'true');
    host.style.cssText =
      'position:fixed; top:0; left:0; visibility:hidden; pointer-events:none;'
      + ' contain:layout style; z-index:-1; width:' + width + 'px;';

    parent.appendChild(host);
    return host;
  };
  

  /* Shrink wrap an attached element to a well set block of text.

     Text left in a box as wide as its column wraps wherever the width happens
     to run out, which strands a word or two on the last line:

         One two three and then some
         more

     Two steps fix it, and both are needed. First narrow the box until narrowing
     it further would cost another line. Every line then carries text:

         One two three and
         then some more

     Second, hug the longest line. Until this is done the box is still as wide as
     it was allowed to be, and a box wider than its text cannot be placed: pushed
     against the right edge of a cell it looks exactly as it did against the
     left, because the lines inside have not moved.

     Afterwards the longest line touches the right edge of the box, the text is
     flush left with its ragged edge on the right where a reader expects it, and
     the box as a whole can be placed wherever it belongs.

     The element must be attached and laid out, since every question here is one
     only the browser can answer. Widths are searched by bisection rather than
     stepped, which costs about ten measurements instead of one per em.
  */
  const line_metrics = function(el){
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = range.getClientRects();
    const lines = new Map();
    for(let i = 0; i < rects.length; i++){
      const r = rects[i];
      if(r.width === 0 && r.height === 0) continue;
      const key = Math.round(r.top);
      const cur = lines.get(key);
      if(cur){
        if(r.left < cur.left) cur.left = r.left;
        if(r.right > cur.right) cur.right = r.right;
      }else{
        lines.set(key ,{ left: r.left ,right: r.right });
      }
    }
    // Ordered by vertical position, so widths[0] is the first line.
    const keys = Array.from(lines.keys()).sort((a ,b) => a - b);
    const widths = keys.map(k => lines.get(k).right - lines.get(k).left);
    let widest = 0;
    widths.forEach(w => { if(w > widest) widest = w; });
    return {
      count: lines.size || 1
      ,widest: widest
      ,widths: widths
      ,first: widths.length ? widths[0] : 0
    };
  };

  window.RT.Utility.Dom.line_metrics = line_metrics;

  window.RT.Utility.Dom.shrink_wrap = function(el ,options){
    options = options || {};
    if(!el || !el.isConnected) return el;

    /* The ceiling is the parent's content box. clientWidth includes padding ,
       so using it directly would allow the label to be set wider than the space
       it actually occupies. */
    const parent = el.parentElement;
    let parent_content = 0;
    if(parent){
      const ps = window.getComputedStyle(parent);
      parent_content = parent.clientWidth
                     - parseFloat(ps.paddingLeft || 0)
                     - parseFloat(ps.paddingRight || 0);
    }
    const max_width = options.max_width || parent_content || el.offsetWidth;
    if(!(max_width > 0)) return el;

    el.style.display = 'inline-block';
    el.style.textAlign = 'left';
    el.style.width = max_width + 'px';

    let m = line_metrics(el);
    const target_lines = m.count;

    if(target_lines > 1){
      // The box never needs to exceed the widest line it already produced.
      let lo = 1;
      let hi = Math.ceil(m.widest) || max_width;
      let best = hi;
      while(hi - lo > 2){
        const mid = Math.floor((lo + hi) / 2);
        el.style.width = mid + 'px';
        if(line_metrics(el).count <= target_lines){
          best = mid;
          hi = mid;
        }else{
          lo = mid + 1;
        }
      }
      el.style.width = best + 'px';

      /* Prefer a first line no shorter than the lines beneath it.

         A block whose opening line is the short one reads as ragged at the top ,
         where the eye enters. Compositors set the first line long for the same
         reason a paragraph is not begun with its shortest sentence.

         The narrowest width holding the line count does not always give this ,
         because line breaking is greedy: the first line takes what fits ,and a
         long following word can leave it short while later lines pack well. So
         widen a little and look for a width where the first line is the longest.

         The search is bounded, and it never accepts a width that adds a line.
         Where no such width exists within the bound the balanced width stands:
         <strong>a stranded word is worse than a short first line</strong> ,and
         given the choice we decline to create one.

         The bound is a count of probes rather than a step size ,because a
         probe is the expensive thing here and sixteen of them per label ,on
         top of the ten the bisection costs ,was most of the cost of shrink
         wrapping a manuscript. Six probes over the same span find nearly every
         width the sixteen found — the widths that satisfy the test are not
         isolated points but runs ,since a range of widths keeps the same line
         breaks — and where a coarser step steps over one ,the balanced width
         stands and the loss is a short first line rather than a fault.
      */
      const probe_budget = 6;
      const ceiling = Math.ceil(m.widest) || max_width;
      const span = Math.max(0 ,ceiling - best);
      const step = Math.max(2 ,Math.round(span / probe_budget));
      for(let w = best + step; w <= ceiling; w += step){
        el.style.width = w + 'px';
        const t = line_metrics(el);
        if(t.count !== target_lines) break;          // never add a line
        if(t.first >= t.widest - 0.5){               // first line is the longest
          best = w;
          break;
        }
      }
      el.style.width = best + 'px';
    }

    // Hug the longest line, so it touches the right edge of the box.
    m = line_metrics(el);
    if(m.widest > 0) el.style.width = Math.ceil(m.widest) + 'px';

    return el;
  };

  window.RT.Utility.Dom.get_structural_depth = function(element, counter_name) {
    let depth = 0;
    let curr = element.parentElement;
    
    while(curr) {
      const tag = (curr.tagName || '').toLowerCase();
      if (tag === 'rt·section' || (tag === 'rt·counter·step' && curr.getAttribute('counter') === counter_name)) {
        depth++;
      }
      curr = curr.parentElement;
    }
    return depth;
  };

})();
