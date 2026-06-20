window.RT.paginate_by_element = function () {
  const RT = window.RT;
  const debug = RT.debug || { log: function(){}, error: function(){} };
  const page_conf = (RT.config && RT.config.page) ? RT.config.page : {};
  const page_height_limit = page_conf.height_limit || 1000;

  let measureContainer = null;

  // =========================================================
  // 1. DOM Measurement Utilities
  // =========================================================
  function getElHeight(el) {
    const wasInDOM = el.parentNode !== null;
    if (!wasInDOM) document.body.appendChild(el);
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const margin = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    if (!wasInDOM) el.remove();
    return (rect.height || 0) + (margin || 0);
  }

  function getMeasureContainer() {
    if (measureContainer && measureContainer.parentNode) return measureContainer;
    const article = document.querySelector('RT-article');
    if (!article) {
      const temp = document.createElement('div');
      temp.style.visibility = 'hidden';
      temp.style.position = 'absolute';
      temp.style.width = '100%'; 
      document.body.appendChild(temp);
      measureContainer = temp;
      return temp;
    }
    const container = document.createElement('div');
    const articleStyle = window.getComputedStyle(article);
    container.style.visibility = 'hidden';
    container.style.position = 'absolute';
    container.style.width = articleStyle.width;
    container.style.fontFamily = articleStyle.fontFamily;
    container.style.fontSize = articleStyle.fontSize;
    container.style.lineHeight = articleStyle.lineHeight;
    container.style.fontWeight = articleStyle.fontWeight;
    document.body.appendChild(container);
    measureContainer = container;
    return container;
  }

  function measureFragment(frag) {
    const container = getMeasureContainer();
    container.appendChild(frag);
    const h = getElHeight(frag);
    container.removeChild(frag);
    return h;
  }

  // =========================================================
  // STEP 1: PREPARE FOOTNOTES (Strip and tag)
  // =========================================================
  const article_seq = document.querySelectorAll('RT-article');
  if (article_seq.length === 0) {
    debug.error('pagination', 'No <RT-article> elements found. Pagination aborted.');
    return;
  }

  const footnote_registry = {};
  let footnote_counter = 1;

  Array.from(article_seq).forEach(article => {
    // Bulletproof extraction: immune to XML/HTML case-sensitivity parsing quirks
    const all_nodes = Array.from(article.querySelectorAll('*'));
    const raw_footnotes = all_nodes.filter(node => node.tagName.toLowerCase() === 'rt-footnote');
    
    raw_footnotes.forEach(fn => {
      const id = footnote_counter++;
      footnote_registry[id] = fn.innerHTML; // Save the payload
      
      // Trim any standard HTML whitespace immediately preceding the tag
      const prev = fn.previousSibling;
      if (prev && prev.nodeType === Node.TEXT_NODE) {
        prev.textContent = prev.textContent.replace(/\s+$/, '');
      }

      // Replace with a zero-height marker that rides along with the text
      const marker = document.createElement('rt-fn-marker');
      marker.setAttribute('data-id', id);
      
      if (fn.parentNode) {
        fn.parentNode.replaceChild(marker, fn);
      }
    });
  });

  // =========================================================
  // Splitting Logic (Clean and undisturbed)
  // =========================================================
  function isSplittable(el) {
    const tag = el.tagName;
    if (tag === 'UL' || tag === 'OL') {
      const items = Array.from(el.children).filter(c => c.tagName === 'LI');
      if (items.length === 0) return null;

      const itemHeights = items.map(li => getElHeight(li));
      const emptyClone = el.cloneNode(false);
      const overhead = getElHeight(emptyClone);

      el._splitInfo = { type: 'list', itemHeights, overhead, offset: 0 };
      return makeListSplitter(el, el._splitInfo);
    }

    if (tag === 'TABLE') {
      const thead = el.querySelector('thead');
      const tbody = el.querySelector('tbody');
      const rows = tbody ? Array.from(tbody.rows) : Array.from(el.rows);
      if (rows.length === 0) return null;

      const theadHeight = thead ? getElHeight(thead) : 0;
      const rowHeights = rows.map(row => getElHeight(row));

      const emptyClone = el.cloneNode(false);
      if (thead) emptyClone.appendChild(thead.cloneNode(true));
      emptyClone.appendChild(document.createElement('tbody'));
      const overhead = getElHeight(emptyClone) - theadHeight;

      el._splitInfo = { type: 'table', rowHeights, overhead, theadHeight, offset: 0 };
      return makeTableSplitter(el, el._splitInfo);
    }
    return null; 
  }

  function makeListSplitter(el, info) {
    return (remaining) => {
      const children = Array.from(el.children).filter(c => c.tagName === 'LI');
      const start = info.offset;

      let bestCount = 0;
      let bestHeight = 0;
      const tempList = el.cloneNode(false);
      
      for (let i = 0; i < children.length; i++) {
        const itemClone = children[i].cloneNode(true);
        tempList.appendChild(itemClone);
        const fragHeight = measureFragment(tempList);
        if (fragHeight <= remaining) {
          bestCount = i + 1;
          bestHeight = fragHeight;
        } else {
          tempList.removeChild(itemClone);
          break;
        }
      }

      if (bestCount === 0) return { first: null, rest: el, firstHeight: 0 };

      const first = el.cloneNode(false);
      for (let i = 0; i < bestCount; i++) {
        first.appendChild(children[i].cloneNode(true));
      }

      let rest = null;
      if (bestCount < children.length) {
        rest = el.cloneNode(false);
        for (let i = bestCount; i < children.length; i++) {
          rest.appendChild(children[i].cloneNode(true));
        }

        if (el.tagName === 'OL') {
          const currentStart = parseInt(el.getAttribute('start'), 10) || 1;
          rest.setAttribute('start', currentStart + bestCount);
        }

        rest._splitInfo = {
          type: 'list',
          itemHeights: info.itemHeights,
          overhead: info.overhead,
          offset: start + bestCount
        };
      }

      return { first, rest, firstHeight: bestHeight };
    };
  }

  function makeTableSplitter(el, info) {
    const thead = el.querySelector('thead');
    const createShell = () => {
      const shell = el.cloneNode(false);
      if (thead) shell.appendChild(thead.cloneNode(true));
      const newTbody = document.createElement('tbody');
      shell.appendChild(newTbody);
      return shell;
    };

    return (remaining) => {
      const tbody = el.querySelector('tbody');
      const rows = tbody ? Array.from(tbody.rows) : Array.from(el.rows);
      const start = info.offset;

      let bestCount = 0;
      let bestHeight = 0;
      const tempTable = createShell();
      const tempBody = tempTable.querySelector('tbody');
      
      for (let i = 0; i < rows.length; i++) {
        tempBody.appendChild(rows[i].cloneNode(true));
        const h = measureFragment(tempTable);
        if (h <= remaining) {
          bestCount = i + 1;
          bestHeight = h;
        } else {
          tempBody.removeChild(tempBody.lastChild);
          break;
        }
      }

      if (bestCount === 0) return { first: null, rest: el, firstHeight: 0 };

      const first = createShell();
      const firstBody = first.querySelector('tbody');
      for (let i = 0; i < bestCount; i++) {
        firstBody.appendChild(rows[i].cloneNode(true));
      }

      let rest = null;
      if (bestCount < rows.length) {
        rest = createShell();
        const restBody = rest.querySelector('tbody');
        for (let i = bestCount; i < rows.length; i++) {
          restBody.appendChild(rows[i].cloneNode(true));
        }

        rest._splitInfo = {
          type: 'table',
          rowHeights: info.rowHeights,
          overhead: info.overhead,
          theadHeight: info.theadHeight,
          offset: start + bestCount
        };
      }

      return { first, rest, firstHeight: bestHeight };
    };
  }

  // =========================================================
  // STEP 2: NORMAL PAGINATOR
  // =========================================================
  function paginateArticle(article) {
    const raw_element_seq = Array.from(article.children).filter(el =>
      !['SCRIPT', 'STYLE', 'RT-PAGE'].includes(el.tagName)
    );

    if (raw_element_seq.length === 0) return;

    const page_seq = [];
    let current_batch_seq = [];
    let current_h = 0;
    let i = 0;

    while (i < raw_element_seq.length) {
      const el = raw_element_seq[i];
      const splitter = isSplittable(el);

      if (splitter) {
        const remaining = page_height_limit - current_h;
        const { first, rest, firstHeight } = splitter(remaining);

        if (first) {
          current_batch_seq.push(first);
          current_h += firstHeight;

          if (rest) {
            raw_element_seq.splice(i, 1, rest);
          } else {
            raw_element_seq.splice(i, 1);
          }
        } else {
          if (current_batch_seq.length === 0) {
            const frame = document.createElement('rt-scroll-frame');
            frame.style.display = 'block';
            frame.style.overflowY = 'auto';
            frame.style.maxHeight = page_height_limit + 'px';
            frame.appendChild(el);
            current_batch_seq.push(frame);
            i++; 
          } else {
            page_seq.push(current_batch_seq);
            current_batch_seq = [];
            current_h = 0;
            raw_element_seq[i] = rest || el; 
          }
        }
        continue;
      }


      // --- Ordinary (non-splittable) element ---
      const h = getElHeight(el);
      const is_RT_page_break = el.tagName && el.tagName.toLowerCase() === 'rt-page-break';

      if( (is_RT_page_break || current_h + h > page_height_limit) && current_batch_seq.length > 0 ){
        let backtrack_seq = [];
        let backtrack_h = 0;
        
        while (current_batch_seq.length > 0) {
          const last = current_batch_seq[current_batch_seq.length - 1];
          if (!/^H[1-6]/.test(last.tagName)) break;
          const popped = current_batch_seq.pop();
          backtrack_seq.unshift(popped);
          backtrack_h += getElHeight(popped);
        }

        if (current_batch_seq.length > 0) {
          page_seq.push(current_batch_seq);
          current_batch_seq = backtrack_seq;
          current_h = backtrack_h;
        } else {
          page_seq.push(backtrack_seq);
          current_batch_seq = [];
          current_h = 0;
        }
      }

      current_batch_seq.push(el);
      current_h += h;
      i++;
    }

    if (current_batch_seq.length > 0) {
      page_seq.push(current_batch_seq);
    }

    // Rebuild article with <rt-page> wrappers
    article.innerHTML = '';
    let p = 0;
    while (p < page_seq.length) {
      const batch = page_seq[p];
      const page_el = document.createElement('rt-page');
      page_el.id = `page-${p + 1}`;
      batch.forEach(item => page_el.appendChild(item));
      article.appendChild(page_el);
      p++;
    }
  }

  // Execute pagination
  Array.from(article_seq).forEach(article => paginateArticle(article));

  // =========================================================
  // STEP 3: RESOLVE FOOTNOTES & EXPAND PAGES
  // =========================================================
  Array.from(article_seq).forEach(article => {
    const rendered_pages = article.querySelectorAll('rt-page');
    
    Array.from(rendered_pages).forEach(page => {
      // Bulletproof extraction for the markers
      const all_page_nodes = Array.from(page.querySelectorAll('*'));
      const markers = all_page_nodes.filter(node => node.tagName.toLowerCase() === 'rt-fn-marker');
      
      if (markers.length === 0) return;

      // Construct the footer block for this page
      const fn_container = document.createElement('div');
      fn_container.className = 'rt-footnote-container';
      fn_container.style.borderTop = '1px solid var(--rt-border-default)';
      fn_container.style.marginTop = '2rem';
      fn_container.style.paddingTop = '1rem';
      fn_container.style.fontSize = '0.9em';

      markers.forEach(marker => {
        const id = marker.getAttribute('data-id');
        const html = footnote_registry[id];

        // Replace the invisible marker with the visible naked superscript link
        const sup = document.createElement('sup');
        sup.innerHTML = `<a href="#fn-${id}" id="fn-ref-${id}" style="color: var(--rt-brand-link); text-decoration: none;">${id}</a>`;
        
        if (marker.parentNode) {
          marker.parentNode.replaceChild(sup, marker);
        }

        // Append the actual text to the footer with a clean, print-ready number format
        const fn_line = document.createElement('div');
        fn_line.id = `fn-${id}`;
        fn_line.style.marginBottom = '0.5rem';
        fn_line.innerHTML = `<span style="padding-right: 0.5em; font-weight: 600;">${id}.</span>${html}`;
        fn_container.appendChild(fn_line);
      });

      // Attach the footer. The page organically stretches to fit.
      page.appendChild(fn_container);
    });
  });

  // Cleanup
  if (measureContainer && measureContainer.parentNode) {
    measureContainer.remove();
    measureContainer = null;
  }
};
