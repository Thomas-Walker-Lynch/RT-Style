(function(){
  const RT = window.RT = window.RT || {};
  const debug = RT.debug || { log: function(){} };

  let target_y = 0;
  let is_reload = false;
  let is_layout_locked = true;
  let scroll_timer;

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

  function load_elements(){
    // The specific elements requested by the layout
    RT.load('Element/counter');
    RT.load('Element/chapter');
    RT.load('Element/endnote');
    RT.load('Element/math');
    RT.load('Element/code');
    RT.load('Element/term');
    RT.load('Element/TOC');
    RT.load('Element/title');
    RT.load('Element/symbol');
    RT.load('Element/constraint');
    RT.load('Element/crossref');

    RT.load('Layout/paginate_by_element');
    RT.load('Layout/page_fixed_glow');
  }

  function apply_style_rule(selector ,rules){
    document.querySelectorAll(selector).forEach( (el) => {
      for (let prop in rules) {
        if (typeof rules[prop] === 'string' && rules[prop].indexOf('!important') !== -1) {
          const kebab_prop = prop.replace(/[A-Z]/g ,m => "-" + m.toLowerCase());
          const value = rules[prop].replace(' !important' ,'');
          el.style.setProperty(kebab_prop ,value ,'important');
        } else {
          el.style[prop] = rules[prop];
        }
      }
    });
  }

  function apply_style(){
    // Note: This will be updated to read from window.RT.theme('read', ...) 
    // in the next iteration.
    RT.config = RT.config || {};
    RT.config.article = {
      font_family: "'Noto Sans JP', Arial, sans-serif"
      ,line_height: "1.8"       
      ,font_size: "16px"        
      ,font_weight: "400"
      ,max_width: "46.875rem" 
      ,margin: "0 auto"
    };
    
    if( RT.config.theme && RT.config.theme.meta_is_dark === false ){
      RT.config.article.font_weight = "600";
    }

    window.RT.config.page = window.RT.config.page || {};
    window.RT.config.page.height_limit = 900; 

    const conf = RT.config.article;

    apply_style_rule('body, html, RT·article' ,{ overflowAnchor: "none !important" });
    apply_style_rule('RT·article', {
      display: "block",
      fontFamily: conf.font_family,
      fontSize: conf.font_size,
      lineHeight: conf.line_height,
      fontWeight: conf.font_weight,
      maxWidth: conf.max_width + " !important",
      margin: conf.margin,
      backgroundColor: RT.config.theme.surface_0,
      color: RT.config.theme.content_main,
      boxSizing: "border-box !important"
    });
    
    apply_style_rule('RT·article:not(:has(RT·page))' ,{ padding: "3rem !important" });
    apply_style_rule('RT·article:has(RT·page)' ,{ padding: "0 !important" });
    apply_style_rule('RT·article RT·page' ,{
      position: "relative",
      display: "block",
      padding: "3rem",
      margin: "1.25rem auto",
      backgroundColor: RT.config.theme.surface_0,
      boxShadow: `0 0 0.625rem ${RT.config.theme.brand_primary}`
    });

    apply_style_rule('RT·article h1' ,{ fontSize: "1.5rem", textAlign: "center", color: RT.config.theme.brand_primary, fontWeight: "500", marginTop: "1.5rem", lineHeight: "1.15" });
    apply_style_rule('RT·article h2' ,{ fontSize: "1.25rem", color: RT.config.theme.brand_secondary, textAlign: "left", marginTop: "2rem", marginLeft: "0" });
    apply_style_rule('RT·article h3' ,{ fontSize: "1.125rem", color: RT.config.theme.brand_tertiary, textAlign: "left", marginTop: "1.5rem", marginLeft: "4ch" });
    apply_style_rule('RT·article h4' ,{ fontSize: "1.05rem", color: RT.config.theme.content_main, fontWeight: "600", textAlign: "left", marginTop: "1.25rem", marginLeft: "8ch" });
    apply_style_rule('RT·article p, RT·article ul, RT·article ol' ,{ color: RT.config.theme.content_main, textAlign: "justify", marginBottom: "1rem", marginLeft: "0" });
    apply_style_rule('RT·article li' ,{ marginBottom: "0.5rem" });
    apply_style_rule('RT·article RT·code' ,{ fontFamily: "'Courier New', Courier, monospace", backgroundColor: RT.config.theme.surface_code, padding: "0.125rem 0.25rem", color: RT.config.theme.content_main });
    apply_style_rule('RT·article img' ,{ maxWidth: "100%", height: "auto", display: "block", margin: "1.5rem auto" });
  }

  function execute_pagination_and_scroll(){
    debug.log('scroll' ,`8. Pagination layout starting.`);
    if(RT.paginate_by_element) RT.paginate_by_element();
    if(RT.page) RT.page();
    
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

  function unlock_layout(){
    if (!is_layout_locked) return;
    is_layout_locked = false;
    document.dispatchEvent(new Event("RT_layout_complete"));
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
      is_layout_locked = true;
    });
  }

  // Execution Outline
  configure_history();
  capture_scroll_target();
  load_elements();
  bind_window_events();
  
  document.addEventListener('DOMContentLoaded', () => {
    apply_style();             
    
    if (window.RT.document_loaded) {
      window.RT.document_loaded(execute_pagination_and_scroll);
    } else {
      execute_pagination_and_scroll();
    }
  });

})();
