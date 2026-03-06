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

    // CSS injection for headers, lists, etc., goes here 
    // (Omitted for brevity, but carried over from the original file)
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
