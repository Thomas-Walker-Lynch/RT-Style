/*
  Element/section.js
  Expands <RT·section> macros into <RT·counter·step> primitives.
  Utilizes the RT.Element.Section namespace for state tracking and execution guards.
*/

(function(){

  if(!window.RT) return;

  if(RT.Element.Section) return;      // already plugged in
  const ns = RT.Element.Section = {};

  ns.tags = ['RT·section'];

  /* One counter per division of the book.

     A single counter across the whole manuscript numbers the preface as
     chapter one and starts the appendices wherever the last chapter left off.
     The divisions of a book are not one sequence and never were ,so they do
     not share a counter.

     A section names the counter it steps ,and that name is the word the reader
     sees: a cross reference written key="counter count" against a counter
     named 'Appendix' prints 'Appendix B'. Counters are named for print.

     This table holds the make configuration of the counters the section
     element creates ,keyed by counter name. It is open. An author wanting a
     numbered part ,or a second appendix sequence ,adds an entry before the
     element phase runs:

       RT.Element.Section.dict_counter['Part'] =
         { style: 'Roman' ,on_first_step: 'I' };

     and writes <RT·section counter="Part">. A counter named on a section but
     absent from the table is still made ,on the default configuration: the
     table varies the style ,it does not gate the name. Sections nested inside
     a section inherit its counter ,so the attribute is written once at the top
     of a division and not repeated.
  */
  ns.dict_counter = {
    'Chapter': {
      style: 'CountingNumber'
      ,on_first_step: '0'
    }
    ,'Front Matter': {
      style: 'roman'
      ,on_first_step: 'i'
    }
    ,'Appendix': {
      style: 'Alpha,CountingNumber'
      ,on_first_step: 'A'
    }
  };

  ns.counter_default = 'Chapter';

  /* The counter is written on the outermost section of a division. Read it
     from the nearest ancestor that has one.

     Sections are expanded in document order ,so by the time a nested section is
     reached its ancestors are already steps carrying data-RT-counter. Both
     forms are checked ,since an ancestor may be either. */
  const resolve_counter = function(section){
    let curr = section;
    while(curr){
      const declared = curr.getAttribute && (curr.getAttribute('counter')
                                          || curr.getAttribute('data-RT-counter'));
      if(declared) return declared;
      curr = curr.parentElement;
    }
    return ns.counter_default;
  };

  const apply_style = function(title_node ,depth ,config){
    const base_size = 2.25;
    const size = Math.max(1.1 ,base_size - (depth * 0.35));
    const fade_opacity = Math.max(0.5 ,1 - (depth * 0.2));

    if(depth === 0){
      title_node.style.textAlign = 'center';
      title_node.style.paddingLeft = '0';
      title_node.style.borderBottom = '2px solid #B22222'; 
      title_node.style.paddingBottom = '0.5rem';
    }else{
      title_node.style.textAlign = 'left';
      title_node.style.paddingLeft = (depth * 1.5) + 'rem';
    }

    title_node.style.fontSize = size + 'em';
    title_node.style.fontWeight = '600';
    title_node.style.color = config.brand_primary || '#000';
    title_node.style.opacity = fade_opacity.toString();
    title_node.style.marginTop = depth === 0 ? '3rem' : '2rem';
    title_node.style.marginBottom = '1rem';
    title_node.style.lineHeight = '1.2';
  };

  RT.task_add('element' ,function(){
    const debug = window.RT.Debug || { log: function(){} };
    if(debug.log) debug.log('section' ,'Expanding section macros');

    const U = window.RT.Utility;
    const config = window.RT.layout_config || {};
    const section_seq = document.querySelectorAll('RT·section');

    if(section_seq.length === 0) return;

    const article = document.querySelector('RT·article, RT·memo');

    /* One make tag per counter ,emitted the first time that counter is used. A
       counter never referenced costs nothing and leaves nothing behind. */
    const make_counter = function(counter_name){
      const spec = ns.dict_counter[counter_name] || {};

      if(article && !U.Registry.has(ns ,counter_name)){
        /* Named but not configured is allowed ,and worth saying once: it is
           equally a new division and a misspelt one. */
        if(!ns.dict_counter[counter_name] && debug.log){
          debug.log('section' ,"counter '" + counter_name
            + "' is not in dict_counter; made on the default configuration");
        }

        const make = document.createElement('RT·counter·make');
        make.setAttribute('counter' ,counter_name);
        make.setAttribute('style' ,spec.style || 'CountingNumber');
        make.setAttribute('mode' ,'scoped');
        make.setAttribute('on-first-step' ,spec.on_first_step !== undefined ? spec.on_first_step : '0');
        article.insertBefore(make ,article.firstChild);

        // Register the physical node and its attributes into the global namespace
        U.Registry.register_make(ns ,counter_name ,make ,['splitable']);
      }

      return counter_name;
    };

    let section_idx = 0;

    section_seq.forEach(section => {
      const counter_name = make_counter(resolve_counter(section));

      // Utilize the abstracted structural depth utility
      let depth = U.Dom.get_structural_depth(section ,counter_name);

      if(depth === 0){
        if(!section.previousElementSibling?.tagName?.toLowerCase().includes('page-break')){
          const pb = document.createElement('RT·page-break');
          section.parentNode.insertBefore(pb ,section);
        }
      }

      const snap_id = section.id || ('section_snap_' + section_idx++);
      
      const step = document.createElement('RT·counter·step');
      step.setAttribute('counter' ,counter_name);

      /* The counter travels with the step ,so nested sections can read it and
         so the contents list can gather every division without knowing which
         counters exist. */
      step.setAttribute('data-RT-counter' ,counter_name);
      step.setAttribute('data-RT-section' ,'true');
      
      // Query the global dictionary for the splitable flag
      if( U.Registry.has(ns[counter_name] ,'splitable') ){
         step.setAttribute('splitable' ,'true');
      }
      
      step.id = snap_id; 

      const snap = document.createElement('RT·counter·snapshot');
      snap.setAttribute('counter' ,counter_name);
      snap.setAttribute('snapshot' ,snap_id);
      step.appendChild(snap);

      const title_node = document.createElement('div');
      title_node.className = 'RT·section-title';

      /* Marked as a heading ,for the paginator's widow control. A title is a
         composed division rather than an <h1> ,so nothing about its tag says
         what it is; the mark says it. */
      title_node.setAttribute('data-RT-heading' ,'true');

      /* The number alone. A title that should read 'Appendix B' is a
         key="counter count" read ,and that is the author's choice to make ,not
         one the macro makes for every section in the book. */
      const read_count = document.createElement('RT·counter·read');
      read_count.setAttribute('snapshot' ,snap_id);

      const title_content = document.createElement('span');
      title_content.style.marginLeft = '0.75rem';
      
      const read_step = document.createElement('RT·counter·read');
      read_step.setAttribute('snapshot' ,snap_id);
      read_step.setAttribute('key' ,'step');
      title_content.appendChild(read_step);

      title_node.appendChild(read_count);
      title_node.appendChild(title_content);

      apply_style(title_node ,depth ,config);
      step.appendChild(title_node);

      while(section.firstChild){
        const child = section.firstChild;
        if((child.tagName || '').toLowerCase() === 'rt·name'){
          child.style.display = 'none';
        }
        step.appendChild(child);
      }

      section.parentNode.replaceChild(step ,section);
    });
  });

})();
