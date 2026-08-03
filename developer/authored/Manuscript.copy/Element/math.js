/*
  Processes <RT·math> tags.
*/

(function(){
  if(!window.RT) return;

  const apply_style = function(el, is_block, config) {
    el.style.display = is_block ? 'block' : 'inline';
  };

  const scan_tags = function(){
    const config = window.RT.layout_config || {};
    const math_elements = Array.from(document.querySelectorAll('RT·math'));

    if(math_elements.length === 0) return;

    if(!window.MathJax || typeof window.MathJax.tex2svg !== 'function') return;

    math_elements.forEach(el => {
      const is_block = el.parentElement.tagName === 'DIV' || 
                       el.textContent.includes('\n') ||
                       el.parentElement.childNodes.length === 1;

      apply_style(el, is_block, config);
      
      const raw_math = el.textContent;
      const svg_node = window.MathJax.tex2svg(raw_math, {display: is_block});
      
      const assistive = svg_node.querySelector('mjx-assistive-mml');
      if(assistive) assistive.remove();

      el.innerHTML = '';
      el.appendChild(svg_node);
    });
  };

  RT.load('Math/mathjax_svg');
  RT.Element.add(scan_tags);
})();
