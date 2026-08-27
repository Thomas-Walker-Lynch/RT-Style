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

  /* Where the reader is let in.

     The document is readable once the notes are resolved. Everything after
     that point only grows pages that overflowed ,which is a change to the
     bottom of a few leaves and to nothing a reader is looking at in the first
     seconds. Holding the blank until the last phase finished made the reader
     wait on work that did not concern them.

     So the curtain rises here and the remaining phases run behind it. Set to
     null to hold the blank until every phase has finished ,which is the older
     behaviour and is what to do if a late phase is ever given the power to
     move content rather than only to grow it.
  */
  window.RT.Phase_reveal = 'note';

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

  /* ---------------------------------------------------------------
     The white page.

     The canvas takes its colour from the root element ,and until the theme is
     compiled the root has no colour ,so the browser paints its own default.
     Firefox does this readily ,and a book that opens on a sheet of white
     before turning black is worse than one that takes a moment longer to
     open: the flash lands before the reader has focused on anything.

     Two measures ,because neither alone is enough.

     The colour last used is remembered and applied here ,at parse time ,ahead
     of the first paint. A reader returning to a book — which is nearly every
     opening after the first — never sees white at all.

     A transition is armed at the same moment ,for the opening where nothing is
     remembered. There the colour arrives later ,when the theme compiles ,and
     it arrives as a fade rather than as a cut. A fade from white is a change
     of light; a cut from white is a flash ,and the eye reads the two quite
     differently.

     The remembered colour is a hint and nothing more. If it is wrong ,which it
     is when the reader has changed theme since ,the theme overwrites it within
     the same second and the error shows as a fade.
  --------------------------------------------------------------- */

  // Namespaced as the theme preference beside it is ,and for the same store.
  const screen_color_key = 'RT-Manuscript·screen_color';

  /* The two ends of the copy ,named for what they are. Both swallow their
     faults: a store that refuses to answer is a reason to fall back on the
     fade ,not a reason to stop opening the book. */
  function screen_color_read(){
    try{ return localStorage.getItem(screen_color_key); }
    catch(e){ return null; }
  }

  function prepaint_screen(){
    const root = document.documentElement;
    const color = screen_color_read();

    if(color) root.style.backgroundColor = color;

    /* Armed after the remembered colour is set ,so that colour lands
       instantly and only a correction fades. */
    root.style.transition = 'background-color 400ms ease-out';
  }

  // Written by whoever resolves the theme ,read on the next opening.
  window.RT.screen_color_write = function(color){
    if(!color) return;
    try{ localStorage.setItem(screen_color_key ,color); }catch(e){}
  };

  /* ---------------------------------------------------------------
     Telling the reader that the wait is work.

     A blank that lasts four seconds and a blank that has hung are the same
     blank. The reader cannot tell them apart ,so they reload ,which starts the
     four seconds again.

     An elapsed count answers it: a number that is moving is a machine that is
     working. The phase is named alongside it ,which costs nothing and means a
     slow book can be reported on precisely.

     The panel is only raised if the wait is long enough to be noticed. A short
     book formats in less time than it takes to read the word 'formatting' ,and
     raising a panel for that would be its own flicker.

     Visibility is set explicitly. The root is hidden ,and visibility inherits ,
     so a descendant that does not overrule it is hidden with everything else.
     The background is left clear so the screen colour shows through and the
     panel appears to sit on the page rather than over it.
  --------------------------------------------------------------- */

  const progress = {
    panel: null ,elapsed: null ,phase: null
    ,start: 0 ,timer: 0 ,label: '' ,step: 0 ,raised: false
  };

  const progress_delay_ms = 500;

  function progress_raise(){
    if(progress.raised || !document.body) return;
    progress.raised = true;

    const panel = document.createElement('div');
    panel.id = 'RT·progress';
    panel.style.cssText =
      'position:fixed; top:0; left:0; right:0; bottom:0; z-index:2147483647;'
      + ' visibility:visible; pointer-events:none; background:transparent;'
      + ' display:flex; flex-direction:column; align-items:center;'
      + ' justify-content:center; gap:0.6rem; text-align:center;'
      + " font:400 1rem/1.4 'Noto Sans JP', Arial, sans-serif; color:#8a8a8a;";

    const elapsed = document.createElement('div');
    elapsed.style.cssText = 'font-size:1.5rem; font-variant-numeric:tabular-nums;';

    const phase = document.createElement('div');
    phase.style.cssText = 'font-size:0.85rem; opacity:0.75;';

    panel.appendChild(elapsed);
    panel.appendChild(phase);
    document.body.appendChild(panel);

    progress.panel = panel;
    progress.elapsed = elapsed;
    progress.phase = phase;
    progress_paint();
  }

  function progress_paint(){
    if(!progress.raised) return;
    const seconds = (performance.now() - progress.start) / 1000;
    progress.elapsed.textContent = 'Formatting  ' + seconds.toFixed(1) + ' s';
    progress.phase.textContent = progress.label
      ? progress.label + '  (' + progress.step + ' of ' + window.RT.Phase.length + ')'
      : '';
  }

  function progress_begin(){
    progress.start = performance.now();
    /* The pipeline holds the main thread for the length of a phase ,so this
       advances the count at phase boundaries and not within them. A phase that
       runs long shows a still number under a moving phase name ,which is
       honest about where the time is going. */
    progress.timer = setInterval(() => {
      if( !progress.raised && performance.now() - progress.start > progress_delay_ms ){
        progress_raise();
      }
      progress_paint();
    } ,100);
  }

  function progress_report(phase_name ,step){
    progress.label = phase_name;
    progress.step = step;
    progress_paint();
  }

  function progress_end(){
    if(progress.timer) clearInterval(progress.timer);
    progress.timer = 0;
    if(progress.panel && progress.panel.parentNode) progress.panel.remove();
    progress.panel = null;
    progress.raised = false;
  }

  function lock_layout(){
    is_layout_locked = true;
    document.documentElement.style.visibility = "hidden";
  }

  function unlock_layout(){
    if(!is_layout_locked) return;
    is_layout_locked = false;

    progress_end();
    
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

  /* Two frames ,not one.

     A single frame runs the callback in the same paint as the style change
     that preceded it ,so the panel's new text is written and the next phase
     seizes the thread before the reader sees it. The second frame lets the
     paint land first. The cost is a few milliseconds per phase against a
     pipeline measured in seconds. */
  function next_frame(fn){
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }

  /* The pipeline runs one phase per turn rather than all of them in one.

     Nothing about the order changes ,and no phase is split: each still runs to
     completion before the next begins. What changes is that the thread is
     given back between them ,which is the only moment the browser has to paint
     the elapsed count ,and the only moment at which the curtain can be raised
     part way through.

     Splitting a phase would be the larger prize — the two long ones ,element
     and paginate_0 ,hold the thread for most of the wait — but a phase is
     written as one pass over the document and cutting one into resumable
     pieces is a different order of change.
  */
  function run_pipeline(){
    progress_begin();

    let index = 0;

    const step = function(){
      if(index >= window.RT.Phase.length){
        progress_end();
        if(is_layout_locked) resolve_scroll_target();
        return;
      }

      const phase_name = window.RT.Phase[index++];
      progress_report(phase_name ,index);

      next_frame(function(){
        window.RT.Debug.log('stage' ,'phase: ' + phase_name);
        run_phase(phase_name);

        /* The reader is let in here ,and the remaining phases go on behind
           them. Scroll is settled first ,or the reader would be shown the top
           of the book and then moved. */
        if(phase_name === window.RT.Phase_reveal && is_layout_locked){
          progress_end();
          resolve_scroll_target();
        }

        step();
      });
    };

    step();
  }

  // =========================================================
  // INITIALIZATION
  // =========================================================

  lock_layout();
  prepaint_screen();
  configure_history();
  capture_scroll_target();
  bind_window_events();

  document.addEventListener('DOMContentLoaded' ,run_pipeline);

  // Safety net: restore visibility on load if the layout engine hangs
  window.addEventListener("load" ,unlock_layout);

})();
