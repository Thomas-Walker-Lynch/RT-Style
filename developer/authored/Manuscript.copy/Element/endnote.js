/*
  Processes <rt·cite> tags and generates an <rt·endnotes> section.
  Creates bidirectional links between inline citations and the generated endnotes list.
*/

(function(){

  if(!window.RT){
    console.error("RT not defined");
    return;
  }
  if(!window.RT.Element){
    console.error("RT.Element not defined");
    return;
  }

  window.RT.Element.add(function(){
    const debug = window.RT.Debug || { log: function(){} };
    if(debug.log){
      debug.log('endnote' ,'Processing endnotes');
    }

    const endnotes = document.querySelectorAll('RT·endnote');
    if(endnotes.length === 0){
      return;
    }

    const article = document.querySelector('RT·article');
    if(!article){
      return;
    }

    let endnotes_header = document.getElementById('endnotes_header');
    if(!endnotes_header){
      endnotes_header = document.createElement('h1');
      endnotes_header.id = 'endnotes_header';
      endnotes_header.innerText = 'Endnotes';
      article.appendChild(endnotes_header);
    }

    let endnote_container = document.querySelector('RT·endnotes');
    if(!endnote_container){
      endnote_container = document.createElement('RT·endnotes');
      article.appendChild(endnote_container);
    }

    if(!endnote_container.querySelector('.RT_endnote_list')){
      const list_container = document.createElement('div');
      list_container.className = 'RT_endnote_list';
      endnote_container.appendChild(list_container);
      
      const counter_make = document.createElement('RT·counter·make');
      counter_make.setAttribute('counter' ,'endnote');
      counter_make.setAttribute('style' ,'CountingNumber'); 
      article.insertBefore(counter_make ,article.firstChild);
    }
    
    const list = endnote_container.querySelector('.RT_endnote_list');

    function process_endnote(node ,index){
      const snapshot_name = 'endnote_cite_' + index;
      const ref_text = node.innerHTML;
      
      const step = document.createElement('RT·counter·step');
      step.setAttribute('counter' ,'endnote');
      
      const snapshot = document.createElement('RT·counter·snapshot');
      snapshot.setAttribute('counter' ,'endnote');
      snapshot.setAttribute('snapshot' ,snapshot_name);
      
      node.parentNode.insertBefore(step ,node);
      step.appendChild(snapshot);
      step.appendChild(node);

      node.innerHTML = '<a href="#note_' + index + '" id="cite_' + index + '">[<RT·counter·read snapshot="' + snapshot_name + '"></RT·counter·read>]</a>';
      node.style.cursor = 'pointer';
      node.style.color = window.RT.theme('read' ,'brand' ,'link');
      node.style.textDecoration = 'none';

      const li = document.createElement('div');
      li.id = 'note_' + index;
      li.style.display = 'flex';
      li.style.marginBottom = '0.5rem';
      
      const left_div = document.createElement('div');
      left_div.style.marginRight = '0.5rem';
      left_div.innerHTML = '[<RT·counter·read snapshot="' + snapshot_name + '"></RT·counter·read>]';
      
      const right_div = document.createElement('div');
      const return_link = document.createElement('a');
      return_link.href = '#cite_' + index;
      return_link.style.textDecoration = 'none';
      return_link.innerHTML = '&#8617;';
      
      right_div.innerHTML = ref_text + ' ';
      right_div.appendChild(return_link);
      
      li.appendChild(left_div);
      li.appendChild(right_div);
      
      list.appendChild(li);
    }

    for(let i = 0; i < endnotes.length; i++){
      process_endnote(endnotes[i] ,i + 1);
    }

    endnote_container.style.display = 'block';
    endnote_container.style.marginTop = '1rem';
    endnote_container.style.borderTop = '1px solid ' + window.RT.theme('read' ,'surface' ,'3');
    endnote_container.style.paddingTop = '1rem';
  });

})();
