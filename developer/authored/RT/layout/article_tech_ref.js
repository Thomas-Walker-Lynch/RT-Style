(function(){
  const RT = window.StyleRT = window.StyleRT || {};

  // 1. Declare Dependencies with updated core/ and layout/ paths
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

  // 2. The Typography Layout (Adapted from the original)
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

    // CSS injection for headers, lists, and layout mapped from theme variables
    // 1. Adjust paginator capacity to fit the physical page minus padding
    window.StyleRT = window.StyleRT || {};
    window.StyleRT.config = window.StyleRT.config || {};
    window.StyleRT.config.page = window.StyleRT.config.page || {};
    // 1056px - 96px (padding) = 960px usable. 920px leaves room for the footer.
    window.StyleRT.config.page.height_limit = 920; 

    // 2. CSS injection for headers, lists, and layout mapped from theme variables
    const style_node = document.createElement("style");
    style_node.innerHTML = `
      rt-article {
        font-family: 'Noto Sans JP', Arial, sans-serif;
        background-color: var(--rt-surface-0);
        color: var(--rt-content-main);
        /* Force width so inline JS doesn't widen the measurement area */
        max-width: 46.875rem !important; 
        box-sizing: border-box !important;
      }
      
      /* PRE-PAGINATION: Mimic page padding so text line-wraps accurately during measurement */
      rt-article:not(:has(rt-page)) {
        padding: 3rem !important; 
      }
      
      /* POST-PAGINATION: Remove article padding so we don't double-pad the generated pages */
      rt-article:has(rt-page) {
        padding: 0 !important;
      }

      rt-article rt-page {
        display: block;
        padding: 3rem;
        margin: 1.25rem auto;
        background-color: var(--rt-surface-0);
        box-shadow: 0 0 0.625rem var(--rt-brand-primary);
      }
      
      /* --- HEADER CASCADE --- */
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

      /* --- BODY TEXT (Flush Left) --- */
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
      
      /* --- CODE FORMATTING --- */
      rt-article rt-code {
        font-family: 'Courier New', Courier, monospace;
        background-color: var(--rt-surface-code);
        padding: 0.125rem 0.25rem;
        color: var(--rt-content-main);
      }
    `;
    document.head.appendChild(style_node);
  };

  // 3. The Execution Sequence
  const run_semantics = function(){
    if(RT.theme) RT.theme();     
    RT.article(); 
    
    // Call the newly renamed element functions
    if(RT.title) RT.title(); 
    if(RT.term) RT.term();
    if(RT.math) RT.math();
    if(RT.code) RT.code();

    // Check for MathJax typesetting
    if(window.MathJax && MathJax.Hub && MathJax.Hub.Queue){
      MathJax.Hub.Queue( ["Typeset" ,MathJax.Hub] ,run_layout );
    }else{
      run_layout();
    }
  };

  const run_layout = function(){
    if(RT.TOC) RT.TOC();
    if(RT.paginate_by_element) RT.paginate_by_element();
    if(RT.page) RT.page();
    if(RT.body_visibility_visible) RT.body_visibility_visible();
  };

  // 4. Bind to DOM Ready
  // This replaces the need to put a script at the bottom of the HTML body
  document.addEventListener( 'DOMContentLoaded' ,run_semantics );

})();
