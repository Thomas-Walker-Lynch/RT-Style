/*
  Processes <RT·counter·*> tags.
  Calculates numbering, maintains the explicit status machine, manages snapshots, and outputs values for read tags.
  Supports 'scoped' and 'milestone' modes. Includes DOM continuation suspension architecture.
*/

(function(){

  if(!RT){
    console.error("RT not defined. Was RT-Manuscript_make run?");
    return;
  }
  if(!RT.Element){
    console.error("RT.Element not defined. Was the state_manager run?");
    return;
  }

  RT.Counter = RT.Counter || {};
  RT.dict_instance = RT.dict_instance || {};
  RT.dict_snapshot = RT.dict_snapshot || {};
  RT.dict_serial = RT.dict_serial || {};
  RT.serial_id_allocator = RT.serial_id_allocator || 1;

  class Count{
    constructor(){
      this.status = 'empty';
      this.list = null;
      this.names = null;
    }

    reset(){
      this.status = 'preamble';
      this.list = [0];
      this.names = [''];
    }

    reset_with_lists(list ,names){
      if(Array.isArray(list)){
        const is_natural = list.every(val => Number.isInteger(val) && val >= 0);
        if(is_natural){
          this.list = list.length > 0 ? [...list] : null;
          this.names = Array.isArray(names) && names.length === this.list.length ? [...names] : new Array(this.list.length).fill('');
        }else{
          console.error("RT-Manuscript Layout Error: Counter list must contain only natural numbers.");
          this.list = null;
          this.names = null;
        }
      }else{
        this.list = null;
        this.names = null;
      }
    }

    read(...path){
      if(path.length === 0) return undefined;
      const key = path[0];

      if(key === 'list'){
        if(this.status === 'empty'){
          console.error("RT-Manuscript Layout Error: Attempted to read 'list' from an empty Count object.");
          return null;
        }
        if(!this.list) return null;
        
        if(path[1] === 'short') return this.list.slice(0 ,-1);
        return [...this.list];
      }

      if(key === 'name'){
        if(this.status === 'empty' || !this.names) return '';
        if(path[1] === 'short'){
          return this.names.length > 1 ? this.names[this.names.length - 2] : '';
        }
        return this.names[this.names.length - 1] || '';
      }
      
      if(key === 'status') return this.status;

      return undefined;
    }

    write(key ,value){
      if(key === 'status'){
        this.status = value;
      }else if(key === 'list'){
        if(Array.isArray(value)){
          const is_natural = value.every(val => Number.isInteger(val) && val >= 0);
          if(is_natural){
            this.list = value.length > 0 ? [...value] : null;
          }else{
            console.error("RT-Manuscript Layout Error: Counter list must contain only natural numbers.");
            this.list = null;
          }
        }else{
          this.list = null;
        }
      }else if(key === 'Count' || key === 'count'){
        const source_count = value instanceof Count ? value : (value && value.count instanceof Count ? value.count : null);
        if(source_count){
          this.status = source_count.status;
          this.list = source_count.list ? [...source_count.list] : null;
        }else{
          console.error("RT-Manuscript Layout Error: Invalid object provided to write('Count').");
        }
      }
    }

    increment(){
      if(this.status === 'empty'){
        console.error("RT-Manuscript Layout Error: Attempted to increment an empty Count object.");
        return;
      }
      if(this.list && this.list.length > 0){
        this.list[this.list.length - 1] += 1;
        this.names[this.names.length - 1] = '';
      }
    }

    push(val){
      if(this.status === 'empty'){
        console.error("RT-Manuscript Layout Error: Attempted to push to an empty Count object.");
        return;
      }
      if(!this.list){
        this.list = [];
        this.names = [];
      }
      this.list.push(val);
      this.names.push('');
    }

    pop(){
      if(this.status === 'empty'){
        console.error("RT-Manuscript Layout Error: Attempted to pop from an empty Count object.");
        return undefined;
      }
      if(this.list && this.list.length > 0){
        const val = this.list.pop();
        this.names.pop();
        if(this.list.length === 0){
          this.list = null; 
          this.names = null;
        }
        return val;
      }
      return undefined;
    }

    set_name(name){
      if(this.names && this.names.length > 0){
        this.names[this.names.length - 1] = name;
      }
    }

    clone(){
      const c = new Count();
      c.status = this.status;
      c.list = this.list ? [...this.list] : null;
      c.names = this.names ? [...this.names] : null;
      return c;
    }
  }

  class CounterMachine{
    constructor(config){
      this.count = new Count();
      this.style = ['NaturalNumber']; 
      this.separator = '.';
      this.separator_placement = 'embedded';
      this.mode = 'scoped';

      if(config) this.write(config);
    }

    read(...path){
      if(path.length === 0) return undefined;
      
      if(path[0] === 'count'){
        if(path.length === 1) return this.count.clone();
        return this.count.read(...path.slice(1));
      }

      if(path[0] === 'name'){
        const status = this.count.read('status');
        if(status === 'empty') return '';
        if(this.mode === 'scoped' && status === 'between') return this.count.read('name' ,'short');
        return this.count.read('name');
      }
      
      return path.reduce((acc ,key) => (acc && acc[key] !== undefined) ? acc[key] : undefined ,this);
    }

    write(dict){
      for(const [key ,value] of Object.entries(dict)){
        if(key === 'style'){
          let parsed = Array.isArray(value) ? value : [value];
          if(parsed.length === 1 && parsed[0] === 'outline'){
            parsed = ['Roman' ,'Alpha' ,'roman' ,'alpha' ,'CountingNumber'];
          }
          this.style = parsed;
        }else if(key === 'Count' || key === 'count'){
          const source_count = value instanceof CounterMachine ? value.count : (value instanceof Count ? value : null);
          if(source_count){
            this.count = source_count.clone();
          }else{
            console.error("RT-Manuscript Layout Error: Invalid object provided to write('Count').");
          }
        }else{
          this[key] = value;
        }
      }
    }

    enter(first_step_val){
      const current_status = this.count.read('status');
      
      if(current_status === 'empty'){
        this.count.write('status' ,'preamble');
        this.count.push(first_step_val !== undefined ? first_step_val : 0);
      }else if(current_status === 'preamble'){
        this.count.push(0); 
        this.count.write('status' ,'preamble');
      }else if(current_status === 'between'){
        this.count.increment();
        this.count.write('status' ,'preamble');
      }
    }

    exit(){
      const current_status = this.count.read('status');
      
      if(current_status === 'empty'){
        console.error("RT-Manuscript Layout Error: Attempted to exit an empty counter scope.");
      }else if(current_status === 'preamble'){
        this.count.write('status' ,'between');
      }else if(current_status === 'between'){
        this.count.pop();
        this.count.write('status' ,'between');
      }
    }

    to_string(count_obj){
      if(!count_obj) return '';
      
      const status = count_obj.read('status');
      if(status === 'empty'){
          console.error("RT-Manuscript Layout Error: Attempted to output an uninitialized empty counter.");
          return '[Empty Counter]';
      }
      
      let active_list;
      if(this.mode === 'scoped' && status === 'between'){
        active_list = count_obj.read('list' ,'short');
      }else{
        active_list = count_obj.read('list');
      }
      
      if(!active_list || active_list.length === 0) return '';

      const formatted_list = active_list.map((val ,depth) => {
        const current_style = depth < this.style.length ? this.style[depth] : this.style[this.style.length - 1];
        const method_name = `to_${current_style}`;
        return typeof this[method_name] === 'function' ? this[method_name](val) : this.to_NaturalNumber(val);
      });
      
      let count_str = formatted_list.join(this.separator);
      if(this.separator_placement === 'embedded-after') count_str += this.separator;
      return count_str;
    }

    to_NaturalNumber(num){ return num.toString(); }
    from_NaturalNumber(val){ 
      const n = parseInt(val ,10);
      return isNaN(n) ? 0 : n;
    }

    to_CountingNumber(num){ return (num + 1).toString(); }
    from_CountingNumber(val){ 
      const n = parseInt(val ,10);
      return isNaN(n) ? 0 : Math.max(0 ,n - 1);
    }

    to_roman(num){ return this.to_Roman(num).toLowerCase(); }
    from_roman(val){ return this.from_Roman(val.toUpperCase()); }

    to_Roman(num){
      let n = num + 1; 
      if(n < 1) return n.toString();
      const lookup = {M:1000 ,CM:900 ,D:500 ,CD:400 ,C:100 ,XC:90 ,L:50 ,XL:40 ,X:10 ,IX:9 ,V:5 ,IV:4 ,I:1};
      let roman = '';
      for(let i in lookup){
        while(n >= lookup[i]){
          roman += i;
          n -= lookup[i];
        }
      }
      return roman;
    }
    from_Roman(val){
      if(!/^M*(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i.test(val)) return 0;
      const lookup = {M:1000 ,CM:900 ,D:500 ,CD:400 ,C:100 ,XC:90 ,L:50 ,XL:40 ,X:10 ,IX:9 ,V:5 ,IV:4 ,I:1};
      let temp = val.toUpperCase();
      let num = 0;
      let i = 0;
      while(i < temp.length){
        if( i + 1 < temp.length && lookup[temp.substring(i ,i + 2)] ){
          num += lookup[temp.substring(i ,i + 2)];
          i += 2;
        }else{
          num += lookup[temp[i]];
          i++;
        }
      }
      return Math.max(0 ,num - 1); 
    }

    to_Alpha(num){ return String.fromCharCode(65 + num); }
    from_Alpha(val){
      if(/^[A-Z]$/.test(val)) return val.charCodeAt(0) - 65;
      return 0;
    }

    to_alpha(num){ return String.fromCharCode(97 + num); }
    from_alpha(val){
      if(/^[a-z]$/.test(val)) return val.charCodeAt(0) - 97;
      return 0;
    }

    clone(){
      const copy = new CounterMachine();
      copy.count = this.count.clone();
      copy.style = [...this.style];
      copy.separator = this.separator;
      copy.separator_placement = this.separator_placement;
      copy.mode = this.mode;
      return copy;
    }
  }

  const counter = function(){
    const debug = RT.Debug || { log: function(){} };
    if(debug.log) debug.log('counter' ,'Processing counters');

    const root_node = document.documentElement;

    function walk(node){
      if(node.nodeType !== Node.ELEMENT_NODE) return;

      const tag = (node.tagName || '').toLowerCase();
      let machine_to_exit = null;

      if(tag === 'rt·counter·make'){
        const name = node.getAttribute('counter');
        if(name){
          const continues_id = node.getAttribute('continues');
          
          if(continues_id && RT.dict_serial[continues_id]){
            RT.dict_instance[name] = RT.dict_serial[continues_id].clone();
          }else{
            const style_attr = node.getAttribute('style');
            const parsed_style = style_attr ? style_attr.split(',').map(s => s.trim()) : ['NaturalNumber'];
            
            RT.dict_instance[name] = new CounterMachine({
              style: parsed_style
              ,separator: node.getAttribute('separator') || '.'
              ,separator_placement: node.getAttribute('separator-placement') || 'embedded'
              ,mode: node.getAttribute('mode') || 'scoped'
            });

            const on_first_step_str = node.getAttribute('on-first-step');
            if(on_first_step_str){
              const top_style = RT.dict_instance[name].style[0];
              const method_name = `from_${top_style}`;
              const active_machine = RT.dict_instance[name];
              const initial_val = typeof active_machine[method_name] === 'function' 
                ? active_machine[method_name](on_first_step_str) 
                : active_machine.from_NaturalNumber(on_first_step_str);
                
              active_machine.first_step_val = initial_val;
            }
          }

          const serial = node.getAttribute('serial') || String(RT.serial_id_allocator++);
          node.setAttribute('serial' ,serial);
          RT.dict_serial[serial] = RT.dict_instance[name];
        }

      }else if(tag === 'rt·counter·step'){
        const name = node.getAttribute('counter');
        const is_continuation = node.getAttribute('continuation') === 'true';

        if(name && RT.dict_instance[name]){
          const active_machine = RT.dict_instance[name];
          if(!is_continuation){
            active_machine.enter(active_machine.first_step_val);
            active_machine.first_step_val = undefined; 

            const name_nodes = Array.from(node.children).filter(c => c.tagName && c.tagName.toLowerCase() === 'rt·name');
            if(name_nodes.length > 0){
              const step_name = name_nodes.map(n => n.innerHTML.trim()).join('<br>');
              active_machine.count.set_name(step_name);
            }
          }
          machine_to_exit = active_machine;
        }
      }else if(tag === 'rt·counter·snapshot'){
        const counter_name = node.getAttribute('counter');
        const snapshot_name = node.getAttribute('snapshot');
        
        if(counter_name && snapshot_name && RT.dict_instance[counter_name]){
          const active_machine = RT.dict_instance[counter_name];

          if(active_machine.read('count' ,'status') === 'empty'){
            console.error(`RT-Manuscript Layout Error: Attempted to snapshot an empty counter '${counter_name}' at snapshot '${snapshot_name}'. A step is required first.`);
          }else{
            RT.dict_snapshot[snapshot_name] = active_machine.clone();
          }
        }
      }

      let child = node.firstElementChild;
      while(child){
        walk(child);
        child = child.nextElementSibling;
      }

      if(machine_to_exit){
        const is_continued = node.getAttribute('continued') === 'true';
        if(!is_continued){
          machine_to_exit.exit();
        }else{
          const split_id = node.getAttribute('split-id');
          if(split_id){
            RT.dict_serial[split_id] = machine_to_exit.clone();
          }
        }
      }
    }

    walk(root_node);

    const reads = root_node.querySelectorAll('RT·counter·read, rt·counter·read');

    for(let i = 0; i < reads.length; i++){
      process_read_node(reads[i]);
    }

    function process_read_node(node){
      const snapshot_name = node.getAttribute('snapshot');
      const key = node.getAttribute('key') || 'count'; 
      
      if(snapshot_name && RT.dict_snapshot[snapshot_name]){
        const snapshot_machine = RT.dict_snapshot[snapshot_name];
        
        if(key === 'count'){
          const raw_state = snapshot_machine.read('count');
          node.innerHTML = snapshot_machine.to_string(raw_state);
        }else{
          const keys = key.split('.');
          const value = snapshot_machine.read(...keys);
          
          if(value === null){
            node.innerHTML = 'null';
          }else if(value !== undefined){
            node.innerHTML = Array.isArray(value) ? value.join(',') : value;
          }else{
            node.innerHTML = `[Missing key: ${key}]`;
          }
        }
      }else{
        node.innerHTML = `[Unknown snapshot: ${snapshot_name}]`;
        console.error(`RT-Manuscript Layout Error: <RT·counter·read> failed. No snapshot named '${snapshot_name}' found.`);
      }
    }
  };

  window.RT.counter = counter;

})();
