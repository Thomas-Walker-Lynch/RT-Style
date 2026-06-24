window.RT = window.RT || {};
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
                
                counters_state[name] = {
                    stack: [initial_val - 1], 
                    separator: node.getAttribute('separator') || '.',
                    style: node.getAttribute('style') || 'Natural',
                    initial: initial_val,
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
                
                node.setAttribute('data-count', state.current_count_str);
                node.innerHTML = state.current_count_str; 
            }
        } else if (tag === 'rt-counter-label') {
            const name = node.getAttribute('name');
            if (name && counters_state[name]) {
                const state = counters_state[name];
                // Stamp all relevant metadata for the labeling phase
                node.setAttribute('data-count', state.current_count_str);
                node.setAttribute('data-style', state.style);
                node.setAttribute('data-separator', state.separator);
                node.setAttribute('data-initial', state.initial);
            }
        }

        let child = node.firstElementChild;
        while (child) {
            walk(child);
            child = child.nextElementSibling;
        }

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
        if (lbl) {
            // Store a complete property object instead of just a string
            window.RT.dict_label[lbl] = {
                count: labels[i].getAttribute('data-count'),
                name: labels[i].getAttribute('name'),
                style: labels[i].getAttribute('data-style'),
                separator: labels[i].getAttribute('data-separator'),
                initial: labels[i].getAttribute('data-initial')
            };
        }
    }
};

window.RT.counter_do_read = function (root_node) {
    const reads = root_node.querySelectorAll('rt-counter-read');
    for (let i = 0; i < reads.length; i++) {
        const label = reads[i].getAttribute('label');
        // Default to 'count' if no key is provided
        const key = reads[i].getAttribute('key') || 'count'; 
        
        if (label && window.RT.dict_label[label]) {
            const value = window.RT.dict_label[label][key];
            if (value !== undefined && value !== null) {
                reads[i].innerHTML = value;
            } else {
                reads[i].innerHTML = `[Missing key: ${key}]`;
            }
        }
    }
};
