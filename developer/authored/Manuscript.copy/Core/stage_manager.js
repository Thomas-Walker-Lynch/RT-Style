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
     The white page ,and the blank that follows it.

     Two faults ,and they were being treated as one.

     The first is that the canvas takes its colour from the root ,and until
     something sets it the browser paints its own default. The colour was being
     applied when the theme compiled ,in the element phase — after the whole
     document had parsed. On a book carrying MathJax that is seconds of white.
     But the colour is knowable far earlier than that: RT.theme_preference runs
     in the head ,at parse time ,and RT.load's document.write ordering means
     every theme is loaded before it. So the theme applies its screen colour
     the moment it resolves ,and the canvas is never white at all. Remembering
     the last colour was a workaround for a problem that did not need one; it
     is kept only for the window before the theme call ,where it costs nothing.

     The second is what the reader is shown while the work is done. Hiding the
     root hides the progress panel with it — visibility inherits — and leaves
     the canvas background in doubt ,since a root with visibility hidden is a
     poor thing to be relying on to paint. So the lock is a class on the root
     that hides the contents of the body and excepts the panel. Backgrounds
     paint normally ,because nothing about the root is hidden any more.

     Both live in one stylesheet ,written into the head at parse time.
  --------------------------------------------------------------- */

  const boot_style_id = 'RT·boot-style';
  const screen_color_key = 'RT-Manuscript·screen_color';
  const lock_class = 'RT·locked';

  function boot_style(){
    let el = document.getElementById(boot_style_id);
    if(el) return el;
    el = document.createElement('style');
    el.id = boot_style_id;
    el.textContent = boot_style_text('');
    (document.head || document.documentElement).appendChild(el);
    return el;
  }

  /* The panel is animated by CSS and not by script ,which is the whole of why
     it works. A phase holds the main thread from beginning to end ,so anything
     driven from script stops dead for the length of it — which is exactly the
     interval the reader most needs to see movement in. Transform and opacity
     animate off the main thread ,so they keep running while a phase blocks.

     The bar creeps rather than reports. It is not tied to the phases and does
     not claim to be: it eases toward the end without arriving ,which is honest
     about not knowing how long the work will take ,and it is always moving ,
     which is the one thing the reader needs to see.

     The panel fades in on a delay ,so a book that formats quickly never shows
     it. That is done in the animation rather than in a timer for the same
     reason as the bar: a timer would not fire. */
  function boot_style_text(screen_color){
    return (screen_color ? 'html ,body{ background-color:' + screen_color + '; }\n' : '')
      + 'html.' + lock_class + ' body > *{ visibility:hidden; }\n'
      + 'html.' + lock_class + ' #RT·progress{ visibility:visible; }\n'
      + '#RT·progress{ position:fixed; top:0; left:0; right:0; bottom:0;'
      + ' z-index:2147483647; display:flex; flex-direction:column;'
      + ' align-items:center; justify-content:center; gap:1.1rem;'
      + ' pointer-events:none; color:#8a8a8a; opacity:0;'
      + " font:400 1rem/1.4 'Noto Sans JP' ,Arial ,sans-serif;"
      + ' animation:RT·progress-appear 300ms ease-out 400ms forwards; }\n'
      + '#RT·progress .RT·progress-label{ letter-spacing:0.08em; }\n'
      + '#RT·progress .RT·progress-dot{ opacity:0.15;'
      + ' animation:RT·progress-blink 1.4s ease-in-out infinite; }\n'
      + '#RT·progress .RT·progress-dot:nth-child(2){ animation-delay:0.2s; }\n'
      + '#RT·progress .RT·progress-dot:nth-child(3){ animation-delay:0.4s; }\n'
      + '#RT·progress .RT·progress-track{ width:min(18rem ,60vw); height:2px;'
      + ' background:currentColor; opacity:0.2; overflow:hidden; }\n'
      + '#RT·progress .RT·progress-bar{ width:100%; height:100%;'
      + ' background:currentColor; transform:scaleX(0);'
      + ' transform-origin:left center;'
      + ' animation:RT·progress-creep 40s cubic-bezier(0 ,0.7 ,0.15 ,1) forwards; }\n'
      + '#RT·progress .RT·progress-time{ font-size:0.8rem; opacity:0.5;'
      + ' font-variant-numeric:tabular-nums; }\n'
      + '@keyframes RT·progress-appear{ to{ opacity:1; } }\n'
      + '@keyframes RT·progress-blink{ 0% ,100%{ opacity:0.15; } 50%{ opacity:0.9; } }\n'
      + '@keyframes RT·progress-creep{ to{ transform:scaleX(0.96); } }\n';
  }

  /* The screen colour ,written where it takes effect before the first paint.
     Given to this from the theme the moment the theme resolves ,and again from
     the layout configuration later ,which is the same colour by a longer road
     and costs nothing to repeat. */
  window.RT.screen_color_apply = function(color){
    if(!color) return;
    boot_style().textContent = boot_style_text(color);
    try{ localStorage.setItem(screen_color_key ,color); }catch(e){}
  };

  function screen_color_read(){
    try{ return localStorage.getItem(screen_color_key); }
    catch(e){ return null; }
  }

  function prepaint_screen(){
    boot_style();
    const color = screen_color_read();
    if(color) window.RT.screen_color_apply(color);
  }

  /* ---------------------------------------------------------------
     Telling the reader that the wait is work.

     A blank that lasts eight seconds and a blank that has hung are the same
     blank. The reader cannot tell them apart ,so they reload ,which starts the
     eight seconds again.

     The panel is raised as early as there is a body to hang it on ,which is
     during parsing and well before the pipeline begins. It is not raised on a
     timer ,because a timer does not fire while a phase holds the thread ,and
     the phases are the whole of the wait.
  --------------------------------------------------------------- */

  const progress = { panel: null ,time: null ,start: 0 ,timer: 0 };

  function progress_make(){
    const panel = document.createElement('div');
    panel.id = 'RT·progress';

    const label = document.createElement('div');
    label.className = 'RT·progress-label';
    label.appendChild(document.createTextNode('Loading'));
    for(let i = 0; i < 3; i++){
      const dot = document.createElement('span');
      dot.className = 'RT·progress-dot';
      dot.textContent = ' .';
      label.appendChild(dot);
    }

    const track = document.createElement('div');
    track.className = 'RT·progress-track';
    const bar = document.createElement('div');
    bar.className = 'RT·progress-bar';
    track.appendChild(bar);

    const time = document.createElement('div');
    time.className = 'RT·progress-time';

    panel.appendChild(label);
    panel.appendChild(track);
    panel.appendChild(time);

    progress.panel = panel;
    progress.time = time;
    return panel;
  }

  /* Raised on the first frame at which a body exists. Frames are served while
     the document is still parsing ,so on a long head — a book carrying MathJax
     has one — the panel is up before the pipeline has been reached. */
  function progress_raise(){
    if(progress.panel) return;
    progress.start = performance.now();

    const attempt = function(){
      if(!is_layout_locked) return;
      if(document.body){
        document.body.appendChild(progress_make());
        return;
      }
      requestAnimationFrame(attempt);
    };
    requestAnimationFrame(attempt);
  }

  /* The count advances at phase boundaries and not within them ,since a phase
     holds the thread. The bar carries the motion; this carries the magnitude. */
  function progress_report(){
    if(!progress.time) return;
    const seconds = (performance.now() - progress.start) / 1000;
    progress.time.textContent = seconds.toFixed(1) + ' s';
  }

  function progress_end(){
    const panel = progress.panel;
    progress.panel = null;
    progress.time = null;
    if(progress.timer){ clearTimeout(progress.timer); progress.timer = 0; }
    if(!panel || !panel.parentNode) return;

    /* Filled and faded rather than snatched away. An animation outranks an
       inline declaration ,so each is stood down before its property is set. */
    const bar = panel.querySelector('.RT·progress-bar');
    if(bar){
      bar.style.animation = 'none';
      bar.style.transition = 'transform 160ms ease-out';
      bar.style.transform = 'scaleX(1)';
    }
    panel.style.animation = 'none';
    panel.style.transition = 'opacity 220ms ease-out';
    panel.style.opacity = '0';
    progress.timer = setTimeout(() => panel.remove() ,260);
  }

  function lock_layout(){
    is_layout_locked = true;
    document.documentElement.classList.add(lock_class);
  }

  /* The safety net must not fire while the pipeline is still working.

     It used to be harmless. The pipeline ran to completion inside the
     DOMContentLoaded handler ,so by the time load fired there was nothing left
     to protect and unlocking was a no-op. Yielding between phases broke that:
     load now arrives in the middle of the run — usually within a frame or two
     of DOMContentLoaded — and the net would lift the curtain on a document
     that had been chunked into pages but not yet counted or resolved.

     That is precisely the fault of a title page appearing alone against a
     black field ,with the rest of the book arriving some seconds later. It was
     not slow rendering being glimpsed. It was the curtain going up early ,and
     the pipeline then finishing in plain view.

     So the net catches only the case it was meant for: a pipeline that never
     started. One that has started ends by unlocking itself ,whether its
     phases succeed or fail ,since every task is already run inside a guard. */
  let pipeline_state = 'idle';

  function unlock_on_load(){
    if(pipeline_state === 'running') return;
    unlock_layout();
  }

  function unlock_layout(){
    if(!is_layout_locked) return;
    is_layout_locked = false;

    progress_end();

    document.documentElement.classList.remove(lock_class);
    window.removeEventListener("load" ,unlock_on_load);
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
    if(pipeline_state !== 'idle') return;
    pipeline_state = 'running';

    let index = 0;

    const step = function(){
      if(index >= window.RT.Phase.length){
        pipeline_state = 'done';
        progress_end();
        if(is_layout_locked) resolve_scroll_target();
        return;
      }

      const phase_name = window.RT.Phase[index++];
      progress_report();

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
  progress_raise();
  configure_history();
  capture_scroll_target();
  bind_window_events();

  /* A script that arrives after the document has been parsed never sees
     DOMContentLoaded ,and would wait for an event that has already gone by.
     The URL-only locator can land in exactly that position. */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded' ,run_pipeline);
  }else{
    run_pipeline();
  }

  // Safety net: restore visibility on load if the pipeline never started.
  window.addEventListener("load" ,unlock_on_load);

})();
