/*
  Element/grid.js
  Compiles semantic tabular structures into a Cartesian GridState, 
  then projects them using CSS Grid layout models.
*/

(function() {

  if (!window.RT) {
    console.error("RT not defined - was RT-Manuscript_make run?");
    return;
  }
  if (!window.RT.Element) {
    console.error("RT.Element not defined - was the state_manager run?");
    return;
  }

  // 1. Internal Sparse Array Representation
  class GridState {
    constructor() {
      this.cells = [];
      this.max_x = 0;
      this.max_y = 0;
    }

    insert(cell_data) {
      // cell_data: { element, type, x, y, x_extent, y_extent }
      this.cells.push(cell_data);
      if (cell_data.x_extent > this.max_x) this.max_x = cell_data.x_extent;
      if (cell_data.y_extent > this.max_y) this.max_y = cell_data.y_extent;
    }
  }

  // 2. The Physical Projection Engine (Tier 2 -> Tier 3)
  function project_grid(container_node, grid_state, model, options = {}) {
    const debug = window.RT.Debug || { log: function(){}, error: function(){} };
    
    const wrapper = document.createElement('div');
    wrapper.style.display = 'grid';
    wrapper.className = `RT_grid_container ${options.css_class || ''}`;

    if (options.delimiters) {
      wrapper.style.borderLeft = '2px solid var(--RT·content-main)';
      wrapper.style.borderRight = '2px solid var(--RT·content-main)';
      wrapper.style.borderRadius = '5px'; // Simulates matrix brackets
      wrapper.style.padding = '0.5rem';
    }

    const is_transposed = model === 'html-grid-transpose';

    grid_state.cells.forEach(cell => {
      let render_x = is_transposed ? cell.y : cell.x;
      let render_y = is_transposed ? cell.x : cell.y;
      let render_x_extent = is_transposed ? cell.y_extent : cell.x_extent;
      let render_y_extent = is_transposed ? cell.x_extent : cell.y_extent;

      const el = cell.element;
      
      // CSS Grid lines are 1-indexed. 
      // Extent is the rightmost cell index. End line is rightmost index + 2.
      el.style.gridColumn = `${render_x + 1} / ${render_x_extent + 2}`;
      el.style.gridRow = `${render_y + 1} / ${render_y_extent + 2}`;
      el.className = `RT_grid_${cell.type}`;
      
      // Base geometric formatting
      el.style.padding = '0.5rem 1rem';
      if (cell.type === 'column-header' || cell.type === 'row-header') {
        el.style.fontWeight = '600';
        if (cell.type === 'column-header') el.style.borderBottom = '2px solid var(--RT·border-strong)';
      }
      if (cell.type === 'name') {
        el.style.fontWeight = '500';
        el.style.borderRight = '1px solid var(--RT·border-faint)';
      }

      // Matrix forces rigidity
      if (options.no_wrap) {
        el.style.whiteSpace = 'nowrap';
        el.style.padding = '0.25rem 0.5rem';
      }

      wrapper.appendChild(el);
    });

    container_node.replaceWith(wrapper);

    // Two-Pass Measurement & Overflow Validation
    requestAnimationFrame(() => {
      if (options.wrap_check) {
        const data_cells = wrapper.querySelectorAll('.RT_grid_data, .RT_grid_name');
        data_cells.forEach(cell => {
          const computed = window.getComputedStyle(cell);
          const line_height = parseFloat(computed.lineHeight) || (parseFloat(computed.fontSize) * 1.2);
          
          // Structural wrap detection
          if (cell.scrollHeight > line_height * 1.5) {
            cell.style.paddingBottom = '1.5rem'; // Enforce visual row separation
          }
        });
      }

      if (wrapper.scrollWidth > wrapper.parentElement.clientWidth) {
        debug.error('Grid', 'Structural bounds exceeded: Grid width extends beyond viewport limits.');
      }
    });
  }

  // 3. Coordinate Arithmetic Parser
  function parse_coordinate(attr_value, current_val) {
    if (!attr_value) return { start: current_val, extent: current_val };
    const parts = attr_value.split('-');
    const start = parseInt(parts[0], 10);
    const extent = parts.length > 1 ? parseInt(parts[1], 10) : start;
    return { start, extent };
  }

  // 4. The Semantic Dispatchers
  RT.Element.add(function process_grids() {
    const debug = window.RT.Debug || { log: function(){} };

    // --- A. Native Grid Parser ---
    document.querySelectorAll('RT·grid, rt·grid').forEach(node => {
      const state = new GridState();
      const model = node.getAttribute('model') || 'html-grid-direct';
      const major_axis = node.getAttribute('major') || 'x';
      
      let cursor_x = 0;
      let cursor_y = 0;

      node.querySelectorAll('RT·e, rt·e').forEach(e => {
        const attr_x = e.getAttribute('x');
        const attr_y = e.getAttribute('y');
        
        // Carriage return logic
        if (major_axis === 'x') {
          if (attr_y && !attr_x) cursor_x = 0;
        } else {
          if (attr_x && !attr_y) cursor_y = 0;
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

    // --- B. Dictionary Parser ---
    document.querySelectorAll('RT·dictionary, rt·dictionary').forEach(node => {
      const state = new GridState();
      const key_label = node.getAttribute('key');
      const def_label = node.getAttribute('definition');
      
      if (key_label || def_label) {
        const h1 = document.createElement('RT·e'); h1.textContent = key_label || '';
        const h2 = document.createElement('RT·e'); h2.textContent = def_label || '';
        state.insert({ element: h1, type: 'column-header', x: 0, y: 0, x_extent: 0, y_extent: 0 });
        state.insert({ element: h2, type: 'column-header', x: 1, y: 0, x_extent: 1, y_extent: 0 });
      }

      let y = (key_label || def_label) ? 1 : 0;

      node.querySelectorAll('RT·entry, rt·entry').forEach(entry => {
        const k = document.createElement('RT·e');
        k.textContent = entry.getAttribute('key') || '';
        k.style.textAlign = 'right';
        
        const v = document.createElement('RT·e');
        v.innerHTML = entry.innerHTML;
        
        state.insert({ element: k, type: 'name', x: 0, y: y, x_extent: 0, y_extent: 0 });
        state.insert({ element: v, type: 'data', x: 1, y: y, x_extent: 1, y_extent: 0 });
        y++;
      });

      project_grid(node, state, 'html-grid-direct', { wrap_check: true });
    });

    // --- C. Relation Parser ---
    document.querySelectorAll('RT·relation, rt·relation').forEach(node => {
      const state = new GridState();
      const layout_intent = node.getAttribute('layout-intention') || 'row-tuple';
      const model = layout_intent === 'column-tuple' ? 'html-grid-transpose' : 'html-grid-direct';

      let offset_x = 0;
      let offset_y = 0;

      const col_head = node.querySelector('RT·column-header, rt·column-header');
      if (col_head) {
        offset_y = 1;
        let cx = node.querySelector('RT·row-header') || node.querySelector('RT·name') ? 1 : 0;
        col_head.querySelectorAll('RT·e, rt·e').forEach(e => {
          state.insert({ element: e.cloneNode(true), type: 'column-header', x: cx, y: 0, x_extent: cx, y_extent: 0 });
          cx++;
        });
      }

      const row_head = node.querySelector('RT·row-header, rt·row-header');
      if (row_head) {
        offset_x = 1;
        let ry = offset_y;
        row_head.querySelectorAll('RT·e, rt·e').forEach(e => {
          state.insert({ element: e.cloneNode(true), type: 'row-header', x: 0, y: ry, x_extent: 0, y_extent: ry });
          ry++;
        });
      }

      let y = offset_y;
      node.querySelectorAll('RT·tuple, rt·tuple').forEach(tuple => {
        let x = 0;
        const name = tuple.querySelector('RT·name, rt·name');
        if (name) {
          offset_x = 1;
          state.insert({ element: name.cloneNode(true), type: 'name', x: 0, y: y, x_extent: 0, y_extent: y });
        }
        x = offset_x;
        tuple.querySelectorAll('RT·e, rt·e').forEach(e => {
          state.insert({ element: e.cloneNode(true), type: 'data', x: x, y: y, x_extent: x, y_extent: y });
          x++;
        });
        y++;
      });

      project_grid(node, state, model, { wrap_check: true });
    });

    // --- D. Matrix Parser ---
    document.querySelectorAll('RT·matrix, rt·matrix').forEach(node => {
      const state = new GridState();
      const layout_intent = node.getAttribute('layout-intention') || 'row-vector';
      const model = layout_intent === 'column-vector' ? 'html-grid-transpose' : 'html-grid-direct';

      let offset_x = 0;
      let offset_y = 0;

      const col_head = node.querySelector('RT·column-header, rt·column-header');
      if (col_head) {
        offset_y = 1;
        let cx = node.querySelector('RT·name') ? 1 : 0;
        col_head.querySelectorAll('RT·e, rt·e').forEach(e => {
          state.insert({ element: e.cloneNode(true), type: 'column-header', x: cx, y: 0, x_extent: cx, y_extent: 0 });
          cx++;
        });
      }

      let y = offset_y;
      node.querySelectorAll('RT·vector, rt·vector').forEach(vec => {
        let x = 0;
        const name = vec.querySelector('RT·name, rt·name');
        if (name) {
          offset_x = 1;
          state.insert({ element: name.cloneNode(true), type: 'name', x: 0, y: y, x_extent: 0, y_extent: y });
        }
        x = offset_x;
        vec.querySelectorAll('RT·e, rt·e').forEach(e => {
          state.insert({ element: e.cloneNode(true), type: 'data', x: x, y: y, x_extent: x, y_extent: y });
          x++;
        });
        y++;
      });

      project_grid(node, state, model, { wrap_check: false, no_wrap: true, delimiters: true });
    });
  });

})();
