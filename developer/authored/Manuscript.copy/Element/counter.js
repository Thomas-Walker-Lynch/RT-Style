/*
  Processes <RT·Counter·*> tags.
  Calculates numbering, maintains the stack, manages snapshots, and outputs values for read tags.
*/

(function() {

  if (!RT) {
    console.error("RT not defined - was RT-Style_make run?");
    return;
  }
  if (!RT.Element) {
    console.error("RT.Element not defined - was the state_manager run?");
    return;
  }

  RT.Counter = RT.Counter || {};
  RT.dict_instance = RT.dict_instance || {};
  RT.dict_snapshot = RT.dict_snapshot || {};

  RT.Element.add( function() {
    const debug = RT.Debug || { log: function(){} };
    if (debug.log) debug.log('counter', 'Processing counters');

    const root_node = document.documentElement;

    function clone_state(state) {
      return {
        counter: state.counter,
        stack: [...state.stack], 
        empty: [...state.empty], 
        separator: state.separator,
        'separator-placement': state['separator-placement'],
        style: state.style,
        'on-first-step': state['on-first-step'],
        count: state.count 
      };
    }

    function to_roman(num) {
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
    }

    function parse_first_step(val_str, style, counter_name) {
      if (!val_str) return 1;

      let num = NaN;

      if (style === 'alpha') {
        if (/^[a-z]$/.test(val_str)) {
          num = val_str.charCodeAt(0) - 96;
        }
      } else if (style === 'Alpha') {
        if (/^[A-Z]$/.test(val_str)) {
          num = val_str.charCodeAt(0) - 64;
        }
      } else if (style === 'roman' || style === 'Roman' || style === 'roman-outline') {
        let is_upper = (style === 'Roman' || style === 'roman-outline');
        let regex = is_upper ? /^M*(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/ : /^m*(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;

        if (regex.test(val_str)) {
          const lookup = {M:1000, CM:900, D:500, CD:400, C:100, XC:90, L:50, XL:40, X:10, IX:9, V:5, IV:4, I:1};
          let temp = val_str.toUpperCase();
          num = 0;
          let i = 0;
          while (i < temp.length) {
            if (i + 1 < temp.length && lookup[temp.substring(i, i + 2)]) {
              num += lookup[temp.substring(i, i + 2)];
              i += 2;
            } else {
              num += lookup[temp[i]];
              i++;
            }
          }
        }
      } else {
        if (/^\d+$/.test(val_str)) {
          num = parseInt(val_str, 10);
        }
      }

      if (isNaN(num) || num < 1) {
        console.error(`RT-Style Layout Error: Type mismatch. Invalid 'on-first-step' value '${val_str}' for style '${style}' in counter '${counter_name}'.`);
        return 1;
      }
      return num;
    }

    function format_count(num, style, depth) {
      if (style === 'roman') return to_roman(num).toLowerCase();
      if (style === 'Roman') return to_roman(num);
      if (style === 'Alpha') return String.fromCharCode(64 + num); 
      if (style === 'alpha') return String.fromCharCode(96 + num);
      
      if (style === 'roman-outline') {
        const levels = ['Roman', 'Alpha', 'Natural', 'alpha', 'roman'];
        const current_style = levels[depth % levels.length];
        return format_count(num, current_style, 0); 
      }
      
      return num.toString();
    }

    function walk(node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const tag = node.tagName.toLowerCase();
      let pushed_name = null;

      if (tag === 'rt·counter·make') {
        const name = node.getAttribute('counter');
        if (name) {
          const style = node.getAttribute('style') || 'Natural';
          const on_first_step_str = node.getAttribute('on-first-step');
          
          let first_step_int = parse_first_step(on_first_step_str, style, name);
          
          RT.dict_instance[name] = {
            counter: name,
            stack: [0], 
            empty: [true], 
            separator: node.getAttribute('separator') || '.',
            'separator-placement': node.getAttribute('separator-placement') || 'embedded',
            style: style,
            'on-first-step': on_first_step_str || '1', 
            on_first_step_int: first_step_int,
            count: ''
          };
        }
      } else if (tag === 'rt·counter·indent') {
        const name = node.getAttribute('counter');
        if (name && RT.dict_instance[name]) {
          RT.dict_instance[name].stack.push(0);
          RT.dict_instance[name].empty.push(true);
          pushed_name = name;
        }
      } else if (tag === 'rt·counter·step') {
        const name = node.getAttribute('counter');
        if (name && RT.dict_instance[name]) {
          const state = RT.dict_instance[name];
          const depth = state.stack.length - 1;
          
          if (state.empty[depth]) {
              state.stack[depth] = (depth === 0) ? state.on_first_step_int : 1;
              state.empty[depth] = false;
          } else {
              state.stack[depth] += 1;
          }
          
          const formatted_stack = state.stack.map((val, index) => 
            format_count(val, state.style, index)
          );
          
          let count_str = formatted_stack.join(state.separator);
          if (state['separator-placement'] === 'embedded-after') {
            count_str += state.separator;
          }
          
          state.count = count_str;
        }
      } else if (tag === 'rt·counter·snapshot') {
        const counter_name = node.getAttribute('counter');
        const snapshot_name = node.getAttribute('snapshot');
        
        if (counter_name && snapshot_name && RT.dict_instance[counter_name]) {
          const state = RT.dict_instance[counter_name];
          const depth = state.stack.length - 1;

          if (state.empty[depth]) {
               console.error(`RT-Style Layout Error: Attempted to snapshot an empty counter '${counter_name}' at snapshot '${snapshot_name}'. A person must use <RT·Counter·step> before taking a snapshot.`);
          } else {
               RT.dict_snapshot[snapshot_name] = clone_state(state);
          }
        }
      }

      let child = node.firstElementChild;
      while (child) {
        walk(child);
        child = child.nextElementSibling;
      }

      if (pushed_name) {
        RT.dict_instance[pushed_name].stack.pop();
        RT.dict_instance[pushed_name].empty.pop();
      }
    }

    walk(root_node);

    const reads = root_node.querySelectorAll('RT·Counter·read');
    for (let i = 0; i < reads.length; i++) {
      const snapshot_name = reads[i].getAttribute('snapshot');
      const key = reads[i].getAttribute('key') || 'count'; 
      
      if (snapshot_name && RT.dict_snapshot[snapshot_name]) {
        const value = RT.dict_snapshot[snapshot_name][key];
        reads[i].innerHTML = (value !== undefined) ? value : `[Missing key: ${key}]`;
      } else {
        reads[i].innerHTML = `[Unknown snapshot: ${snapshot_name}]`;
        console.error(`RT-Style Layout Error: <RT·Counter·read> failed. No snapshot named '${snapshot_name}' found in the dictionary.`);
      }
    }
  });

})();
