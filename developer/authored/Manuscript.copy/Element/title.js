/*
  Processes <RT·title> tags.
  Generates a standard document header block.
  
  Usage: 
  <RT·title title="..." author="..." date="..." copyright="..."></RT·title>
*/
window.RT = window.RT || {};

window.RT.title = function() {
  const debug = window.RT.Debug || { log: function(){} };
  
  document.querySelectorAll('rt·title').forEach(el => {
    const title = el.getAttribute('title') || 'Untitled Document';
    const author = el.getAttribute('author');
    const date = el.getAttribute('date');
    const copyright = el.getAttribute('copyright');

    if (debug.log) debug.log('title', `Generating title block: ${title}`);

    // Container
    const container = document.createElement('div');
    container.style.textAlign = 'center';
    container.style.marginBottom = '3rem';
    container.style.marginTop = '2rem';
    container.style.borderBottom = '1px solid var(--RT·border-default)';
    container.style.paddingBottom = '1.5rem';

    // Main Title (H1)
    const h1 = document.createElement('h1');
    h1.textContent = title;
    h1.style.margin = '0 0 0.8rem 0';
    h1.style.border = 'none'; // Override standard H1 border
    h1.style.padding = '0';
    h1.style.color = 'var(--RT·brand-primary)';
    h1.style.fontSize = '2.5em';
    h1.style.lineHeight = '1.1';
    h1.style.letterSpacing = '-0.03em';

    container.appendChild(h1);

    // Metadata Row (Author | Date)
    if (author || date) {
      const meta = document.createElement('div');
      meta.style.color = 'var(--RT·content-muted)';
      meta.style.fontStyle = 'italic';
      meta.style.fontSize = '1.1em';
      meta.style.fontFamily = '"Georgia", "Times New Roman", serif'; // Classy serif

      const parts = [];
      if (author) parts.push(`<span style="font-weight:600; color:var(--RT·brand-secondary)">${author}</span>`);
      if (date) parts.push(date);

      meta.innerHTML = parts.join(' &nbsp;&mdash;&nbsp; ');
      container.appendChild(meta);
    }

    // Copyright Row
    if (copyright) {
      const copy_div = document.createElement('div');
      copy_div.style.color = 'var(--RT·content-muted)';
      copy_div.style.fontSize = '0.9em';
      copy_div.style.marginTop = '0.5rem';
      // Automatically injects the copyright symbol
      copy_div.innerHTML = `&copy; ${copyright}`; 
      container.appendChild(copy_div);
    }

    // Replace the raw tag with the generated block
    el.replaceWith(container);
  });
};
