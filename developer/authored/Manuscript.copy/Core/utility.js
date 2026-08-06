/*
  Core/utility.js
  Centralized utility functions for global registry queries and repetitive DOM operations.
*/

(function(){

  window.RT = window.RT || {};
  window.RT.Utility = window.RT.Utility || {};

  // Registry Management
  window.RT.Utility.Registry = {
    has: function(namespace_obj, key) {
      return namespace_obj && Object.prototype.hasOwnProperty.call(namespace_obj, key);
    },
    
    register_make: function(namespace_obj, counter_name, node_ref, attributes) {
      namespace_obj[counter_name] = namespace_obj[counter_name] || {};
      namespace_obj[counter_name].node = node_ref;
      
      if (attributes) {
         for (let i = 0; i < attributes.length; i++) {
           namespace_obj[counter_name][attributes[i]] = ""; // Flag presence
         }
      }
    }
  };

  // DOM Structural Operations
  window.RT.Utility.Dom = window.RT.Utility.Dom || {};
  
  window.RT.Utility.Dom.get_structural_depth = function(element, counter_name) {
    let depth = 0;
    let curr = element.parentElement;
    
    while(curr) {
      const tag = (curr.tagName || '').toLowerCase();
      if (tag === 'rt·section' || (tag === 'rt·counter·step' && curr.getAttribute('counter') === counter_name)) {
        depth++;
      }
      curr = curr.parentElement;
    }
    return depth;
  };

})();
