(function(){
  console.log("[RT-Scroll] 1. Initializing script.");

  // 1. Intercept native history restoration immediately
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
    console.log("[RT-Scroll] 2. history.scrollRestoration set to manual.");
  }

  // 2. Read coordinate from memory before any layout shifts occur
  const raw_target = sessionStorage.getItem('RT_saved_y');
  const target_y = raw_target !== null ? parseInt(raw_target, 10) : 0;
  
  // 3. Determine if the execution is a page reload
  let is_reload = false;
  if (window.performance) {
    const nav_entries = performance.getEntriesByType("navigation");
    if (nav_entries.length > 0) {
      is_reload = (nav_entries[0].type === "reload");
    } else if (performance.navigation) {
      is_reload = (performance.navigation.type === 1);
    }
  }

  console.log(`[RT-Scroll] 3. Target Y: ${target_y} | Is Reload: ${is_reload}`);

  // 4. The Lock
  let is_layout_locked = true;

  const RT = window.StyleRT = window.StyleRT || {};

  // 5. Declare Dependencies
  RT.include('RT/core/utility');
  RT.include('RT/element/math');
  RT.include('RT/element/code');
  RT.include('RT/element/term');
  RT.include('RT/element/TOC');
  RT.include('RT/element/title');
  RT.include('RT/element/theme_selector');
  RT.include('RT/layout/paginate_by_element');
  RT.include('RT/layout/page_fixed_glow');
  RT.include('RT/core/body_visibility_visible');

  // 6. The Typography Layout
  RT.article = function(){
    RT.config = RT.config || {};
    RT.config.article = {
      font_family: '"Noto Sans", "Segoe UI", "Helvetica Neue", sans-serif'
      ,line_height: "1.8"       
      ,font_size: "16px"        
      ,font_weight: "400"
      ,max_width: "820px" 
      ,margin: "0 auto"
    };

    if( RT.config.theme && RT.config.theme.meta_is_dark === false ){
      RT.config.article.font_weight = "600";
    }

    const conf = RT.config.article;
    const article_seq = document.querySelectorAll("RT-article");

    if(article_seq.length === 0) return;

    for(let i = 0; i < article_seq.length; i++){
      let style = article_seq[i].style;
      style.display = "block";
      style.fontFamily = conf.font_family;
      style.fontSize = conf.font_size;
      style.lineHeight = conf.line_height;
      style.fontWeight = conf.font_weight;
      style.maxWidth = conf.max_width;
      style.margin = conf.margin;
      style.padding = "0 20px";
      style.color = "var(--rt-content-main)";
    }

    window.StyleRT = window.StyleRT || {};
    window.StyleRT.config = window.StyleRT.config || {};
    window.StyleRT.config.page = window.StyleRT.config.page || {};
    window.StyleRT.config.page.height_limit = 900; 

    const style_node = document.createElement("style");
    style_node.innerHTML = `
      body, html, rt-article {
        overflow-anchor: none !important;
      }

      rt-article {
        font-family: 'Noto Sans JP', Arial, sans-serif;
        background-color: var(--rt-surface-0);
        color: var(--rt-content-main);
        max-width: 46.875rem !important; 
        box-sizing: border-box !important;
      }
      
      rt-article:not(:has(rt-page)) {
        padding: 3rem !important; 
      }
      
      rt-article:has(rt-page) {
        padding: 0 !important;
      }

      rt-article rt-page {
        position: relative;
        display: block;
        padding: 3rem;
        margin: 1.25rem auto;
        background-color: var(--rt-surface-0);
        box-shadow: 0 0 0.625rem var(--rt-brand-primary);
      }
      
      rt-article h1 {
        font-size: 1.5rem;
        text-align: center;
        color: var(--rt-brand-primary);
        font-weight: 500;
        margin-top: 1.5rem;
        line-height: 1.15;
      }
      rt-article h2 {
        font-size: 1.25rem;
        color: var(--rt-brand-secondary);
        text-align: left;
        margin-top: 2rem;
        margin-left: 0;
      }
      rt-article h3 {
        font-size: 1.125rem;
        color: var(--rt-brand-tertiary);
        text-align: left;
        margin-top: 1.5rem;
        margin-left: 4ch;
      }
      rt-article h4 {
        font-size: 1.05rem;
        color: var(--rt-content-main);
        font-weight: 600;
        text-align: left;
        margin-top: 1.25rem;
        margin-left: 8ch;
      }

      rt-article p,
      rt-article ul,
      rt-article ol {
        color: var(--rt-content-main);
        text-align: justify;
        margin-bottom: 1rem;
        margin-left: 0; 
      }
      rt-article li {
        margin-bottom: 0.5rem;
      }
      
      rt-article rt-code {
        font-family: 'Courier New', Courier, monospace;
        background-color: var(--rt-surface-code);
        padding: 0.125rem 0.25rem;
        color: var(--rt-content-main);
      }
    `;
    document.head.appendChild(style_node);
  };

  // 7. The Execution Sequence
  function run_semantics() {
    console.log(`[RT-Scroll] 4. run_semantics starting.`);
    if(RT.theme) RT.theme();     
    RT.article(); 
    if(RT.title) RT.title(); 
    if(RT.term) RT.term();
    if(RT.math) RT.math();
    if(RT.code) RT.code();

    if(window.MathJax && MathJax.Hub && MathJax.Hub.Queue){
      MathJax.Hub.Queue( ["Typeset" ,MathJax.Hub] ,run_layout );
    }else{
      run_layout();
    }
  }

  function run_layout() {
    console.log(`[RT-Scroll] 5. run_layout starting.`);
    if(RT.TOC) RT.TOC();
    if(RT.paginate_by_element) RT.paginate_by_element();
    if(RT.page) RT.page();
    if(RT.body_visibility_visible) RT.body_visibility_visible();
    
    console.log(`[RT-Scroll] 6. Pagination complete.`);

    let final_target = target_y;
    let use_hash = false;

    // Prioritize the hash only if it is NOT a page reload
    if (window.location.hash && !is_reload) {
        const hash_target = document.getElementById(window.location.hash.substring(1));
        if (hash_target) {
            use_hash = true;
        }
    }

    console.log(`[RT-Scroll] 7. Commencing viewport enforce loop. Mode: ${use_hash ? 'HASH' : 'Y-COORDINATE'}`);
    enforce_scroll(final_target, use_hash, 0);
  }

  // 8. The Enforcer Logic
  function enforce_scroll(target, use_hash, attempts) {
    if (attempts > 15) {
      console.log("[RT-Scroll] 8. Scroll enforcement timed out. Unlocking.");
      is_layout_locked = false;
      return;
    }

    if (use_hash) {
      const hash_target = document.getElementById(window.location.hash.substring(1));
      if (hash_target) {
        hash_target.scrollIntoView();
        console.log(`[RT-Scroll] 8a. Attempt ${attempts}: Scrolled to Hash Target. Y is now ${window.scrollY}`);
      }
    } else {
      window.scrollTo(0, target);
      console.log(`[RT-Scroll] 8b. Attempt ${attempts}: Scrolled to Y=${target}. Current Y is ${window.scrollY}`);
    }

    let is_successful = false;
    if (use_hash) {
       is_successful = true; 
    } else {
       is_successful = (Math.abs(window.scrollY - target) < 5 || target === 0);
    }

    if (is_successful && document.body.scrollHeight > 1000) { 
       console.log(`[RT-Scroll] 9. Viewport anchored successfully.`);
       
       // Hold the line against native browser hash jumping
       setTimeout(() => {
         if (!use_hash && Math.abs(window.scrollY - target) >= 5) {
             console.log(`[RT-Scroll] 9a. Browser late-stage rebellion detected. Re-enforcing.`);
             enforce_scroll(target, use_hash, attempts + 1);
         } else {
             is_layout_locked = false;
             console.log("[RT-Scroll] 10. Layout fully unlocked.");
         }
       }, 100);
    } else {
       setTimeout(() => enforce_scroll(target, use_hash, attempts + 1), 50);
    }
  }

  // 9. The Ledger
  let scroll_timer;
  window.addEventListener('scroll', () => {
    if (is_layout_locked) return;
    clearTimeout(scroll_timer);
    scroll_timer = setTimeout(() => {
      sessionStorage.setItem('RT_saved_y', window.scrollY);
      console.log(`[RT-Scroll] X. User stopped scrolling. Saved Y: ${window.scrollY}`);
    }, 200);
  }, { passive: true });

  window.addEventListener('beforeunload', () => {
    is_layout_locked = true;
    console.log("[RT-Scroll] Y. Page unloading. Scroll listener locked.");
  });

  // 10. Bind to DOM Ready
  document.addEventListener( 'DOMContentLoaded' ,run_semantics );

})();
