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

     The canvas takes its colour from the root ,and until something sets it the
     browser paints its own default. The colour was being applied when the
     theme compiled ,in the element phase — after the whole document had
     parsed. On a book carrying MathJax that is seconds of white. But the
     colour is knowable far earlier: RT.theme_preference runs in the head ,at
     parse time ,and RT.load's document.write ordering means every theme is
     loaded before it. So the theme applies its screen colour the moment it
     resolves ,and the canvas is never white at all.

     The colour is written to the root as an inline style ,which is how every
     other element in this engine is styled. An earlier version of this put it
     in a style sheet injected into the head. That was wrong twice over: the
     engine keeps no style sheet ,so it introduced the one surface where
     unrelated rules would accumulate ,and a sheet built as a string in a
     source file is worse than a file for the purpose ,being invisible to
     anyone looking for one.

     The root's background reaches the canvas whether or not the root is
     visible ,which is what makes the lock below and this colour independent of
     each other.

     Remembering the last colour is kept ,for the window before the theme call
     ,where it costs nothing.
  --------------------------------------------------------------- */

  const screen_color_key = 'RT-Manuscript·screen_color';

  window.RT.screen_color_apply = function(color){
    if(!color) return;
    document.documentElement.style.backgroundColor = color;
    if(document.body) document.body.style.backgroundColor = color;
    try{ localStorage.setItem(screen_color_key ,color); }catch(e){}
  };

  function screen_color_read(){
    try{ return localStorage.getItem(screen_color_key); }
    catch(e){ return null; }
  }

  function prepaint_screen(){
    window.RT.screen_color_apply(screen_color_read());
  }

  /* ---------------------------------------------------------------
     Telling the reader that the wait is work.

     A blank that lasts eight seconds and a blank that has hung are the same
     blank. The reader cannot tell them apart ,so they reload ,which starts the
     eight seconds again.

     The panel is raised as early as there is a body to hang it on ,which is
     during parsing and well before the pipeline begins. Not on a timer: a
     timer does not fire while a phase holds the thread ,and the phases are the
     whole of the wait.

     Movement is animated ,and the animations are built through the animation
     interface rather than declared in key frames ,because key frames cannot be
     written as an inline style and the engine keeps no style sheet to put them
     in. The interface takes the same key frames as an argument and hands
     transform and opacity to the compositor exactly as a declared animation
     would ,which is the property that matters here: a phase holds the main
     thread for its whole length ,so anything driven from script stops dead for
     precisely the interval the reader most needs to see movement in.

     The bar creeps rather than reports. It is not tied to the phases and does
     not claim to be: it eases toward the end without arriving ,which is honest
     about not knowing how long the work will take ,and it is always moving.
  --------------------------------------------------------------- */

  const progress = {
    panel: null ,time: null ,bar: null ,log: null
    ,line: null ,line_name: null ,line_phase: '' ,start: 0 ,timer: 0
  };

  // Every animation this file starts ,so each is honoured or skipped together.
  function animate(el ,frame_seq ,timing){
    if(!el || typeof el.animate !== 'function') return null;
    try{ return el.animate(frame_seq ,timing); }
    catch(e){ return null; }
  }

  function style_write(el ,dict){
    for(const key in dict) el.style[key] = dict[key];
    return el;
  }

  // Three dots that rise and fall in turn. Used by the Loading line and by
  // whichever phase is currently running.
  function dot_seq_append(parent){
    for(let i = 0; i < 3; i++){
      const dot = document.createElement('span');
      dot.textContent = ' .';
      style_write(dot ,{ opacity: '0.15' });
      parent.appendChild(dot);
      animate(dot ,[{ opacity: 0.15 } ,{ opacity: 0.9 } ,{ opacity: 0.15 }]
        ,{ duration: 1400 ,delay: i * 200 ,iterations: Infinity });
    }
    return parent;
  }

  function progress_make(){
    const panel = document.createElement('div');
    panel.id = 'RT·progress';
    style_write(panel ,{
      position: 'fixed' ,top: '0' ,left: '0' ,right: '0' ,bottom: '0'
      ,zIndex: '2147483647'
      /* The root is hidden and visibility inherits ,so the panel says
         otherwise for itself. */
      ,visibility: 'visible'
      ,display: 'flex' ,flexDirection: 'column'
      ,alignItems: 'center' ,justifyContent: 'center' ,gap: '1.1rem'
      ,pointerEvents: 'none' ,color: '#8a8a8a'
      ,font: "400 1rem/1.4 'Noto Sans JP' ,Arial ,sans-serif"
      ,opacity: '0'
    });

    const label = document.createElement('div');
    style_write(label ,{ letterSpacing: '0.08em' });
    label.appendChild(document.createTextNode('Loading'));
    dot_seq_append(label);

    /* The dimming is in the track's own colour ,not in an opacity over it. An
       opacity establishes a group ,and the bar is inside it ,so a translucent
       track made the bar translucent too — and both were drawn in the same
       colour ,which left the filled part of the groove identical to the empty
       part. The bar swept across for the whole of a long load and could not be
       seen doing it. */
    const track = document.createElement('div');
    style_write(track ,{
      width: 'min(18rem ,60vw)' ,height: '3px' ,borderRadius: '2px'
      ,background: 'rgba(138 ,138 ,138 ,0.22)' ,overflow: 'hidden'
    });

    const bar = document.createElement('div');
    style_write(bar ,{
      width: '100%' ,height: '100%' ,borderRadius: '2px'
      ,background: '#c9c9c9'
      ,transform: 'scaleX(0)' ,transformOrigin: 'left center'
      ,willChange: 'transform'
    });
    track.appendChild(bar);

    const time = document.createElement('div');
    style_write(time ,{
      fontSize: '0.85rem' ,color: '#8f8f8f' ,fontVariantNumeric: 'tabular-nums'
    });

    /* The phase log ,on the screen rather than in the console.

       A reader who reports that a book will not open sends a photograph of
       what is in front of them ,not a console transcript ,and the console is
       no help in any case: the debug tokens are read when the pipeline runs ,
       so enabling one afterwards is too late to have recorded anything. A line
       per phase ,left where anybody can see it ,makes the screenshot the
       report. The phase that was running when the picture was taken is the one
       still carrying its dots.

       Left aligned inside a centred block ,so the times form a column rather
       than a ragged edge. */
    const log = document.createElement('div');
    style_write(log ,{
      marginTop: '0.4rem' ,textAlign: 'left'
      ,fontSize: '0.8rem' ,color: '#6f6f6f'
      ,fontVariantNumeric: 'tabular-nums' ,lineHeight: '1.5'
      ,minWidth: 'min(18rem ,60vw)'
    });

    panel.appendChild(label);
    panel.appendChild(track);
    panel.appendChild(time);
    panel.appendChild(log);

    /* Raised on a delay ,so a book that formats quickly never shows it. In the
       animation and not in a timer ,for the same reason as everything else
       here. */
    animate(panel ,[{ opacity: 0 } ,{ opacity: 1 }]
      ,{ duration: 300 ,delay: 400 ,easing: 'ease-out' ,fill: 'both' });

    progress.bar_animation = animate(bar
      ,[{ transform: 'scaleX(0)' } ,{ transform: 'scaleX(0.96)' }]
      ,{ duration: 45000 ,easing: 'cubic-bezier(0 ,0.75 ,0.2 ,1)' ,fill: 'forwards' });

    // Nothing animates where the interface is absent ,so the panel is at least
    // legible rather than invisible at zero opacity.
    if(!progress.bar_animation) style_write(panel ,{ opacity: '1' });

    progress.panel = panel;
    progress.time = time;
    progress.bar = bar;
    progress.log = log;
    return panel;
  }

  /* A phase opens a line and keeps it until it closes. While it is open the
     line carries the task it has reached ,so a stall is pinned to one task
     rather than to a whole phase. */
  function progress_phase_begin(phase_name){
    if(!progress.log) return;
    const line = document.createElement('div');
    const name = document.createElement('span');
    name.textContent = phase_name;
    line.appendChild(name);
    progress.line = line;
    progress.line_name = name;
    progress.line_phase = phase_name;
    progress.log.appendChild(line);
    dot_seq_append(line);
  }

  function progress_task(index ,count){
    if(!progress.line_name) return;
    progress.line_name.textContent = count > 1
      ? progress.line_phase + '  ' + index + '/' + count
      : progress.line_phase;
  }

  function progress_phase_end(phase_name ,seconds){
    if(!progress.line) return;
    progress.line.textContent = phase_name + '  ' + seconds.toFixed(2) + ' s';
    style_write(progress.line ,{ color: '#5a5a5a' });
    progress.line = null;
    progress.line_name = null;
  }

  function progress_raise(){
    if(progress.panel) return;
    progress.start = performance.now();

    const attempt = function(){
      if(!is_layout_locked || progress.panel) return;
      if(document.body){
        document.body.appendChild(progress_make());
        return;
      }
      requestAnimationFrame(attempt);
    };

    /* Immediately where there is already a body — which is the case by the
       time the pipeline starts — and on a frame otherwise ,which is the case
       during parsing. Waiting for a frame in both cases lost the first phase's
       line ,the panel not yet existing when that phase opened it. */
    attempt();
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
    const bar = progress.bar;
    const bar_animation = progress.bar_animation;
    progress.panel = null;
    progress.time = null;
    progress.bar = null;
    progress.bar_animation = null;
    progress.log = null;
    progress.line = null;
    progress.line_name = null;
    if(progress.timer){ clearTimeout(progress.timer); progress.timer = 0; }
    if(!panel || !panel.parentNode) return;

    // Filled and faded rather than snatched away.
    if(bar && bar_animation){
      bar_animation.cancel();
      style_write(bar ,{ transform: 'scaleX(1)' });
      animate(bar ,[{ transform: 'scaleX(0.96)' } ,{ transform: 'scaleX(1)' }]
        ,{ duration: 160 ,easing: 'ease-out' });
    }

    const fade = animate(panel ,[{ opacity: 1 } ,{ opacity: 0 }]
      ,{ duration: 220 ,delay: 120 ,easing: 'ease-out' ,fill: 'forwards' });

    if(fade) fade.onfinish = () => panel.remove();
    else progress.timer = setTimeout(() => panel.remove() ,260);
  }

  function lock_layout(){
    is_layout_locked = true;
    document.documentElement.style.visibility = 'hidden';
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

    document.documentElement.style.visibility = '';
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

  /* One task per turn ,as the phases are run one per turn.

     The schedule already states that tasks within a phase are mutually
     independent — it is the reason the shuffle token exists — so handing the
     thread back between them is safe by construction rather than by hope.

     What it buys is that the elapsed count advances at every task rather than
     at every phase. It stood at six seconds and then leapt to forty two ,
     because there were two yields in the whole run and the reader was looking
     at a number sampled before most of the work began.

     It does not buy a count that moves during a task. Nothing can: a task
     holds the thread for its whole length and the browser cannot paint while
     it does. Where one task carries most of a long load the count will still
     sit. The bar keeps moving regardless ,being animated off the main thread ,
     which is why the bar and not the number is what the panel leans on.

     Each task is timed under the stage token ,which is how the task carrying
     most of a long load is identified rather than guessed at.
  */
  function run_phase(phase_name ,when_done){
    const debug = window.RT.Debug;
    let task_seq = window.RT.Task[phase_name];

    if(debug.active_tokens.has('shuffle')){
      task_seq = shuffled(task_seq);
      debug.log('stage' ,'phase ' + phase_name + ': task order shuffled');
    }

    let index = 0;

    /* The task is announced ,then the thread is handed back so the
       announcement is painted ,and only then is the task run. Announcing after
       the fact would name the task that has finished ,which is the one thing
       nobody needs to know: a screenshot of a book that will not open should
       name the task it is inside. */
    const next = function(){
      if(index >= task_seq.length){ when_done(); return; }

      progress_task(index + 1 ,task_seq.length);
      progress_report();

      next_frame(function(){
        const task_fn = task_seq[index++];
        const task_start = performance.now();

        try{ task_fn(); }
        catch(e){ debug.error('stage' ,phase_name + ' task failed: ' + e); }

        debug.log('stage' ,'  ' + phase_name + ' task ' + index + ' of '
          + task_seq.length + ': '
          + ((performance.now() - task_start) / 1000).toFixed(2) + ' s');

        next();
      });
    };

    next();
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

      progress_phase_begin(phase_name);

      next_frame(function(){
        window.RT.Debug.log('stage' ,'phase: ' + phase_name);
        const phase_start = performance.now();

        run_phase(phase_name ,function(){
          const phase_seconds = (performance.now() - phase_start) / 1000;
          window.RT.Debug.log('stage' ,phase_name + ' total '
            + phase_seconds.toFixed(2) + ' s');
          progress_phase_end(phase_name ,phase_seconds);

          /* The reader is let in here ,and the remaining phases go on behind
             them. Scroll is settled first ,or the reader would be shown the
             top of the book and then moved. */
          if(phase_name === window.RT.Phase_reveal && is_layout_locked){
            progress_end();
            resolve_scroll_target();
          }

          step();
        });
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
