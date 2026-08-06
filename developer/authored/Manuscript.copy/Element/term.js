/*
  Element/term.js
  Processes <RT·term> and <RT·neologism> tags.
*/

(function(){

  if(!window.RT) return;

  if(RT.Element.Term) return;      // already plugged in
  const ns = RT.Element.Term = {};

  const apply_style = function(el ,is_neologism ,is_first ,config){
    if(is_first){
      el.style.fontStyle = 'italic';
      el.style.fontWeight = is_neologism ? '600' : '500';
      el.style.color = is_neologism ? config.brand_secondary : config.brand_primary;
      el.style.paddingRight = '0.1em';
      el.style.display = 'inline';
    } else {
      el.style.fontStyle = 'normal';
      el.style.color = 'inherit';
      el.style.fontWeight = 'inherit';
      el.style.paddingRight = '';
      el.style.display = '';
    }
  };

  RT.task_add('element' ,function(){
    const config = window.RT.layout_config || {};
    const seen_terms_dpa = new Set();
    const selector_s = 'rt·term, rt·term-em, rt·neologism, rt·neologism-em';
    const tags_dpa = document.querySelectorAll(selector_s);

    for(let i = 0; i < tags_dpa.length; i++){
      const el = tags_dpa[i];
      const tag_name_s = el.tagName.toLowerCase();
      const is_neologism_b = tag_name_s.includes('neologism');
      const is_explicit_em_b = tag_name_s.endsWith('-em');
      
      const term_text_raw_s = (el.textContent || '').trim();
      if(!term_text_raw_s.length) continue;

      const term_norm_s = term_text_raw_s.toLowerCase();
      const slug_s = term_norm_s.replace(/\s+/g ,'-');
      const is_first_occurrence_b = !seen_terms_dpa.has(term_norm_s);

      if(is_explicit_em_b || is_first_occurrence_b){
        apply_style(el ,is_neologism_b ,true ,config);

        if(!is_explicit_em_b && is_first_occurrence_b){
          seen_terms_dpa.add(term_norm_s);
          if(!el.id){
            el.id = `def-${is_neologism_b ? 'neo-' : ''}${slug_s}`;
          }
        }
      } else {
        apply_style(el ,is_neologism_b ,false ,config);
      }
    }
  });

})();

