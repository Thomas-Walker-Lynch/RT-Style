/*
  Element/section.js
  Expands <RT·section> macros into <RT·counter·step> primitives.
  Utilizes the global RT.Section namespace for state tracking and execution guards.
*/

(function(){

  if(!window.RT) return;

  window.RT.Section = window.RT.Section || {};
  
  // Guard against multiple script inclusions
  if(window.RT.Section.is_loaded) return;
  window.RT.Section.is_loaded = true;

  const apply_style = function(title_node ,depth ,config){
    const base_size = 2.25;
    const size = Math.max(1.1 ,base_size - (depth * 0.35));
    const fade_opacity = Math.max(0.5 ,1 - (depth * 0.2));

    if(depth === 0){
      title_node.style.textAlign = 'center';
      title_node.style.paddingLeft = '0';
      title_node.style.borderBottom = '2px solid #B22222'; 
      title_node.style.paddingBottom = '0.5rem';
    }else{
      title_node.style.textAlign = 'left';
      title_node.style.paddingLeft = (depth * 1.5) + 'rem';
    }

    title_node.style.fontSize = size + 'em';
    title_node.style.fontWeight = '600';
    title_node.style.color = config.brand_primary || '#000';
    title_node.style.opacity = fade_opacity.toString();
    title_node.style.marginTop = depth === 0 ? '3rem' : '2rem';
    title_node.style.marginBottom = '1rem';
    title_node.style.lineHeight = '1.2';
  };

  RT.Element.add(function(){
    const debug = window.RT.Debug || { log: function(){} };
    if(debug.log) debug.log('section' ,'Expanding section macros');

    const U = window.RT.Utility;
    const config = window.RT.layout_config || {};
    const section_seq = document.querySelectorAll('RT·section, rt·section');

    if(section_seq.length === 0) return;

    const article = document.querySelector('RT·article, rt·article, RT·memo, rt·memo');
    const counter_name = 'RT·Section·counter';

    // Check the global dictionary for existence rather than traversing the DOM
    if(article && !U.Registry.has(window.RT.Section, counter_name)){
      const make = document.createElement('RT·counter·make');
      make.setAttribute('counter' ,counter_name);
      make.setAttribute('style' ,'CountingNumber');
      make.setAttribute('mode' ,'scoped');
      make.setAttribute('on-first-step' ,'0');
      article.insertBefore(make ,article.firstChild);
      
      // Register the physical node and its attributes into the global namespace
      U.Registry.register_make(window.RT.Section, counter_name, make, ['splitable']);
    }

    let section_idx = 0;

    section_seq.forEach(section => {
      // Utilize the abstracted structural depth utility
      let depth = U.Dom.get_structural_depth(section, counter_name);

      if(depth === 0){
        if(!section.previousElementSibling?.tagName?.toLowerCase().includes('page-break')){
          const pb = document.createElement('RT·page-break');
          section.parentNode.insertBefore(pb ,section);
        }
      }

      const snap_id = section.id || ('section_snap_' + section_idx++);
      
      const step = document.createElement('RT·counter·step');
      step.setAttribute('counter' ,counter_name);
      
      // Query the global dictionary for the splitable flag
      if(U.Registry.has(window.RT.Section[counter_name], 'splitable')) {
         step.setAttribute('splitable', 'true');
      }
      
      step.id = snap_id; 

      const snap = document.createElement('RT·counter·snapshot');
      snap.setAttribute('counter' ,counter_name);
      snap.setAttribute('snapshot' ,snap_id);
      step.appendChild(snap);

      const title_node = document.createElement('div');
      title_node.className = 'RT·section-title';

      const read_count = document.createElement('RT·counter·read');
      read_count.setAttribute('snapshot' ,snap_id);

      const title_content = document.createElement('span');
      title_content.style.marginLeft = '0.75rem';
      
      const read_name = document.createElement('RT·counter·read');
      read_name.setAttribute('snapshot' ,snap_id);
      read_name.setAttribute('key' ,'name');
      title_content.appendChild(read_name);

      title_node.appendChild(read_count);
      title_node.appendChild(title_content);

      apply_style(title_node ,depth ,config);
      step.appendChild(title_node);

      while(section.firstChild){
        const child = section.firstChild;
        if((child.tagName || '').toLowerCase() === 'rt·name'){
          child.style.display = 'none';
        }
        step.appendChild(child);
      }

      section.parentNode.replaceChild(step ,section);
    });
  });

})();
