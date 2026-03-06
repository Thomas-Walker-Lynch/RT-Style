/*
  Layout Paginator: paginate_by_element
*/
window.StyleRT = window.StyleRT || {};

window.StyleRT.paginate_by_element = function() {
  const RT = window.StyleRT;
  
  // Fix: Read safely without overwriting the config namespace
  const page_conf = (RT.config && RT.config.page) ? RT.config.page : {};
  const page_height_limit = page_conf.height_limit || 1000; 

  const article_seq = document.querySelectorAll("RT-article");
  
  // HURDLE: Error if no articles found to paginate
  if(article_seq.length === 0) {
    RT.debug.error('pagination', 'No <RT-article> elements found. Pagination aborted.');
    return;
  }

  article_seq.forEach( (article) => {
    const raw_elements = Array.from(article.children).filter(el => 
      !['SCRIPT', 'STYLE', 'RT-PAGE'].includes(el.tagName)
    );

    if(raw_elements.length === 0) return;

    const pages = [];
    let current_batch = [];
    let current_h = 0;

    const get_el_height = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const margin = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
      return (rect.height || 0) + (margin || 0);
    };

    for (let i = 0; i < raw_elements.length; i++) {
      const el = raw_elements[i];
      const h = get_el_height(el);
      const is_heading = /^H[1-6]/.test(el.tagName);

      let total_required_h = h;
      if (is_heading && i + 1 < raw_elements.length) {
        total_required_h += get_el_height(raw_elements[i + 1]);
      }

      if (current_h + total_required_h > page_height_limit && current_batch.length > 0) {
        pages.push(current_batch);
        current_batch = [];
        current_h = 0;
      }

      current_batch.push(el);
      current_h += h;
    }

    if (current_batch.length > 0) pages.push(current_batch);

    article.innerHTML = ''; 
    
    pages.forEach( (list, index) => {
      const page_el = document.createElement('rt-page');
      page_el.id = `page-${index+1}`;
      list.forEach(item => page_el.appendChild(item));
      article.appendChild(page_el);
    });

    if (RT.debug) RT.debug.log('pagination', `Article paginated into ${pages.length} pages.`);
  });
};
