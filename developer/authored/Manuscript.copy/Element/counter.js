/*
  Processes <RT·counter·*> tags.
  Calculates numbering, maintains the explicit status machine, manages snapshots, and outputs values for read tags.
*/

(function() {

  if (!RT) {
    console.error("RT not defined - was RT-Manuscript_make run?");
    return;
  }
  if (!RT.Element) {
    console.error("RT.Element not defined - was the state_manager run?");
    return;
  }

  RT.Counter = RT.Counter || {};
  RT.dict_instance = RT.dict_instance || {};
  RT.dict_snapshot = RT.dict_snapshot || {};

  class CounterMachine {
    constructor(first_step_val, style, separator, separator_placement) {
      this.list = [];
      this.status = 'empty'; // 'empty', 'preamble', 'between'
      this.first_step_val = first_step_val;
      this.style = style || 'NaturalNumber';
      this.separator = separator || '.';
      this.separator_placement = separator_placement || 'embedded';
      this.count = '';
    }

    enter() {
      if (this.status === 'empty') {
        this.list.push(this.first_step_val);
        this.status = 'preamble';
      } else if (this.status === 'preamble') {
        this.list.push(0); // indent appends 0
        this.status = 'preamble';
      } else if (this.status === 'between') {
        this.list[this.list.length - 1] += 1; // inc last value
        this.status = 'preamble';
      }
      this.update_count_string();
    }

    exit() {
      if (this.status === 'empty') {
        console.error("RT-Manuscript Layout Error: Attempted to exit an empty counter scope.");
      } else if (this.status === 'preamble') {
        this.status = 'between';
      } else if (this.status === 'between') {
        this.list.pop();
        this.status = 'between';
      }
      this.update_count_string();
    }

    update_count_string() {
      if (this.status === 'empty' || this.list.length === 0) {
        this.count = '';
        return;
      }
      
      const formatted_list = this.list.map((val, index) => 
        this.format_count(val, this.style, index)
      );
      
      let count_str = formatted_list.join(this.separator);
      if (this.separator_placement === 'embedded-after') {
        count_str += this.separator;
      }
      this.count = count_str;
    }

    format_count(num, style, depth) {
      if (style === 'roman') return this.to_roman(num).toLowerCase();
      if (style === 'Roman') return this.to_roman(num);
      if (style === 'Alpha') return String.fromCharCode(64 + num); 
      if (style === 'alpha') return String.fromCharCode(96 + num);
      
      if (style === 'roman-outline') {
        const levels = ['Roman', 'Alpha', 'CountingNumber', 'alpha', 'roman'];
        const current_style = levels[depth % levels.length];
        return this.format_count(num, current_style, 0); 
      }
      
      if (style === 'CountingNumber') {
        return (num + 1).toString();
      }
      
      // Default behavior maps to NaturalNumber
      return num.toString();
    }

    to_roman(num) {
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

    clone() {
      const copy = new CounterMachine(
        this.first_step_val, 
        this.style, 
        this.separator, 
        this.separator_placement
      );
      copy.list = [...this.list];
      copy.status = this.status;
      copy.count = this.count;
      return copy;
    }

    static parse_first_step(val_str, style, counter_name) {
      if (!val_str) return 0; // Defaulting to 0 to support preamble logic

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

      if (isNaN(num) || num < 0) {
        console.error(`RT-Manuscript Layout Error: Type mismatch. Invalid 'on-first-step' value '${val_str}' for style '${style}' in counter '${counter_name}'.`);
        return 0;
      }
      return num;
    }
  }

  RT.Element.add( function() {
    const debug = RT.Debug || { log: function(){} };
    if (debug.log) debug.log('counter', 'Processing counters');

    const root_node = document.documentElement;

    function walk(node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const tag = node.tagName.toLowerCase();
      let machine_to_exit = null;

      if (tag === 'rt·counter·make') {
        const name = node.getAttribute('counter');
        if (name) {
          const style = node.getAttribute('style') || 'NaturalNumber';
          const on_first_step_str = node.getAttribute('on-first-step');
          const separator = node.getAttribute('separator');
          const separator_placement = node.getAttribute('separator-placement');
          
          let first_step_int = CounterMachine.parse_first_step(on_first_step_str, style, name);
          
          RT.dict_instance[name] = new CounterMachine(
            first_step_int, 
            style, 
            separator, 
            separator_placement
          );
        }
      } else if (tag === 'rt·counter·step') {
        const name = node.getAttribute('counter');
        if (name && RT.dict_instance[name]) {
          const active_machine = RT.dict_instance[name];
          
          active_machine.enter();
          machine_to_exit = active_machine;
        }
      } else if (tag === 'rt·counter·snapshot') {
        const counter_name = node.getAttribute('counter');
        const snapshot_name = node.getAttribute('snapshot');
        
        if (counter_name && snapshot_name && RT.dict_instance[counter_name]) {
          const active_machine = RT.dict_instance[counter_name];

          if (active_machine.status === 'empty') {
               console.error(`RT-Manuscript Layout Error: Attempted to snapshot an empty counter '${counter_name}' at snapshot '${snapshot_name}'. A step is required first.`);
          } else {
               RT.dict_snapshot[snapshot_name] = active_machine.clone();
          }
        }
      }

      let child = node.firstElementChild;
      while (child) {
        walk(child);
        child = child.nextElementSibling;
      }

      if (machine_to_exit) {
        machine_to_exit.exit();
      }
    }

    walk(root_node);

    const reads = root_node.querySelectorAll('RT·counter·read, rt·counter·read');
    for (let i = 0; i < reads.length; i++) {
      const snapshot_name = reads[i].getAttribute('snapshot');
      const key = reads[i].getAttribute('key') || 'count'; 
      
      if (snapshot_name && RT.dict_snapshot[snapshot_name]) {
        const snapshot_machine = RT.dict_snapshot[snapshot_name];
        const value = snapshot_machine[key];
        reads[i].innerHTML = (value !== undefined) ? value : `[Missing key: ${key}]`;
      } else {
        reads[i].innerHTML = `[Unknown snapshot: ${snapshot_name}]`;
        console.error(`RT-Manuscript Layout Error: <RT·counter·read> failed. No snapshot named '${snapshot_name}' found.`);
      }
    }
  });

})();
