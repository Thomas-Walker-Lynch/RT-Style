/*
  Processes <RT-MATH> tags.
  JavaScript: math() 
  HTML Tag: <RT-MATH> (parsed as rt-math)
*/
function math(){
  // querySelector treats 'rt-math' as case-insensitive for the tag
  document.querySelectorAll('rt-math').forEach(el => {
    if (el.textContent.startsWith('$')) return;

    const is_block = el.parentElement.tagName === 'DIV' || 
                     el.textContent.includes('\n') ||
                     el.parentElement.childNodes.length === 1;

    const delimiter = is_block ? '$$' : '$';
    el.style.display = is_block ? 'block' : 'inline';
    el.textContent = `${delimiter}${el.textContent.trim()}${delimiter}`;
  });

  // MathJax must find its config at window.MathJax
  window.MathJax = {
    tex: { 
      inlineMath: [['$', '$']], 
      displayMath: [['$$', '$$']] 
    }
  };

  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
  script.async = true;
  document.head.appendChild(script);
}

window.StyleRT = window.StyleRT || {};
window.StyleRT.math = math;
