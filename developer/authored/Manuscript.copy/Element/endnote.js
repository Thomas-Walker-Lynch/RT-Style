/*
  Element/endnote.js
  Processes <RT·endnote> tags inline and dumps them when <RT·endnotes> is encountered.
*/

(function(){

  if(!window.RT) return;

  const apply_style = function(link, config) {
    link.style.cursor = 'pointer';
    link.style.color = config.brand_link || '#0056b3';
    link.style.textDecoration = 'none';
  };

  const apply_list_style = function(list_container, config) {
    list_container.style.marginTop = '1rem';
    list_container.style.borderTop = '1px solid ' + (config.surface_3 || '#ccc');
    list_container.style.paddingTop = '1rem';
  };

  function process_endnotes(){
    const config = window.RT.layout_config || {};
    const article = document.querySelector('RT·article, rt·article, RT·memo, rt·memo');
    
    if(!article) return;

    const initial_make = document.createElement('RT·counter·make');
    initial_make.setAttribute('counter', 'EndNoteCounter');
    initial_make.setAttribute('style', 'CountingNumber');
    initial_make.setAttribute('on-first-step', '0');
    article.insertBefore(initial_make, article.firstChild);

    // Defensively targets both the standard RT namespace block and the unmigrated hyphen blocks.
    const nodes = document.querySelectorAll('RT·endnote, rt·endnote, RT-endnote, rt-endnote, RT·endnotes, rt·endnotes, RT-endnotes, rt-endnotes');
    
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

        const wrapper = document.createElement('div');
        wrapper.className = 'RT_endnotes_section';

        const pb = document.createElement('RT·page-break');
        wrapper.appendChild(pb);

        const header = document.createElement('h1');
        header.innerText = 'Endnotes';
        wrapper.appendChild(header);

        const list_container = document.createElement('div');
        list_container.className = 'RT_endnote_list';
        apply_list_style(list_container, config);

        for(let j = 0; j < endnote_buffer.length; j++){
          const item = endnote_buffer[j];

          const li = document.createElement('div');
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

        wrapper.appendChild(list_container);

        const counter_reset = document.createElement('RT·counter·make');
        counter_reset.setAttribute('counter', 'EndNoteCounter');
        counter_reset.setAttribute('style', 'CountingNumber');
        counter_reset.setAttribute('on-first-step', '0');
        wrapper.appendChild(counter_reset);

        node.parentNode.replaceChild(wrapper, node);

        endnote_buffer = [];
      }
    }
  }

  window.RT.Element.add(process_endnotes);

})();
