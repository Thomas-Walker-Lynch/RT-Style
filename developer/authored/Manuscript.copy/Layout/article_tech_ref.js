/*
  Layout/article_tech_ref.js
  Compiles the layout configuration dictionary and establishes the macro-environmental boundaries.
*/

(function(){

  if(!window.RT) return;

  window.RT.layout_config = {};

  const required_elements = [
    'section'
    ,'code'
    ,'endnote'
    ,'grid'
    ,'math'
    ,'term'
    ,'title'
    ,'TOC'
  ];

  const t = function(...path){ return window.RT.theme('read' ,...path); };

  function compile_configuration(){
    window.RT.layout_config = {
      surface_0: t('surface' ,'0')
      ,surface_code: t('surface' ,'code')
      ,content_main: t('content' ,'main')
      ,brand_primary: t('brand' ,'primary')
      ,brand_secondary: t('brand' ,'secondary')
      ,brand_tertiary: t('brand' ,'tertiary')
      ,border_default: t('border' ,'regular')
      ,content_muted: t('content' ,'muted')
      ,is_dark: t('meta' ,'is_dark')
      ,font_weight: t('meta' ,'is_dark') === false ? "600" : "400"
      ,font_family: "'Noto Sans JP', Arial, sans-serif"
      ,brand_link: t('brand', 'link') || '#0056b3'
      ,surface_3: t('surface', '3') || '#ccc'
      ,border_strong: t('border', 'strong')
      ,border_faint: t('border', 'faint')
    };
  }

  // Execute immediately
  compile_configuration();

  function apply_macro_boundaries(){
    const conf = window.RT.layout_config;
    const article_seq = document.querySelectorAll('RT·article');
    
    for(let i = 0; i < article_seq.length; i++){
      let style = article_seq[i].style;
      style.display = "block";
      style.fontFamily = conf.font_family;
      style.fontSize = "16px";
      style.lineHeight = "1.4";
      style.fontWeight = conf.font_weight;
      style.maxWidth = "46.875rem";
      style.margin = "0 auto";
      style.backgroundColor = conf.surface_0;
      style.color = conf.content_main;
      style.boxSizing = "border-box";
      
      if(!article_seq[i].querySelector('RT·page')){
         style.padding = "3rem";
      } else {
         style.padding = "0";
      }
    }

    required_elements.forEach(name => RT.load('Element/' + name));

    if(RT.Element && RT.PageStyle){
      RT.Element.add(compile_configuration); // Re-evaluate on render pass
      RT.Element.add(apply_macro_boundaries);
      RT.PageStyle.add(apply_macro_boundaries);
    }

    const page_seq = document.querySelectorAll('RT·article RT·page');
    for(let i = 0; i < page_seq.length; i++){
       let p_style = page_seq[i].style;
       p_style.position = "relative";
       p_style.display = "block";
       p_style.padding = "3rem";
       p_style.margin = "1.25rem auto";
       p_style.backgroundColor = conf.surface_0;
       p_style.boxShadow = "0 0 0.625rem " + conf.brand_primary;
    }
  }

  required_elements.forEach(name => RT.load('Element/' + name));

  if(RT.Element && RT.PageStyle){
    RT.Element.add(compile_configuration);
    RT.Element.add(apply_macro_boundaries);
    RT.PageStyle.add(apply_macro_boundaries);
  }

})();
