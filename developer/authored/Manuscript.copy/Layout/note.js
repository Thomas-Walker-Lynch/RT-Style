/*
  Element/note.js
  Processes RT·Note·write and RT·Note·read tags for document cross referencing.
*/

(function(){

  if(!window.RT){
    console.error("RT not defined. Was RT_Manuscript_make run?");
    return;
  }

  function note(){
    const debug = window.RT.Debug || { log: function(){} ,error: function(){} };
    if(debug.log) debug.log('note' ,'Running note resolution');

    const root_node = document.documentElement;
    const ref_dictionary = {};

    // Pass 1: Gather writes
    const writes = root_node.querySelectorAll('RT·Note·write, rt·note·write');
    for(let i = 0; i < writes.length; i++){
      const node = writes[i];
      const key = node.getAttribute('key');
      
      if(key){
        const text_content = node.innerHTML;
        let page_num = "unknown";
        
        // Traverse up to find the page counter
        let parent = node.parentElement;
        while(parent){
          if( parent.tagName && (parent.tagName.toLowerCase() === 'rt·page') ){
            const page_read = parent.querySelector('rt·counter·read[snapshot^="page_snap_"]');
            if(page_read){
              page_num = page_read.innerHTML;
            }
            break;
          }
          parent = parent.parentElement;
        }

        ref_dictionary[key] = {
          content: text_content
          ,page: page_num
        };
      }
    }

    // Pass 2: Resolve reads
    const reads = root_node.querySelectorAll('RT·Note·read, rt·note·read');
    for(let i = 0; i < reads.length; i++){
      const node = reads[i];
      const key = node.getAttribute('key');
      const field = node.getAttribute('field') || 'content';

      if(key && ref_dictionary[key]){
        const value = ref_dictionary[key][field];
        if(value !== undefined){
          node.innerHTML = value;
        } else {
          node.innerHTML = `[Invalid field: ${field}]`;
        }
      } else {
        node.innerHTML = `[Unknown note: ${key}]`;
      }
    }
  }

  //----------------------------------------
  // Registration upon load
  //
  
  window.RT.note = note;

})();
