/*
  Element/title.js
  Processes <RT·title> tags and isolates internal styling logic.
*/

(function(){

  if(!window.RT) return;

  if(RT.Element.Title) return;      // already plugged in
  const ns = RT.Element.Title = {};

  const apply_style = function(container ,h1 ,meta ,copy_div ,config){
    container.style.textAlign = 'center';
    container.style.marginBottom = '3rem';
    container.style.marginTop = '2rem';
    container.style.borderBottom = '1px solid ' + config.border_default;
    container.style.paddingBottom = '1.5rem';

    h1.style.margin = '0 0 0.8rem 0';
    h1.style.border = 'none';
    h1.style.padding = '0';
    h1.style.color = config.brand_primary;
    h1.style.fontSize = '2.5em';
    h1.style.lineHeight = '1.1';
    h1.style.letterSpacing = '-0.03em';

    if(meta){
      meta.style.color = config.content_muted;
      meta.style.fontStyle = 'italic';
      meta.style.fontSize = '1.1em';
      meta.style.fontFamily = '"Georgia", "Times New Roman", serif';
    }

    if(copy_div){
      copy_div.style.color = config.content_muted;
      copy_div.style.fontSize = '0.9em';
      copy_div.style.marginTop = '0.5rem';
    }
  };

  RT.task_add('element' ,function(){
    const config = window.RT.layout_config || {};
    const nodes = document.querySelectorAll('rt·title');
    
    for(let i = 0; i < nodes.length; i++){
      const el = nodes[i];
      const title = el.getAttribute('title') || 'Untitled Document';
      const author = el.getAttribute('author');
      const date = el.getAttribute('date');
      const copyright = el.getAttribute('copyright');

      const container = document.createElement('div');
      const h1 = document.createElement('h1');
      h1.textContent = title;
      container.appendChild(h1);

      let meta = null;
      if(author || date){
        meta = document.createElement('div');
        const parts = [];
        if(author) parts.push(`<span style="font-weight:600; color:${config.brand_secondary}">${author}</span>`);
        if(date) parts.push(date);
        meta.innerHTML = parts.join(' &nbsp;&mdash;&nbsp; ');
        container.appendChild(meta);
      }

      let copy_div = null;
      if(copyright){
        copy_div = document.createElement('div');
        copy_div.innerHTML = `&copy; ${copyright}`; 
        container.appendChild(copy_div);
      }

      apply_style(container ,h1 ,meta ,copy_div ,config);
      el.replaceWith(container);
    }
  });

})();
