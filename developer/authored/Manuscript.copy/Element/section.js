/*
  Element/section.js
  Processes <RT·section> tags.
  Extracts <RT·name> payloads, manages outline numbering, and injects the formatted title.
*/

(function() {

  if (!window.RT) return;

  const apply_style = function(title_node ,depth ,config) {
    // Top-level sections start large; scale down based on nesting depth
    const base_size = 2.25;
    const size = Math.max(1.1 ,base_size - (depth * 0.35));

    title_node.style.fontSize = size + 'em';
    title_node.style.fontWeight = '600';
    title_node.style.color = config.brand_primary || '#000';
    title_node.style.marginTop = depth === 0 ? '3rem' : '2rem';
    title_node.style.marginBottom = '1rem';
    title_node.style.lineHeight = '1.2';
    
    if(depth === 0) {
      title_node.style.borderBottom = '1px solid ' + (config.border_faint || '#ccc');
      title_node.style.paddingBottom = '0.5rem';
    }
  };

  RT.Element.add(function() {
    const debug = window.RT.Debug || { log: function(){} };
    if (debug.log) debug.log('section' ,'Processing scoped sections');

    const config = window.RT.layout_config || {};
    const section_seq = document.querySelectorAll('RT·section, rt·section');

    if (section_seq.length === 0) return;

    const article = document.querySelector('RT·article, rt·article, RT·memo, rt·memo');
    if (article && !document.querySelector('rt·counter·make[counter="RT_section"]')) {
      const make = document.createElement('rt·counter·make');
      make.setAttribute('counter' ,'RT_section');
      make.setAttribute('style' ,'outline');
      make.setAttribute('mode' ,'scoped');
      make.setAttribute('on-first-step' ,'0');
      article.insertBefore(make ,article.firstChild);
    }

    let section_idx = 0;

    section_seq.forEach(section => {
      section.style.display = 'block';

      let depth = 0;
      let curr = section.parentElement;
      while (curr) {
        if (curr.tagName && curr.tagName.toLowerCase() === 'rt·section') {
          depth++;
        }
        curr = curr.parentElement;
      }

      const names = [];
      const children = Array.from(section.children);
      children.forEach(child => {
        if (child.tagName && child.tagName.toLowerCase() === 'rt·name') {
          names.push(child.innerHTML.trim());
          child.remove();
        }
      });

      const title_text = names.length > 0 ? names.join('<br>') : '•';

      const step = document.createElement('rt·counter·step');
      step.setAttribute('counter' ,'RT_section');

      const snap_id = 'section_snap_' + section_idx++;
      const snap = document.createElement('rt·counter·snapshot');
      snap.setAttribute('counter' ,'RT_section');
      snap.setAttribute('snapshot' ,snap_id);

      const title_node = document.createElement('div');
      title_node.className = 'RT·section-title';
      
      // Map identifier for TOC routing
      if (!section.id) section.id = snap_id; 

      const read = document.createElement('rt·counter·read');
      read.setAttribute('snapshot' ,snap_id);
      
      const title_content = document.createElement('span');
      title_content.style.marginLeft = '1rem';
      title_content.innerHTML = title_text;

      title_node.appendChild(read);
      title_node.appendChild(title_content);

      apply_style(title_node ,depth ,config);

      section.insertBefore(title_node ,section.firstChild);
      section.insertBefore(snap ,section.firstChild);
      section.insertBefore(step ,section.firstChild);
    });
  });

})();
