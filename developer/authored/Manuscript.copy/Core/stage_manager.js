// Core/stage_manager.js

RT = RT || {};
RT.Element = RT.Element || new Set();

(function(){
  const debug = RT.Debug || { log: function(){} };
  
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

  function execute_pagination_and_scroll(){
    debug.log('scroll' ,`Pagination layout starting.`);
    if(RT.paginate_by_element) RT.paginate_by_element();
    
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

  function process_elements_and_layout() {
    debug.log('lifecycle', 'Processing registered elements.');

    if (RT.Element instanceof Set && RT.Element.size > 0) {
      for (const element_fn of RT.Element) {
        if (typeof element_fn === 'function') {
          element_fn();
        } else {
          // Fallback warning if your debug utility is not available
          if (RT.Debug?.warn) {
            RT.Debug.warn('layout', 'Invalid element in RT.Element Set: ' + element_fn);
          } else {
            console.warn('Invalid element in RT.Element Set:', element_fn);
          }
        }
      }
    }

    if (window.MathJax && MathJax.Hub && MathJax.Hub.Queue) {
      MathJax.Hub.Queue(["Typeset", MathJax.Hub], execute_pagination_and_scroll);
    } else {
      execute_pagination_and_scroll();
    }
  }


  // Initial Execution
  lock_layout();
  configure_history();
  capture_scroll_target();
  bind_window_events();
  
  document.addEventListener('DOMContentLoaded', process_elements_and_layout);

  // Safety Net: restore visibility on load if layout engine hangs
  window.addEventListener("load", unlock_layout);
  
})();
