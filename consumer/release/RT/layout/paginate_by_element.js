/*
  Layout Paginator: paginate_by_element
*/
window.StyleRT = window.StyleRT || {};

window.StyleRT.paginate_by_element = function(){
  const RT = window.StyleRT;
  const page_conf = (RT.config && RT.config.page) ? RT.config.page : {};
  const page_height_limit = page_conf.height_limit || 1000; 

  const article_seq = document.querySelectorAll("RT-article");
  if(article_seq.length === 0){
    RT.debug.error('pagination' ,'No <RT-article> elements found. Pagination aborted.');
    return;
  }

  let article_index = 0;
  while(true){
    if(article_index === article_seq.length) break;
    const article = article_seq[article_index];
    
    const raw_element_seq = Array.from(article.children).filter( el => 
      !['SCRIPT' ,'STYLE' ,'RT-PAGE'].includes(el.tagName)
    );

    if(raw_element_seq.length > 0){
      const page_seq = [];
      let current_batch_seq = [];
      let current_h = 0;

      const get_el_height = (el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const margin = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
        return (rect.height || 0) + (margin || 0);
      };

      let i = 0;
      while(true){
        if(i === raw_element_seq.length) break;
        const el = raw_element_seq[i];
        const h = get_el_height(el);

        if(current_h + h > page_height_limit && current_batch_seq.length > 0){
          let backtrack_seq = [];
          let backtrack_h = 0;

          // Backtrack to rescue any widowed headings at the end of the batch
          while(true){
            if(current_batch_seq.length === 0) break;
            const last_el = current_batch_seq[current_batch_seq.length - 1];
            if(!/^H[1-6]/.test(last_el.tagName)) break;
            
            const popped_el = current_batch_seq.pop();
            backtrack_seq.unshift(popped_el);
            backtrack_h += get_el_height(popped_el);
          }

          if(current_batch_seq.length > 0){
            page_seq.push(current_batch_seq);
            current_batch_seq = backtrack_seq;
            current_h = backtrack_h;
          }else{
            // Fallback for an extreme case where the entire page was a cascade of headings
            page_seq.push(backtrack_seq);
            current_batch_seq = [];
            current_h = 0;
          }
        }

        current_batch_seq.push(el);
        current_h += h;

        i++;
      }

      if(current_batch_seq.length > 0){
        page_seq.push(current_batch_seq);
      }

      article.innerHTML = '';
      
      let p = 0;
      while(true){
        if(p === page_seq.length) break;
        const batch_seq = page_seq[p];
        const page_el = document.createElement('rt-page');
        page_el.id = `page-${p + 1}`;
        
        let item_idx = 0;
        while(true){
          if(item_idx === batch_seq.length) break;
          page_el.appendChild(batch_seq[item_idx]);
          item_idx++;
        }
        
        article.appendChild(page_el);
        p++;
      }

      if(RT.debug){
        RT.debug.log('pagination' ,`Article paginated into ${page_seq.length} pages.`);
      }
    }

    article_index++;
  }
};
