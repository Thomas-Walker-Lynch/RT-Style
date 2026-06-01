window.StyleRT.paginate_by_element = function () {
  const RT = window.StyleRT;
  const page_conf = (RT.config && RT.config.page) ? RT.config.page : {};
  const page_height_limit = page_conf.height_limit || 1000;

  const article_seq = document.querySelectorAll('RT-article');
  if (article_seq.length === 0) {
    RT.debug.error('pagination', 'No <RT-article> elements found. Pagination aborted.');
    return;
  }

  // ---------- helpers ----------
  const get_el_height = (el) => {
    const wasInDOM = el.parentNode !== null;
    if (!wasInDOM) document.body.appendChild(el);
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const margin = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    if (!wasInDOM) el.remove();
    return (rect.height || 0) + (margin || 0);
  };

  // Create a hidden measurement container that mimics the article's layout
  let measureContainer = null;
  const getMeasureContainer = () => {
    if (measureContainer && measureContainer.parentNode) return measureContainer;
    const article = document.querySelector('RT-article');
    if (!article) {
      const temp = document.createElement('div');
      temp.style.visibility = 'hidden';
      temp.style.position = 'absolute';
      temp.style.width = '100%';   // fallback
      document.body.appendChild(temp);
      measureContainer = temp;
      return temp;
    }
    const container = document.createElement('div');
    // Copy the computed width and font styles from the article
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
  };

  // Measure a fragment by temporarily inserting it into the measurement container
  const measureFragment = (frag) => {
    const container = getMeasureContainer();
    container.appendChild(frag);
    const h = get_el_height(frag);
    container.removeChild(frag);
    return h;
  };

  const isSplittable = (el) => {
    const tag = el.tagName;
    if (tag === 'UL' || tag === 'OL') {
      const items = Array.from(el.children).filter(c => c.tagName === 'LI');
      if (items.length === 0) return null;

      // Measure item heights once (still in DOM)
      const itemHeights = items.map(li => get_el_height(li));

      // Measure empty list overhead
      const emptyClone = el.cloneNode(false);
      const overhead = get_el_height(emptyClone);

      // Store info on the original element (and on rest fragments later)
      el._splitInfo = { type: 'list', itemHeights, overhead, offset: 0 };
      return makeListSplitter(el, el._splitInfo);
    }

    if (tag === 'TABLE') {
      const thead = el.querySelector('thead');
      const tbody = el.querySelector('tbody');
      const rows = tbody ? Array.from(tbody.rows) : Array.from(el.rows);
      if (rows.length === 0) return null;

      const theadHeight = thead ? get_el_height(thead) : 0;
      const rowHeights = rows.map(row => get_el_height(row));

      const emptyClone = el.cloneNode(false);
      if (thead) {
        const theadClone = thead.cloneNode(true);
        emptyClone.appendChild(theadClone);
      }
      const tbodyClone = document.createElement('tbody');
      emptyClone.appendChild(tbodyClone);
      const overhead = get_el_height(emptyClone) - theadHeight;

      el._splitInfo = { type: 'table', rowHeights, overhead, theadHeight, offset: 0 };
      return makeTableSplitter(el, el._splitInfo);
    }

    return null;   // not splittable
  };

  function makeListSplitter(el, info) {
    return (remaining) => {
      const children = Array.from(el.children).filter(c => c.tagName === 'LI');
      const start = info.offset;
      const relevantHeights = info.itemHeights.slice(start, start + children.length);

      // Build fragments iteratively and measure them for exact height
      let bestCount = 0;
      let bestHeight = 0;
      // Try to include as many items as possible
      const tempList = el.cloneNode(false);
      for (let i = 0; i < children.length; i++) {
        const itemClone = children[i].cloneNode(true);
        tempList.appendChild(itemClone);
        const fragHeight = measureFragment(tempList);
        if (fragHeight <= remaining) {
          bestCount = i + 1;
          bestHeight = fragHeight;
        } else {
          // Remove the last item
          tempList.removeChild(itemClone);
          break;
        }
      }

      if (bestCount === 0) {
        return { first: null, rest: el, firstHeight: 0 };
      }

      // Build first fragment (with exactly bestCount items)
      const first = el.cloneNode(false);
      for (let i = 0; i < bestCount; i++) {
        first.appendChild(children[i].cloneNode(true));
      }


      // Build rest fragment only if there are remaining items
      let rest = null;
      if (bestCount < children.length) {
        rest = el.cloneNode(false);
        for (let i = bestCount; i < children.length; i++) {
          rest.appendChild(children[i].cloneNode(true));
        }

        // Explicitly inject the starting index for ordered lists
        if (el.tagName === 'OL') {
          const currentStart = parseInt(el.getAttribute('start'), 10) || 1;
          rest.setAttribute('start', currentStart + bestCount);
        }

        // Forward split info
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
      if (thead) {
        shell.appendChild(thead.cloneNode(true));
      }
      const newTbody = document.createElement('tbody');
      shell.appendChild(newTbody);
      return shell;
    };

    return (remaining) => {
      const tbody = el.querySelector('tbody');
      const rows = tbody ? Array.from(tbody.rows) : Array.from(el.rows);
      const start = info.offset;
      const relevantRows = rows.slice(start, start + rows.length);

      let bestCount = 0;
      let bestHeight = 0;
      const tempTable = createShell();
      const tempBody = tempTable.querySelector('tbody');
      for (let i = 0; i < relevantRows.length; i++) {
        tempBody.appendChild(relevantRows[i].cloneNode(true));
        const h = measureFragment(tempTable);
        if (h <= remaining) {
          bestCount = i + 1;
          bestHeight = h;
        } else {
          // Remove the last row
          tempBody.removeChild(tempBody.lastChild);
          break;
        }
      }

      if (bestCount === 0) {
        return { first: null, rest: el, firstHeight: 0 };
      }

      const first = createShell();
      const firstBody = first.querySelector('tbody');
      for (let i = 0; i < bestCount; i++) {
        firstBody.appendChild(relevantRows[i].cloneNode(true));
      }

      let rest = null;
      if (bestCount < relevantRows.length) {
        rest = createShell();
        const restBody = rest.querySelector('tbody');
        for (let i = bestCount; i < relevantRows.length; i++) {
          restBody.appendChild(relevantRows[i].cloneNode(true));
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

  // ---------- main pagination loop ----------
  let article_index = 0;
  while (article_index < article_seq.length) {
    const article = article_seq[article_index];

    const raw_element_seq = Array.from(article.children).filter(el =>
      !['SCRIPT', 'STYLE', 'RT-PAGE'].includes(el.tagName)
    );

    if (raw_element_seq.length === 0) {
      article_index++;
      continue;
    }

    const page_seq = [];
    let current_batch_seq = [];
    let current_h = 0;

    let i = 0;
    while (i < raw_element_seq.length) {
      const el = raw_element_seq[i];
      const splitter = isSplittable(el);

      // --- Splittable element ---
      if (splitter) {
        const remaining = page_height_limit - current_h;
        const { first, rest, firstHeight } = splitter(remaining);

        if (first) {
          // Place the fitting fragment
          current_batch_seq.push(first);
          current_h += firstHeight;   // exact measured height

          if (rest) {
            // Replace original with remainder
            raw_element_seq.splice(i, 1, rest);
          } else {
            // Element is completely consumed
            raw_element_seq.splice(i, 1);
          }
          // Do not increment i - the next element is now at index i
        } else {
          // Not even one item fits on this page
          if (current_batch_seq.length === 0) {
            // Empty page -> wrap whole element in a scroll frame
            const frame = document.createElement('rt-scroll-frame');
            frame.style.display = 'block';
            frame.style.overflowY = 'auto';
            frame.style.maxHeight = page_height_limit + 'px';
            frame.appendChild(el);
            current_batch_seq.push(frame);
            i++;   // element consumed
          } else {
            // Page has content -> start a new page and keep rest for later
            page_seq.push(current_batch_seq);
            current_batch_seq = [];
            current_h = 0;
            raw_element_seq[i] = rest;
          }
        }
        continue;
      }

      // --- Ordinary (non-splittable) element ---
      const h = get_el_height(el);

      if (current_h + h > page_height_limit && current_batch_seq.length > 0) {
        // Backtrack widowed headings
        let backtrack_seq = [];
        let backtrack_h = 0;
        while (current_batch_seq.length > 0) {
          const last = current_batch_seq[current_batch_seq.length - 1];
          if (!/^H[1-6]/.test(last.tagName)) break;
          const popped = current_batch_seq.pop();
          backtrack_seq.unshift(popped);
          backtrack_h += get_el_height(popped);
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

    if (RT.debug) {
      RT.debug.log('pagination', `Article paginated into ${page_seq.length} pages.`);
    }

    article_index++;
  }

  // Clean up measurement container
  if (measureContainer && measureContainer.parentNode) {
    measureContainer.remove();
    measureContainer = null;
  }
};
