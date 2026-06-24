window.RT = window.RT || {};

// Dictionary for cross-referencing, strictly within the RT namespace.
window.RT.dict_label = {};

window.RT.counter_do_count = function (root_node) {
    let counters_state = {};

    function walk(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const tag = node.tagName.toLowerCase();
        let pushed_name = null;

        if (tag === 'rt-counter-init') {
            const name = node.getAttribute('name');
            if (name) {
                let initial_val = parseInt(node.getAttribute('initial'), 10);
                if (isNaN(initial_val)) {
                    initial_val = 1;
                }
                
                // We start one integer below the initial value so the 
                // first increment lands precisely on the initial value.
                counters_state[name] = {
                    stack: [initial_val - 1], 
                    separator: node.getAttribute('separator') || '.',
                    current_count_str: ''
                };
            }
        } else if (tag === 'rt-counter-indent') {
            const name = node.getAttribute('name');
            if (name && counters_state[name]) {
                counters_state[name].stack.push(0);
                pushed_name = name;
            }
        } else if (tag === 'rt-counter-inc') {
            const name = node.getAttribute('name');
            if (name && counters_state[name]) {
                const state = counters_state[name];
                state.stack[state.stack.length - 1] += 1;
                state.current_count_str = state.stack.join(state.separator);
                
                // Stamp the count onto the increment node for immediate layout
                node.setAttribute('data-count', state.current_count_str);
                node.innerHTML = state.current_count_str; 
            }
        } else if (tag === 'rt-counter-label') {
            const name = node.getAttribute('name');
            if (name && counters_state[name]) {
                // Stamp the most recent count onto the label node for the next pass
                node.setAttribute('data-count', counters_state[name].current_count_str);
            }
        }

        // Evaluate children sequentially
        let child = node.firstElementChild;
        while (child) {
            walk(child);
            child = child.nextElementSibling;
        }

        // Retreat up the hierarchy
        if (pushed_name) {
            counters_state[pushed_name].stack.pop();
        }
    }

    walk(root_node);
};

window.RT.counter_do_label = function (root_node) {
    window.RT.dict_label = {};
    const labels = root_node.querySelectorAll('rt-counter-label');
    for (let i = 0; i < labels.length; i++) {
        const lbl = labels[i].getAttribute('label');
        const count = labels[i].getAttribute('data-count');
        if (lbl && count !== null) {
            window.RT.dict_label[lbl] = count;
        }
    }
};

window.RT.counter_do_read = function (root_node) {
    const reads = root_node.querySelectorAll('rt-counter-read');
    for (let i = 0; i < reads.length; i++) {
        const label = reads[i].getAttribute('label');
        if (label && window.RT.dict_label[label]) {
            reads[i].innerHTML = window.RT.dict_label[label];
        }
    }
};
