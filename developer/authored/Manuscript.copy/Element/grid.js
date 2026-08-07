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

    if (type === 'data' || type === 'x-label') {
      el.style.textAlign = 'center';
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

  function project_grid(container_node, grid_state, model, options = {}) {
    const config = window.RT.layout_config || {};
    switch (model) {
      case 'html-grid-direct':
        return render_model_html_standard(container_node, grid_state, options, false, config);
      case 'html-grid-transpose':
        return render_model_html_standard(container_node, grid_state, options, true, config);
      case 'html-grid-dictionary':
        return render_model_html_dictionary(container_node, grid_state, options, config);
    }
  }

  function render_model_html_standard(container_node, grid_state, options, is_transposed, config) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'grid';
    wrapper.style.justifyContent = 'start';
    wrapper.className = `RT_grid_container ${options.css_class || ''}`;
    // No splitter is registered for this wrapper ,so the grid is atomic: a
    // grid taller than a page grows its page rather than being cut. That is
    // the intended model. Claiming splitable without a registered splitter
    // is inert and misleading ,so the claim is not made. Restore it together
    // with an RT.Splitter entry if grids are ever made divisible.

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
      
      apply_style(el, cell, is_transposed, options, config);
      wrapper.appendChild(el);
    });

    container_node.replaceWith(wrapper);
    execute_two_pass_measurement(wrapper, options);
  }

  function render_model_html_dictionary(container_node, grid_state, options, config) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'grid';
    wrapper.style.gridTemplateColumns = 'max-content auto';
    wrapper.style.width = 'fit-content';
    wrapper.style.maxWidth = '100%';
    wrapper.className = `RT_grid_container ${options.css_class || ''}`;
    wrapper.style.margin = '1.5rem 0';
    // No splitter is registered for this wrapper ,so the grid is atomic: a
    // grid taller than a page grows its page rather than being cut. That is
    // the intended model. Claiming splitable without a registered splitter
    // is inert and misleading ,so the claim is not made. Restore it together
    // with an RT.Splitter entry if grids are ever made divisible.

    grid_state.cells.forEach(cell => {
      const el = cell.element;
      el.style.gridColumn = `${cell.x + 1} / ${cell.x_extent + 2}`;
      el.style.gridRow = `${cell.y + 1} / ${cell.y_extent + 2}`;
      el.className = `RT_grid_${cell.type}`;
      
      apply_style(el, cell, false, options, config);
      if (cell.type === 'data') el.style.textAlign = 'left';

      wrapper.appendChild(el);
    });

    container_node.replaceWith(wrapper);
    execute_two_pass_measurement(wrapper, options);
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
