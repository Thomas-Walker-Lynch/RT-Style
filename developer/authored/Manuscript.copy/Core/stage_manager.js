/*
  Core/stage_manager.js

  Establishes the element registry and the schedule ,then orchestrates the
  execution pipeline. Also handles layout locking and scroll restoration.

  Two structures ,two purposes:

    RT.Element   a dictionary of element namespaces ,keyed by element name.
                 Pure data. Presence means an element has plugged in. Helper
                 functions do not live here ,or an element named for a helper
                 would collide with it.

    RT.Phase     an ordered list of phase names ,the schedule ,stated in one
                 place rather than inferred from dictionary key order.
    RT.Task      phase name -> ordered list of functions.

  Tasks within a phase are intended to be mutually independent; all real
  ordering is expressed by the phases. The structure does not enforce this ,so
  enable the 'shuffle' debug token to randomize task order and surface any
  accidental dependency immediately.

  RT.Debug is looked up at call time ,never captured into a local here. RT.load
  is deferred ,so a capture in this file body could bind a service that does not
  yet exist.
*/

(function(){

  if(!window.RT){
    console.error("RT not defined - was RT-Manuscript_make run?");
    return;
  }

  // Prevent duplicate initialization
  if(window.RT.Element){
    if(window.RT.Debug) window.RT.Debug.warn('stage' ,'stage_manager already initialized. Aborting duplicate run.');
    return;
  }

  // Element namespaces. An element creates its own key ,in its own file body ,
  // and nothing else may create it. That invariant is what allows presence to
  // serve as the load guard.
  window.RT.Element = {};

  // Cross element tables that belong to no single element.
  window.RT.Registry = {};

  /* The schedule.

     configure    compile the layout configuration from the selected theme.
                  Separated from the element phase so later tasks may read it
                  without an implicit ordering assumption.

     element      expand generators ,style elements. Changes document height ,
                  so it must precede pagination.

     paginate_0   slice the continuous DOM into <RT·page> pairs.

     page_style   apply geometry to the generated pages.

     counter      walk for counters ,then resolve read tags. After pagination ,
                  because a page number is itself a counter.

     note         resolve cross references. After counters ,because a reference
                  target may contain a counter value.

     paginate_1   absorb dimensional deltas by growing pages. Last ,and it only
                  ever grows: relocating content would change page numbers ,
                  which would change cross reference lengths ,which would
                  relocate more content. Growth is local and terminal.
  */
  window.RT.Phase = [
    'configure'
    ,'element'
    ,'paginate_0'
    ,'page_style'
    ,'counter'
    ,'note'
    ,'paginate_1'
  ];

  window.RT.Task = {};
  window.RT.Phase.forEach(phase_name => { window.RT.Task[phase_name] = []; });

  /* Register a task against a phase.

     The phase name is validated. Without the check a misspelling either throws
     or ,worse ,silently creates a queue nothing runs; the element would then do
     nothing and report nothing.

     Task lists are lists ,not sets. The module guard and the namespace guard
     already prevent a file registering twice ,and a task may legitimately be
     queued more than once when that is genuinely wanted.
  */
  window.RT.task_add = function(phase_name ,task_fn){
    if(!window.RT.Task[phase_name]){
      window.RT.Debug.error('stage' ,'unknown phase: ' + phase_name);
      return;
    }
    if(typeof task_fn !== 'function'){
      window.RT.Debug.error('stage' ,'task is not a function ,phase: ' + phase_name);
      return;
    }
    window.RT.Task[phase_name].push(task_fn);
  };

  let target_y = 0;
  let is_reload = false;
  let is_layout_locked = false;
  let scroll_timer;

  // =========================================================
  // SCROLL & LAYOUT LOCK UTILITIES
  // =========================================================

  function lock_layout(){
    is_layout_locked = true;
    document.documentElement.style.visibility = "hidden";
  }

  function unlock_layout(){
    if(!is_layout_locked) return;
    is_layout_locked = false;
    
    document.documentElement.style.visibility = "";
    window.removeEventListener("load" ,unlock_layout);
    document.dispatchEvent(new Event("RT_layout_complete"));
  }

  function configure_history(){
    if('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }

  function capture_scroll_target(){
    const raw_target = sessionStorage.getItem('RT_saved_y');
    target_y = raw_target !== null ? parseInt(raw_target ,10) : 0;
    
    if(window.performance){
      const nav_entries = performance.getEntriesByType("navigation");
      if(nav_entries.length > 0){
        is_reload = (nav_entries[0].type === "reload");
      }
      else if(performance.navigation){
        is_reload = (performance.navigation.type === 1);
      }
    }
  }

  function enforce_scroll(target ,use_hash ,attempts){
    if(attempts > 15){
      unlock_layout();
      return;
    }

    if(use_hash){
      const hash_target = document.getElementById(window.location.hash.substring(1));
      if(hash_target) hash_target.scrollIntoView();
    }
    else {
      window.scrollTo(0 ,target);
    }

    let is_successful = use_hash ? true : (Math.abs(window.scrollY - target) < 5 || target === 0);
    
    if( is_successful && (document.body.scrollHeight > 1000) ){ 
       setTimeout(() => {
         if( !use_hash && (Math.abs(window.scrollY - target) >= 5) ){
             enforce_scroll(target ,use_hash ,attempts + 1);
         }
         else {
             unlock_layout();
         }
       }, 100);
    }
    else {
       setTimeout(() => enforce_scroll(target ,use_hash ,attempts + 1) ,50);
    }
  }

  function bind_window_events(){
    window.addEventListener('scroll' ,() => {
      if(is_layout_locked) return;
      clearTimeout(scroll_timer);
      scroll_timer = setTimeout(() => {
        sessionStorage.setItem('RT_saved_y' ,window.scrollY);
      }, 200);
    }, { passive: true });
    
    window.addEventListener('beforeunload' ,() => {
      lock_layout();
    });
  }

  // =========================================================
  // PIPELINE EXECUTION
  // =========================================================

  function shuffled(task_seq){
    const out = task_seq.slice();
    for(let i = out.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [out[i] ,out[j]] = [out[j] ,out[i]];
    }
    return out;
  }

  function run_phase(phase_name){
    const debug = window.RT.Debug;
    let task_seq = window.RT.Task[phase_name];

    if(debug.active_tokens.has('shuffle')){
      task_seq = shuffled(task_seq);
      debug.log('stage' ,'phase ' + phase_name + ': task order shuffled');
    }

    task_seq.forEach(task_fn => {
      try{ task_fn(); }
      catch(e){ debug.error('stage' ,phase_name + ' task failed: ' + e); }
    });
  }

  function resolve_scroll_target(){
    window.RT.Debug.log('scroll' ,'Pipeline execution complete. Enforcing scroll target.');

    let use_hash = false;
    if(window.location.hash && !is_reload){
      const hash_target = document.getElementById(window.location.hash.substring(1));
      if(hash_target) use_hash = true;
    }

    enforce_scroll(target_y ,use_hash ,0);
  }

  function run_pipeline(){
    window.RT.Phase.forEach(phase_name => {
      window.RT.Debug.log('stage' ,'phase: ' + phase_name);
      run_phase(phase_name);
    });
    resolve_scroll_target();
  }

  // =========================================================
  // INITIALIZATION
  // =========================================================

  lock_layout();
  configure_history();
  capture_scroll_target();
  bind_window_events();

  document.addEventListener('DOMContentLoaded' ,run_pipeline);

  // Safety net: restore visibility on load if the layout engine hangs
  window.addEventListener("load" ,unlock_layout);

})();
