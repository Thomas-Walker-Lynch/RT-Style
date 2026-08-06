/*
  Core/stage_manager.js
  Orchestrates the execution pipeline to resolve layout dependencies
  and handles scroll restoration.
*/

(function(){

  if(!window.RT){
    console.error("RT not defined - was RT-Manuscript_make run?");
    return;
  }

  // Inject Utilities prior to execution
  window.RT.load('Core/utility');

  // Prevent duplicate initialization
  if(window.RT.Element instanceof Set){
    console.warn("RT stage_manager already initialized. Aborting duplicate run.");
    return;
  }
  
  /* Phase task queues/functions in order the phases are processed.

     Generators and element styling must run before pagination. Even styling changes the size of the document.

     Page styling can only happen after the pages are added. Pages are
     element pairs, the content is what is on the page.

     The document can only be walked for counters after the pages are added, because pages have page numbers. (Even if the document is not paginated, the counters can not be processed until after the endnote generators, or any other elements that have counters, run.)

     The paginate_0 breaks the document into <page> ... </page> elements. It will break some elements, but not others. As examples, it breaks lists and tables, but does not break paragraphs. It has a target length, but will lengthen or shorten a page so that the content fits.

     Not breaking paragraphs simplifies pagination, especially in light of the possible embedding of other elements. It is also nice to read a paragraph without page breaks in them. Footnotes can change page length a small amount due to being formatted. This is handled during pagination_0.

     Pages have page numbers, which are counters. So counters come after pagination.

     Cross reference targets can have counters in them, so they are handled after counters.

     Adding counter values and cross references can cause the content of a page to lengthen. Rather than having that cascade, which could change page number cross reference text, We merely lengthen pages as required.
  */
  window.RT.Element = new Set();      // expand generators, style elements
  window.RT.paginate_0 = null;        // add the <page> ... </page> pairs
  window.RT.PageStyle = new Set();    // apply style to pages
  window.RT.counter = null;           // walk doc for counters, then read snapshots
  window.RT.note = null;              // mark notes, read them back, any order
  window.RT.paginate_1 = null;        // bump individual pages lengths up as needed
  
  const debug = window.RT.Debug || { log: function(){} ,warn: function(){} ,error: function(){} };
  
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
  // MASTER PIPELINE EXECUTION
  // =========================================================

  function run_pipeline(){
    
    // Phase 1: Base Elements
    debug.log('stage_manager' ,'Phase 1: Executing Element tasks');
    if(window.RT.Element.size > 0){
      for(const element_fn of window.RT.Element){
        if(typeof element_fn === 'function'){
          try{ element_fn(); }
          catch(e){ debug.error('stage_manager' ,"Element task failed: " + e); }
        }
        else {
          debug.warn('stage_manager' ,'Invalid element in RT.Element Set: ' + element_fn);
        }
      }
    }

    // Phase 2: Pagination Part 0
    debug.log('stage_manager' ,'Phase 2: Executing paginate_0');
    if(typeof window.RT.paginate_0 === 'function'){
      try{ window.RT.paginate_0(); } 
      catch(e){ debug.error('stage_manager' ,"paginate_0 failed: " + e); }
    }
    else {
      debug.log('stage_manager' ,'No paginate_0 function registered. Skipping.');
    }

    // Phase 3: Page Styling
    debug.log('stage_manager' ,'Phase 3: Executing PageStyle tasks');
    if(window.RT.PageStyle.size > 0){
      for(const style_fn of window.RT.PageStyle){
        if(typeof style_fn === 'function'){
          try{ style_fn(); } 
          catch(e){ debug.error('stage_manager' ,"PageStyle task failed: " + e); }
        }
      }
    }

    // Phase 4: Counters
    debug.log('stage_manager' ,'Phase 4: Executing counter processing');
    if(typeof window.RT.counter === 'function'){
      try{ window.RT.counter(); } 
      catch(e){ debug.error('stage_manager' ,"Counter processing failed: " + e); }
    }

    // Phase 5: Cross Reference
    debug.log('stage_manager' ,'Phase 5: Executing note processing');
    if(typeof window.RT.note === 'function'){
      try{ window.RT.note(); } 
      catch(e){ debug.error('stage_manager' ,"Cross reference processing failed: " + e); }
    }

    // Phase 6: Pagination Part 1
    debug.log('stage_manager' ,'Phase 6: Executing paginate_1');
    if(typeof window.RT.paginate_1 === 'function'){
      try{ window.RT.paginate_1(); } 
      catch(e){ debug.error('stage_manager' ,"paginate_1 failed: " + e); }
    }

    // Final Step: Resolve Scroll Target
    debug.log('scroll' ,`Pipeline execution complete. Enforcing scroll target.`);
    let final_target = target_y;
    let use_hash = false;
    
    if(window.location.hash && !is_reload){
        const hash_target = document.getElementById(window.location.hash.substring(1));
        if(hash_target) use_hash = true;
    }

    enforce_scroll(final_target ,use_hash ,0);
  }

  // =========================================================
  // INITIALIZATION
  // =========================================================
  
  lock_layout();
  configure_history();
  capture_scroll_target();
  bind_window_events();
  
  document.addEventListener('DOMContentLoaded' ,run_pipeline);

  // Safety Net: restore visibility on load if the async layout engine hangs
  window.addEventListener("load" ,unlock_layout);
  
})();
