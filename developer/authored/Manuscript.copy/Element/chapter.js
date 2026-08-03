(function() {
  if (!window.RT) return;

  const apply_style = function(h1, config) {
    // Styling can be inherited or explicitly enforced here.
    // If you want chapters to have a distinct layout footprint, apply it.
    h1.style.color = config.brand_primary;
  };

  RT.Element.add(function() {
    const config = window.RT.layout_config || {};
    document.querySelectorAll('RT·chapter').forEach((el) => {
      const brk = document.createElement('RT·page-break');
      const h1 = document.createElement('h1');
      h1.innerHTML = el.innerHTML;
      if (el.className) h1.className = el.className;
      h1.classList.add('RT·chapter');

      Array.from(el.attributes).forEach((attr) => {
        if (attr.name !== 'class') h1.setAttribute(attr.name, attr.value);
      });

      apply_style(h1, config);
      el.parentNode.insertBefore(brk, el);
      el.replaceWith(h1);
    });
  });
})();
