window.StyleRT = window.StyleRT || {};

window.StyleRT.citation = function(){
  const citations = document.querySelectorAll('rt-cite');
  if(citations.length === 0) return;

  const article = document.querySelector('rt-article');
  if(!article) return;

  // 1. Ensure the H1 is a direct child of the article so the TOC can see it
  let endnotesHeader = document.getElementById('endnotes-header');
  if (!endnotesHeader) {
    endnotesHeader = document.createElement('h1');
    endnotesHeader.id = 'endnotes-header';
    endnotesHeader.innerText = 'Endnotes';
    article.appendChild(endnotesHeader);
  }

  // 2. Locate or generate the endnotes list container
  let endnoteContainer = document.querySelector('rt-endnotes');
  if(!endnoteContainer) {
    endnoteContainer = document.createElement('rt-endnotes');
    article.appendChild(endnoteContainer);
  }
  
  // 3. Ensure the list structure exists
  if(!endnoteContainer.querySelector('ol')) {
    endnoteContainer.innerHTML = '<ol></ol>';
  }
  
  const list = endnoteContainer.querySelector('ol');

  // Process each inline citation
  citations.forEach((cite, index) => {
    const refNum = index + 1;
    const refText = cite.getAttribute('ref') || cite.innerHTML;
    
    cite.innerHTML = `<a href="#note-${refNum}" id="cite-${refNum}">[${refNum}]</a>`;
    cite.style.cursor = 'pointer';
    cite.style.color = 'var(--rt-brand-link)';
    cite.style.textDecoration = 'none';

    // Append the corresponding entry into the endnotes list
    const li = document.createElement('li');
    li.id = `note-${refNum}`;
    li.innerHTML = `${refText} <a href="#cite-${refNum}" style="text-decoration:none;">&#8617;</a>`;
    list.appendChild(li);
  });
  
  // Style the container
  endnoteContainer.style.display = 'block';
  endnoteContainer.style.marginTop = '1rem';
  endnoteContainer.style.borderTop = '1px solid var(--rt-surface-3)';
  endnoteContainer.style.paddingTop = '1rem';
};
