/*
  Element/endnote.js
  Processes <RT·endnote> tags inline and dumps them when <RT·endnotes> is encountered.
*/

(function(){

  if(!window.RT) return;

  if(RT.Element.Endnote) return;      // already plugged in
  const ns = RT.Element.Endnote = {};

  const apply_style = function(link, config) {
    link.style.cursor = 'pointer';
    link.style.color = config.brand_link || '#0056b3';
    link.style.textDecoration = 'none';
  };

  const apply_list_style = function(list_container, config) {
    list_container.style.marginTop = '1rem';
    list_container.style.borderTop = '1px solid ' + (config.surface_3 || '#ccc');
    list_container.style.paddingTop = '1rem';
    list_container.style.listStyle = 'none';
    list_container.style.paddingLeft = '0';
    list_container.style.margin = '0';
  };

  function process_endnotes(){
    const config = window.RT.layout_config || {};
    const article = document.querySelector('RT·article, RT·memo');
    
    if(!article) return;

    const initial_make = document.createElement('RT·counter·make');
    initial_make.setAttribute('counter', 'EndNoteCounter');
    initial_make.setAttribute('style', 'CountingNumber');
    initial_make.setAttribute('on-first-step', '0');
    article.insertBefore(initial_make, article.firstChild);

    const nodes = document.querySelectorAll('RT·endnote, RT-endnote, RT·endnotes, RT-endnotes');
    
    let endnote_buffer = [];
    let anchor_id_counter = 1;

    for(let i = 0; i < nodes.length; i++){
      const node = nodes[i];
      const tag = node.tagName.toLowerCase();

      if(tag === 'rt·endnote' || tag === 'rt-endnote'){
        const snap_name = 'endnote_cite_' + anchor_id_counter;
        const ref_text = node.innerHTML;

        const step = document.createElement('RT·counter·step');
        step.setAttribute('counter', 'EndNoteCounter');

        const snapshot = document.createElement('RT·counter·snapshot');
        snapshot.setAttribute('counter', 'EndNoteCounter');
        snapshot.setAttribute('snapshot', snap_name);

        const link = document.createElement('a');
        link.href = '#note_' + anchor_id_counter;
        link.id = 'cite_' + anchor_id_counter;
        link.innerHTML = '[<RT·counter·read snapshot="' + snap_name + '"></RT·counter·read>]';
        
        apply_style(link, config);

        step.appendChild(snapshot);
        step.appendChild(link);

        node.parentNode.replaceChild(step, node);

        endnote_buffer.push({ id: anchor_id_counter, text: ref_text, snap: snap_name });
        anchor_id_counter++;

      } else if(tag === 'rt·endnotes' || tag === 'rt-endnotes'){
        if(endnote_buffer.length === 0){
          node.parentNode.removeChild(node);
          continue;
        }

        const frag = document.createDocumentFragment();

        const pb = document.createElement('RT·page-break');
        frag.appendChild(pb);

        const header = document.createElement('h1');
        header.innerText = 'Endnotes';
        frag.appendChild(header);

        const list_container = document.createElement('ul');
        list_container.className = 'RT_endnote_list';
        apply_list_style(list_container, config);

        for(let j = 0; j < endnote_buffer.length; j++){
          const item = endnote_buffer[j];

          const li = document.createElement('li');
          li.id = 'note_' + item.id;
          li.style.display = 'flex';
          li.style.marginBottom = '0.5rem';

          const left_div = document.createElement('div');
          left_div.style.marginRight = '0.5rem';
          left_div.innerHTML = '[<RT·counter·read snapshot="' + item.snap + '"></RT·counter·read>]';

          const right_div = document.createElement('div');
          const return_link = document.createElement('a');
          return_link.href = '#cite_' + item.id;
          return_link.style.textDecoration = 'none';
          return_link.innerHTML = '&#8617;';
          return_link.style.marginLeft = '0.5em';

          right_div.innerHTML = item.text + ' ';
          right_div.appendChild(return_link);

          li.appendChild(left_div);
          li.appendChild(right_div);
          list_container.appendChild(li);
        }

        frag.appendChild(list_container);

        const counter_reset = document.createElement('RT·counter·make');
        counter_reset.setAttribute('counter', 'EndNoteCounter');
        counter_reset.setAttribute('style', 'CountingNumber');
        counter_reset.setAttribute('on-first-step', '0');
        frag.appendChild(counter_reset);

        // Unpack fragment directly into the article context to enable native UL splitting
        node.parentNode.replaceChild(frag, node);

        endnote_buffer = [];
      }
    }
  }

  RT.task_add('element' ,process_endnotes);

})();
