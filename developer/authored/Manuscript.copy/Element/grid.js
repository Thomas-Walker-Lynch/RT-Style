/*
  Element/grid.js
  Compiles semantic tabular structures into a Cartesian GridState.
*/

(function() {
  if (!window.RT) return;

  if(RT.Element.Grid) return;      // already plugged in
  const ns = RT.Element.Grid = {};

  const debug = window.RT.Debug || { log: function(){}, warn: function(){}, error: function(){} };

  class GridState {
    constructor() {
      this.cells = [];
    }

    insert(cell_data) {
      this.cells.push(cell_data);
    }
  }

  /* Compose the label, then place it.

     Aligning text inside a cell conflates two separate decisions. How the lines
     of a label sit relative to one another is a property of the label; where
     that block of lines sits within its cell is a property of the placement.
     Ragged text pushed hard against the right edge of a cell is the result of
     answering both with one text-align, and it reads as though the words were
     spilled into the corner rather than set.

     The label is therefore given its own box, sized to its content and capped at
     the width of the cell. The lines are set flush left within that box, which
     is how prose is read, and the box is then placed in the cell — against the
     data for a row heading, centred for a datum. It is the drawing convention:
     compose the label, then attach it.

     text-wrap: balance evens the line lengths so that no line is left holding a
     single stranded word. Where the browser does not implement it the text still
     wraps, so nothing is lost beyond the evenness.
  */
  function compose_label(el ,place){
    const inner = document.createElement('div');
    inner.className = 'RT_grid_label';
    inner.style.display = 'inline-block';
    inner.style.textAlign = 'left';
    inner.style.maxWidth = '100%';
    while(el.firstChild) inner.appendChild(el.firstChild);
    el.appendChild(inner);
    el.style.textAlign = place;
  }

  const apply_style = function(el, cell, is_transposed, options, config) {
    el.style.padding = '0.25rem 0.5rem';
    el.style.margin = '0';
    el.style.lineHeight = '1.3';

    const type = cell.type;
    const border_strong = '2px solid ' + (config.border_strong || '#000');
    const border_faint = '1px solid ' + (config.border_faint || '#ccc');

    if (type === 'x-label' || type === 'y-label' || type === 'corner') {
      el.style.fontWeight = '600';
    }

    if (type === 'x-label') {
      if (is_transposed) el.style.borderRight = border_strong;
      else el.style.borderBottom = border_strong;
    }
    
    if (type === 'y-label') {
      if (is_transposed) el.style.borderBottom = border_faint;
      else el.style.borderRight = border_faint;
    }
    
    if (type === 'corner') {
      if (is_transposed) {
        el.style.borderRight = border_strong;
        el.style.borderBottom = border_faint;
      } else {
        el.style.borderBottom = border_strong;
        el.style.borderRight = border_faint;
      }
    }

    /* Row headings sit against the data they label; column headings and data
       centre over their column. In every case the label's own lines are flush
       left inside its box. */
    if (type === 'y-label') {
      compose_label(el ,'right');
    } else if (type === 'corner') {
      compose_label(el ,'right');
    } else if (type === 'x-label' || type === 'data') {
      compose_label(el ,'center');
    }

    
    if ((is_transposed ? type === 'x-label' : type === 'y-label') || type === 'corner') {
      el.style.textAlign = 'right';
      el.style.paddingRight = '0.5rem'; 
    }

    if (options && options.no_wrap) {
      el.style.whiteSpace = 'nowrap';
      el.style.padding = '0.15rem 0.5rem';
    }
  };

  /* ---------------------------------------------------------------
     The rendering layer.

     Whether a grid can be divided is a property of how it is rendered ,not of
     the grid element. A CSS grid places every cell at an explicit row ,so
     cutting it means renumbering every row after the break; a nested list
     nests ,so cutting it is nearly free. These are different capabilities and
     they belong to whatever produces them.

     Each renderer therefore declares its own split function ,or declares none.
     Capability decides ,exactly as it does for elements: a model with no
     splitter yields an atomic grid ,and no attribute can pretend otherwise.

     Models are named for the axis mapping they produce ,reading as
     <row axis>_by_<column axis>:

       y-row_by_x-column   y runs down the rows ,x across the columns
       x-row_by_y-column   the transpose
       nested-list         rows nested as lists ,which also carries n dimensions

     The older names remain accepted so existing documents keep working.
  --------------------------------------------------------------- */

  ns.Renderer = {};

  const model_alias = {
    'html-grid-direct':     'y-row_by_x-column'
    ,'html-grid-transpose': 'x-row_by_y-column'
    ,'html-grid-dictionary':'y-row_by_x-column-dictionary'
  };

  function project_grid(container_node, grid_state, model, options = {}) {
    const config = window.RT.layout_config || {};
    const model_name = model_alias[model] || model || 'y-row_by_x-column';
    const renderer = ns.Renderer[model_name];

    if (!renderer) {
      window.RT.Debug.error('grid'
        ,"unknown rendering model '" + model + "'. Known models: "
        + Object.keys(ns.Renderer).join(' ,'));
      return;
    }
    return renderer.render(container_node, grid_state, options, config);
  }

  function render_model_html_standard(container_node, grid_state, options, is_transposed, config) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'grid';
    wrapper.style.justifyContent = 'start';
    wrapper.className = `RT_grid_container ${options.css_class || ''}`;
    // Rendered by a model that provides a splitter ,so the instance opts in.
    // The component registry is used rather than a tag registry: the wrapper is
    // a plain division and registering a splitter for every division would be
    // wrong. Both attributes are set ,the component naming the capability and
    // splitable carrying the per instance permission.
    wrapper.setAttribute('data-rt-component' ,'RT·Grid·css');
    wrapper.setAttribute('splitable' ,'true');

    if (options.delimiters) {
      wrapper.style.borderLeft = '2px solid ' + (config.content_main || '#000');
      wrapper.style.borderRight = '2px solid ' + (config.content_main || '#000');
      wrapper.style.borderRadius = '5px'; 
      wrapper.style.padding = '0.2rem';
      wrapper.style.margin = '1rem 0';
    } else {
      wrapper.style.margin = '1.5rem 0';
    }

    grid_state.cells.forEach(cell => {
      let render_x = is_transposed ? cell.y : cell.x;
      let render_y = is_transposed ? cell.x : cell.y;
      let render_x_extent = is_transposed ? cell.y_extent : cell.x_extent;
      let render_y_extent = is_transposed ? cell.x_extent : cell.y_extent;

      const el = cell.element;
      el.style.gridColumn = `${render_x + 1} / ${render_x_extent + 2}`;
      el.style.gridRow = `${render_y + 1} / ${render_y_extent + 2}`;
      el.className = `RT_grid_${cell.type}`;

      // Retained so a splitter can regroup cells by row and renumber them.
      // Without this the rendered grid is a flat bag of absolutely placed
      // cells and its row structure is unrecoverable.
      el.setAttribute('data-rt-row' ,render_y);
      el.setAttribute('data-rt-row-extent' ,render_y_extent);
      el.setAttribute('data-rt-col' ,render_x);

      apply_style(el, cell, is_transposed, options, config);
      wrapper.appendChild(el);
    });

    place_and_size(container_node ,wrapper ,options);
  }

  function render_model_html_dictionary(container_node, grid_state, options, config) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'grid';
    /* Recalcitrant wrapping in the key column.

       max-content makes the key column as wide as its longest key and refuses
       to wrap at any width. One long key then takes most of the table and the
       definitions are squeezed into a ribbon, which inverts the balance the
       reader expects: the column carrying least information takes most room.

       fit-content(limit) resolves to min(max-content ,max(min-content ,limit)).
       Keys keep their preferred width while they are short ,which is the common
       case and the one worth optimizing for ,and a key too long for the ceiling
       wraps rather than widening the column past it. Reluctant to wrap, not
       unwilling — the whole of the intent is in that distinction.

       The ceiling is a proportion rather than a length so it holds across page
       widths and themes. */
    const key_ceiling = (window.RT.config && window.RT.config.grid
                         && window.RT.config.grid.key_max_width) || '38%';
    wrapper.style.gridTemplateColumns = `fit-content(${key_ceiling}) 1fr`;
    wrapper.style.width = 'fit-content';
    wrapper.style.maxWidth = '100%';
    wrapper.className = `RT_grid_container ${options.css_class || ''}`;
    wrapper.style.margin = '1.5rem 0';
    // Rendered by a model that provides a splitter ,so the instance opts in.
    // The component registry is used rather than a tag registry: the wrapper is
    // a plain division and registering a splitter for every division would be
    // wrong. Both attributes are set ,the component naming the capability and
    // splitable carrying the per instance permission.
    wrapper.setAttribute('data-rt-component' ,'RT·Grid·css');
    wrapper.setAttribute('splitable' ,'true');

    grid_state.cells.forEach(cell => {
      const el = cell.element;
      el.style.gridColumn = `${cell.x + 1} / ${cell.x_extent + 2}`;
      el.style.gridRow = `${cell.y + 1} / ${cell.y_extent + 2}`;
      el.className = `RT_grid_${cell.type}`;

      el.setAttribute('data-rt-row' ,cell.y);
      el.setAttribute('data-rt-row-extent' ,cell.y_extent);
      el.setAttribute('data-rt-col' ,cell.x);

      apply_style(el, cell, false, options, config);
      if (cell.type === 'data') el.style.textAlign = 'left';

      wrapper.appendChild(el);
    });

    place_and_size(container_node ,wrapper ,options);
  }


  /* ---------------------------------------------------------------
     Splitting a rendered CSS grid.

     Cut between rows ,never within one. The header row is repeated on the
     continuation ,because a table of data whose column headings appear only on
     the first page is unreadable on every page after it.

     Rows must be renumbered on the continuation fragment. Every cell carries an
     explicit grid row ,so a fragment starting at row 12 would otherwise leave
     eleven empty rows above it.
  --------------------------------------------------------------- */

  function rows_of(wrapper){
    const rows = new Map();
    Array.from(wrapper.children).forEach(cell => {
      const r = parseInt(cell.getAttribute('data-rt-row') ,10);
      if(isNaN(r)) return;
      if(!rows.has(r)) rows.set(r ,[]);
      rows.get(r).push(cell);
    });
    return rows;
  }

  function place_row(cell ,new_row){
    const extent = parseInt(cell.getAttribute('data-rt-row-extent') ,10);
    const start = parseInt(cell.getAttribute('data-rt-row') ,10);
    const span = (isNaN(extent) ? start : extent) - start;
    cell.style.gridRow = `${new_row + 1} / ${new_row + span + 2}`;
    return cell;
  }

  /* Fragments inherit the frozen template through cloneNode, so probe and
     fragments lay out as the original did. Where a grid was rendered before
     freezing existed, fall back to a live read if the element is still
     attached; a detached element with no frozen value cannot be measured
     meaningfully, and the splitter declines rather than guessing. */
  function columns_known(el){
    return el.hasAttribute('data-rt-columns-frozen')
        || (el.isConnected && window.getComputedStyle(el).gridTemplateColumns !== 'none');
  }

  function pin_columns(source ,target){
    if(!source || !target) return target;
    if(source.style.gridTemplateColumns){
      target.style.gridTemplateColumns = source.style.gridTemplateColumns;
    }else if(source.isConnected){
      const resolved = window.getComputedStyle(source).gridTemplateColumns;
      if(resolved && resolved !== 'none') target.style.gridTemplateColumns = resolved;
    }
    return target;
  }

  function split_css_grid(el ,remaining ,measure_fn){
    if(!columns_known(el)){
      window.RT.Debug.warn('grid'
        ,'column widths unknown for a detached grid; declining to split rather than '
        + 'measuring against an ambient width.');
      return { first: null ,rest: el ,firstHeight: 0 };
    }
    const rows = rows_of(el);
    const keys = Array.from(rows.keys()).sort((a ,b) => a - b);

    // Fewer than three rows leaves nothing worth cutting once the header is
    // repeated on both sides.
    if(keys.length < 3) return { first: null ,rest: el ,firstHeight: 0 };

    const header_key = keys[0];
    const header_cells = rows.get(header_key);

    const probe = pin_columns(el ,el.cloneNode(false));
    header_cells.forEach(c => probe.appendChild(place_row(c.cloneNode(true) ,0)));
    let height = measure_fn(probe);
    if(height > remaining) return { first: null ,rest: el ,firstHeight: 0 };

    let taken = 0;
    for(let i = 1; i < keys.length; i++){
      const trial = rows.get(keys[i]).map(c => place_row(c.cloneNode(true) ,i));
      trial.forEach(c => probe.appendChild(c));
      const h = measure_fn(probe);
      if(h > remaining){
        trial.forEach(c => probe.removeChild(c));
        break;
      }
      height = h;
      taken = i;
    }

    // No data row fits beneath the header ,so there is no useful cut.
    if(taken === 0) return { first: null ,rest: el ,firstHeight: 0 };
    if(taken >= keys.length - 1) return { first: null ,rest: el ,firstHeight: 0 };

    const first = pin_columns(el ,el.cloneNode(false));
    header_cells.forEach(c => first.appendChild(place_row(c.cloneNode(true) ,0)));
    for(let i = 1; i <= taken; i++){
      rows.get(keys[i]).forEach(c => first.appendChild(place_row(c.cloneNode(true) ,i)));
    }

    const rest = pin_columns(el ,el.cloneNode(false));
    header_cells.forEach(c => rest.appendChild(place_row(c.cloneNode(true) ,0)));
    let out_row = 1;
    for(let i = taken + 1; i < keys.length; i++){
      rows.get(keys[i]).forEach(c => rest.appendChild(place_row(c.cloneNode(true) ,out_row)));
      out_row++;
    }

    if(window.RT.Debug.active_tokens.has('paginate_v')){
      window.RT.Debug.log('paginate_v'
        ,'      grid split: header + rows 1..' + taken + ' of ' + (keys.length - 1)
        + ' data rows ,' + height + 'px ,header repeated on continuation');
    }

    return { first ,rest ,firstHeight: height };
  }

  window.RT.Component = window.RT.Component || {};
  window.RT.Component['RT·Grid·css'] = { split: split_css_grid };


  /* Freeze the resolved column widths onto the wrapper at render time.

     A CSS grid sizes its columns from the content of every row it holds, and
     from the width available to it. Both are hazards for pagination.

     A probe holding four of twelve rows resolves different widths than the full
     table, so its measured height describes a fragment that will never exist.
     And because measurement happens in a container sized from the article, any
     change to the available width — a docked developer panel narrowing the
     viewport, for one — changes every height and therefore every split
     decision. Measurement that depends on ambient width is not deterministic.

     Resolving once, here, and recording the answer in pixels removes both. The
     value is written to the inline style, so it survives cloneNode and travels
     with fragments that have been detached from the document.
  */
  /* Size every composed label. The work belongs to the utility ,since nothing
     about it is particular to grids; a label in any element wants the same
     treatment. Run after the columns are frozen ,so the wrapping measured is
     the wrapping that will be rendered. */
  function shrink_labels(wrapper){
    if(!wrapper || !wrapper.isConnected) return;
    const labels = wrapper.querySelectorAll('.RT_grid_label');
    for(let i = 0; i < labels.length; i++){
      window.RT.Utility.Dom.shrink_wrap(labels[i]);
    }
  }

  /* Size the grid ,then put it in the book.

     The order matters and it used to be the other way round. Placing the
     wrapper in the flow first meant every probe that followed — the column
     freeze ,and a dozen width trials per label — was answered by laying out
     the whole of the rest of the manuscript ,because a label that changes
     width changes its row's height and moves everything below it. The cost
     scaled with the length of the book rather than with the size of the table ,
     which is why it appeared as general slowness rather than as slow tables.

     Measured in the host the same probes cost nothing beyond the grid itself.
     The host is out of flow ,so nothing below it moves ,and it is a child of
     the parent the grid is bound for at that parent's content width ,so the
     wrapping measured is the wrapping that will be rendered.

     Both results are explicit lengths — a frozen column template ,a pixel
     width per label — so they survive the move into the flow unchanged.

     Where no host can be established the old order stands. Measuring in place
     is slow ,and measuring at the wrong width is wrong ,and slow is better.
  */
  function place_and_size(container_node ,wrapper ,options){
    const host = window.RT.Utility.Dom.measure_host_make
               ? window.RT.Utility.Dom.measure_host_make(container_node)
               : null;

    if(host){
      host.appendChild(wrapper);
      freeze_columns(wrapper);
      shrink_labels(wrapper);
      container_node.replaceWith(wrapper);
      host.remove();
    }else{
      container_node.replaceWith(wrapper);
      freeze_columns(wrapper);
      shrink_labels(wrapper);
    }

    execute_two_pass_measurement(wrapper ,options);
  }

  function freeze_columns(wrapper){
    if(!wrapper || !wrapper.isConnected) return;
    const resolved = window.getComputedStyle(wrapper).gridTemplateColumns;
    if(resolved && resolved !== 'none'){
      wrapper.style.gridTemplateColumns = resolved;
      wrapper.setAttribute('data-rt-columns-frozen' ,'true');
    }
  }

  function execute_two_pass_measurement(wrapper, options) {
    requestAnimationFrame(() => {
      if (options.wrap_check) {
        const data_cells = wrapper.querySelectorAll('.RT_grid_data, .RT_grid_y-label');
        data_cells.forEach(cell => {
          const computed = window.getComputedStyle(cell);
          const line_height = parseFloat(computed.lineHeight) || (parseFloat(computed.fontSize) * 1.2);
          const pTop = parseFloat(computed.paddingTop) || 0;
          const pBot = parseFloat(computed.paddingBottom) || 0;
          const content_height = cell.scrollHeight - pTop - pBot;
          
          if (content_height > line_height * 1.5) {
            cell.style.paddingBottom = '1.25rem'; 
          }
        });
      }
    });
  }


  /* ---------------------------------------------------------------
     Nested list rendering.

     Each row becomes a list item; the cells of that row become a nested list
     within it. Two properties follow ,and both are why the model is worth
     having.

     It divides almost for free. A list is already divisible by the generic list
     splitter ,so no grid specific machinery is needed and the cut costs nothing
     to compute.

     It carries more than two dimensions. A CSS grid has exactly two axes and no
     way to express a third; nesting has no such limit ,so an n dimensional
     model renders as lists within lists to whatever depth the data has.

     There is no header to repeat: the labels travel with their rows.
  --------------------------------------------------------------- */

  function render_model_nested_list(container_node, grid_state, options, config) {
    const rows = new Map();
    grid_state.cells.forEach(cell => {
      const r = cell.y;
      if(!rows.has(r)) rows.set(r ,[]);
      rows.get(r).push(cell);
    });

    const list = document.createElement('ul');
    list.className = `RT_grid_container RT_grid_nested ${options.css_class || ''}`;
    list.style.listStyle = 'none';
    list.style.margin = '1.5rem 0';
    list.style.paddingLeft = '0';

    Array.from(rows.keys()).sort((a ,b) => a - b).forEach(r => {
      const row_cells = rows.get(r).sort((a ,b) => a.x - b.x);
      const item = document.createElement('li');
      item.className = 'RT_grid_row';
      item.style.margin = '0.4rem 0';

      // The first cell of a row labels it; the remainder nest beneath.
      const label_cell = row_cells[0];
      if(label_cell){
        const label = label_cell.element;
        label.className = `RT_grid_${label_cell.type}`;
        apply_style(label ,label_cell ,false ,options ,config);
        label.style.textAlign = 'left';
        item.appendChild(label);
      }

      if(row_cells.length > 1){
        const inner = document.createElement('ul');
        inner.style.listStyle = 'none';
        inner.style.marginLeft = '1.25rem';
        inner.style.paddingLeft = '0';
        row_cells.slice(1).forEach(cell => {
          const li = document.createElement('li');
          const el = cell.element;
          el.className = `RT_grid_${cell.type}`;
          apply_style(el ,cell ,false ,options ,config);
          el.style.textAlign = 'left';
          li.appendChild(el);
          inner.appendChild(li);
        });
        item.appendChild(inner);
      }

      list.appendChild(item);
    });

    container_node.replaceWith(list);
    // Divisible by the generic list splitter ,so no component registration is
    // needed. The instance gate is still set explicitly.
    list.setAttribute('splitable' ,'true');
  }

  /* Model registration. A model appears here with a split function or without
     one; the presence of the function is what makes grids of that model
     divisible. All three current models divide. */

  ns.Renderer['y-row_by_x-column'] = {
    render: (c ,s ,o ,cfg) => render_model_html_standard(c ,s ,o ,false ,cfg)
    ,split: split_css_grid
    ,repeats_header: true
  };

  ns.Renderer['x-row_by_y-column'] = {
    render: (c ,s ,o ,cfg) => render_model_html_standard(c ,s ,o ,true ,cfg)
    ,split: split_css_grid
    ,repeats_header: true
  };

  ns.Renderer['y-row_by_x-column-dictionary'] = {
    render: (c ,s ,o ,cfg) => render_model_html_dictionary(c ,s ,o ,cfg)
    ,split: split_css_grid
    ,repeats_header: true
  };

  ns.Renderer['nested-list'] = {
    render: render_model_nested_list
    ,split: null              // the generic list splitter handles it
    ,repeats_header: false
  };

  function parse_coordinate(attr_value, current_val) {
    if (!attr_value) return { start: current_val, extent: current_val };
    const parts = attr_value.split('-');
    const start = parseInt(parts[0], 10);
    const extent = parts.length > 1 ? parseInt(parts[1], 10) : start;
    return { start, extent };
  }

  RT.task_add('element' ,function process_grids() {
    if(debug.log) debug.log('grid', 'Processing grid structures');

    // 1. Native Grid
    document.querySelectorAll('RT·grid').forEach(node => {
      const state = new GridState();
      const model = node.getAttribute('model') || 'html-grid-direct';
      const major_axis = node.getAttribute('major') || 'x';
      
      let cursor_x = 0;
      let cursor_y = 0;

      node.querySelectorAll('RT·e').forEach(e => {
        const attr_x = e.getAttribute('x');
        const attr_y = e.getAttribute('y');
        
        if (major_axis === 'x') {
          if (attr_y && !attr_x && attr_y !== String(cursor_y)) cursor_x = 0;
        } else {
          if (attr_x && !attr_y && attr_x !== String(cursor_x)) cursor_y = 0;
        }

        const parsed_x = parse_coordinate(attr_x, cursor_x);
        const parsed_y = parse_coordinate(attr_y, cursor_y);

        cursor_x = parsed_x.start;
        cursor_y = parsed_y.start;

        const type = e.getAttribute('type') || 'data';
        state.insert({ 
          element: e.cloneNode(true), type: type,
          x: cursor_x, y: cursor_y, 
          x_extent: parsed_x.extent, y_extent: parsed_y.extent 
        });

        if (major_axis === 'x') cursor_x = parsed_x.extent + 1;
        else cursor_y = parsed_y.extent + 1;
      });

      project_grid(node, state, model, { wrap_check: true });
    });

    // 2. Dictionary
    document.querySelectorAll('RT·dictionary').forEach(node => {
      const state = new GridState();
      const key_label = node.getAttribute('key');
      const def_label = node.getAttribute('definition');
      
      let y = 0;

      if (key_label || def_label) {
        const h1 = document.createElement('RT·e'); h1.textContent = key_label || '•';
        const h2 = document.createElement('RT·e'); h2.textContent = def_label || '•';
        state.insert({ element: h1, type: 'x-label', x: 0, y: y, x_extent: 0, y_extent: y });
        state.insert({ element: h2, type: 'x-label', x: 1, y: y, x_extent: 1, y_extent: y });
        y++;
      }

      node.querySelectorAll('RT·entry').forEach(entry => {
        const k = document.createElement('RT·e');
        k.textContent = entry.getAttribute('key') || '•';
        
        const v = document.createElement('RT·e');
        v.innerHTML = entry.innerHTML;
        
        state.insert({ element: k, type: 'y-label', x: 0, y: y, x_extent: 0, y_extent: y });
        state.insert({ element: v, type: 'data', x: 1, y: y, x_extent: 1, y_extent: y });
        y++;
      });

      project_grid(node, state, 'html-grid-dictionary', { wrap_check: true });
    });

    // 3. Relation
    document.querySelectorAll('RT·relation').forEach(node => {
      if(debug.log) debug.log('grid', '<RT·relation> node evaluated');
      
      const state = new GridState();
      const layout_intent = node.getAttribute('layout-intention') || 'row-tuple';
      const model = layout_intent === 'column-tuple' ? 'html-grid-transpose' : 'html-grid-direct';
      const tuples = node.querySelectorAll('RT·tuple');

      let has_any_name = false;
      tuples.forEach(tuple => {
        if (tuple.querySelectorAll('RT·name').length > 0) {
          has_any_name = true;
        }
      });

      let offset_x = has_any_name ? 1 : 0;
      let offset_y = 0;

      const col_head = node.querySelector('RT·tuple-meta');
      if (col_head) {
        offset_y = 1;
        let cx = offset_x;
        col_head.querySelectorAll('RT·e').forEach(e => {
          state.insert({ element: e.cloneNode(true), type: 'x-label', x: cx, y: 0, x_extent: cx, y_extent: 0 });
          cx++;
        });
        
        if (has_any_name) {
          const corner_el = document.createElement('RT·e');
          corner_el.textContent = '•';
          state.insert({ element: corner_el, type: 'corner', x: 0, y: 0, x_extent: 0, y_extent: 0 });
        }
      }

      let y = offset_y;
      tuples.forEach(tuple => {
        if (has_any_name) {
          const names = tuple.querySelectorAll('RT·name');
          const name_container = document.createElement('RT·e');
          
          if (names.length > 0) {
            const name_texts = Array.from(names).map(n => n.textContent.trim());
            name_container.innerHTML = name_texts.join('<br>');
          } else {
            name_container.textContent = '•';
          }
          state.insert({ element: name_container, type: 'y-label', x: 0, y: y, x_extent: 0, y_extent: y });
        }
        
        let x = offset_x;
        tuple.querySelectorAll('RT·e').forEach(e => {
          state.insert({ element: e.cloneNode(true), type: 'data', x: x, y: y, x_extent: x, y_extent: y });
          x++;
        });
        y++;
      });

      project_grid(node, state, model, { wrap_check: true });
    });

    // 4. Matrix
    document.querySelectorAll('RT·matrix').forEach(node => {
      const state = new GridState();
      const layout_intent = node.getAttribute('layout-intention') || 'row-vector';
      const model = layout_intent === 'column-vector' ? 'html-grid-transpose' : 'html-grid-direct';
      const vectors = node.querySelectorAll('RT·vector');

      let has_any_name = false;
      vectors.forEach(vec => {
        if (vec.querySelectorAll('RT·name').length > 0) {
          has_any_name = true;
        }
      });

      let offset_x = has_any_name ? 1 : 0;
      let offset_y = 0;

      const vector_meta = node.querySelector('RT·vector-meta');
      if (vector_meta) {
        offset_y = 1;
        let cx = offset_x;
        vector_meta.querySelectorAll('RT·label').forEach(e => {
          state.insert({ element: e.cloneNode(true), type: 'x-label', x: cx, y: 0, x_extent: cx, y_extent: 0 });
          cx++;
        });
        
        if (has_any_name) {
          const corner_el = document.createElement('RT·e');
          corner_el.textContent = '•';
          state.insert({ element: corner_el, type: 'corner', x: 0, y: 0, x_extent: 0, y_extent: 0 });
        }
      }

      let y = offset_y;
      vectors.forEach(vec => {
        if (has_any_name) {
          const names = vec.querySelectorAll('RT·name');
          const name_container = document.createElement('RT·e');
          
          if (names.length > 0) {
            const name_texts = Array.from(names).map(n => n.textContent.trim());
            name_container.innerHTML = name_texts.join('<br>');
          } else {
            name_container.textContent = '•';
          }
          state.insert({ element: name_container, type: 'y-label', x: 0, y: y, x_extent: 0, y_extent: y });
        }
        
        let x = offset_x;
        vec.querySelectorAll('RT·e').forEach(e => {
          state.insert({ element: e.cloneNode(true), type: 'data', x: x, y: y, x_extent: x, y_extent: y });
          x++;
        });
        y++;
      });

      project_grid(node, state, model, { wrap_check: false, no_wrap: true, delimiters: true });
    });
  });

})();
