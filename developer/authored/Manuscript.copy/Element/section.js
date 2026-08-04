/*
  Element/section.js
  Processes <RT·section> tags.
  Applies counting hierarchical numbering, conditional alignment/indents, 
  subdued dark red borders for top-level elements, and universal page breaks for chapters.
*/

(function() {

  if (!window.RT) return;

  const apply_style = function(title_node ,depth ,config) {
    const base_size = 2.25;
    const size = Math.max(1.1 ,base_size - (depth * 0.35));
    const fade_opacity = Math.max(0.5 ,1 - (depth * 0.2));

    if (depth === 0) {
      title_node.style.textAlign = 'center';
      title_node.style.paddingLeft = '0';
      // Firebrick provides sufficient chroma contrast against dark backgrounds
      title_node.style.borderBottom = '2px solid #B22222'; 
      title_node.style.paddingBottom = '0.5rem';
    } else {
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

  RT.Element.add(function() {
    const debug = window.RT.Debug || { log: function(){} };
    if (debug.log) debug.log('section' ,'Processing scoped sections with counting numbering');

    const config = window.RT.layout_config || {};
    const section_seq = document.querySelectorAll('RT·section, rt·section');

    if (section_seq.length === 0) return;

    const article = document.querySelector('RT·article, rt·article, RT·memo, rt·memo');
    if (article && !document.querySelector('rt·counter·make[counter="RT_section"]')) {
      const make = document.createElement('rt·counter·make');
      make.setAttribute('counter' ,'RT_section');
      // Utilizing CountingNumber to output 1.1.1 rather than 0.0.0
      make.setAttribute('style' ,'CountingNumber');
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

      // Force ALL top-level sections to start on a new page
      if (depth === 0) {
        if (!section.previousElementSibling?.tagName?.toLowerCase().includes('page-break')) {
          const pb = document.createElement('rt·page-break');
          section.parentNode.insertBefore(pb, section);
        }
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

      while (section.firstChild) {
        step.appendChild(section.firstChild);
      }

      const snap_id = 'section_snap_' + section_idx++;
      const snap = document.createElement('rt·counter·snapshot');
      snap.setAttribute('counter' ,'RT_section');
      snap.setAttribute('snapshot' ,snap_id);

      const title_node = document.createElement('div');
      title_node.className = 'RT·section-title';
      if (!section.id) section.id = snap_id; 

      const read = document.createElement('rt·counter·read');
      read.setAttribute('snapshot' ,snap_id);
      
      const title_content = document.createElement('span');
      title_content.style.marginLeft = '0.75rem';
      title_content.innerHTML = title_text;

      title_node.appendChild(read);
      title_node.appendChild(title_content);

      apply_style(title_node ,depth ,config);

      step.insertBefore(title_node ,step.firstChild);
      step.insertBefore(snap ,step.firstChild);

      section.appendChild(step);
    });
  });

})();
