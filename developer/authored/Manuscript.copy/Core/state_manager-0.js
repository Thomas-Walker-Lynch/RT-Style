/*
  Core/stage_manager.js
  Orchestrates the execution pipeline to resolve layout dependencies,
  manages MathJax async typesetting, and handles scroll restoration.
*/

window.RT = window.RT || {};
window.RT.Element = window.RT.Element || new Set();
window.RT.PageStyle = window.RT.PageStyle || new Set();
window.RT.paginate = null;

(function(){
  const debug = window.RT.Debug || { log: function(){}, warn: function(){}, error: function(){} };
  
  let target_y = 0;
  let is_reload = false;
  let is_layout_locked = false;
  let scroll_timer;

  function lock_layout() {
    is_layout_locked = true;
    document.documentElement.style.visibility = "hidden";
  }

  function unlock_layout() {
    if (!is_layout_locked) return;
    is_layout_locked = false;
    
    document.documentElement.style.visibility = "";
    window.removeEventListener("load", unlock_layout);
    document.dispatchEvent(new Event("RT_layout_complete"));
  }

  function configure_history(){
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }

  function capture_scroll_target(){
    const raw_target = sessionStorage.getItem('RT_saved_y');
    target_y = raw_target !== null ? parseInt(raw_target ,10) : 0;
    
    if (window.performance) {
      const nav_entries = performance.getEntriesByType("navigation");
      if (nav_entries.length > 0) {
        is_reload = (nav_entries[0].type === "reload");
      } else if (performance.navigation) {
        is_reload = (performance.navigation.type === 1);
      }
    }
  }

  function enforce_scroll(target ,use_hash ,attempts){
    if (attempts > 15) {
      unlock_layout();
      return;
    }

    if (use_hash) {
      const hash_target = document.getElementById(window.location.hash.substring(1));
      if (hash_target) {
        hash_target.scrollIntoView();
      }
    } else {
      window.scrollTo(0 ,target);
    }

    let is_successful = use_hash ? true : (Math.abs(window.scrollY - target) < 5 || target === 0);
    if (is_successful && document.body.scrollHeight > 1000) { 
       setTimeout(() => {
         if (!use_hash && Math.abs(window.scrollY - target) >= 5) {
             enforce_scroll(target ,use_hash ,attempts + 1);
         } else {
             unlock_layout();
         }
       }, 100);
    } else {
       setTimeout(() => enforce_scroll(target ,use_hash ,attempts + 1) ,50);
    }
  }

  function bind_window_events(){
    window.addEventListener('scroll' ,() => {
      if (is_layout_locked) return;
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

  // Phase 2 & 3: Pagination and Page Styling
  function execute_phase_2_and_3(){
    debug.log('stage_manager', 'Phase 2: Executing Pagination');
    if (typeof window.RT.paginate === 'function') {
      try { window.RT.paginate(); } 
      catch (e) { debug.error('stage_manager', "Pagination failed: " + e); }
    }

    debug.log('stage_manager', 'Phase 3: Executing PageStyle tasks');
    if (window.RT.PageStyle instanceof Set) {
      window.RT.PageStyle.forEach(task => {
        if (typeof task === 'function') {
          try { task(); } 
          catch (e) { debug.error('stage_manager', "PageStyle task failed: " + e); }
        }
      });
    }

    // Now that final layout geometry exists, execute scroll mapping
    debug.log('scroll' ,`Pagination layout complete. Enforcing scroll target.`);
    let final_target = target_y;
    let use_hash = false;
    if (window.location.hash && !is_reload) {
        const hash_target = document.getElementById(window.location.hash.substring(1));
        if (hash_target) {
            use_hash = true;
        }
    }

    enforce_scroll(final_target ,use_hash ,0);
  }

  // Phase 1: Base Elements
  function process_elements_and_layout() {
    debug.log('stage_manager', 'Phase 1: Executing Element tasks');

    if (window.RT.Element instanceof Set && window.RT.Element.size > 0) {
      for (const element_fn of window.RT.Element) {
        if (typeof element_fn === 'function') {
          try { element_fn(); }
          catch (e) { debug.error('stage_manager', "Element task failed: " + e); }
        } else {
          debug.warn('stage_manager', 'Invalid element in RT.Element Set: ' + element_fn);
        }
      }
    }

    // Check for MathJax (Handles both v3 Promises and v2 Hub Queues)
    // We must wait for typesetting to finish before paginating, as equations change element heights.
    if (window.MathJax) {
      if (typeof window.MathJax.typesetPromise === 'function') {
        window.MathJax.typesetPromise().then(execute_phase_2_and_3).catch((err) => {
          debug.error('stage_manager', 'MathJax typeset failed: ' + err);
          execute_phase_2_and_3();
        });
      } else if (window.MathJax.Hub && window.MathJax.Hub.Queue) {
        MathJax.Hub.Queue(["Typeset", MathJax.Hub], execute_phase_2_and_3);
      } else {
        execute_phase_2_and_3();
      }
    } else {
      execute_phase_2_and_3();
    }
  }


  // Initial Execution Sequence
  lock_layout();
  configure_history();
  capture_scroll_target();
  bind_window_events();
  
  document.addEventListener('DOMContentLoaded', process_elements_and_layout);

  // Safety Net: restore visibility on load if the async layout engine hangs
  window.addEventListener("load", unlock_layout);
  
})();
