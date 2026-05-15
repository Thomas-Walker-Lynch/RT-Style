/*
  Page Layout: Fixed Glow
  Standard: Theme 1.0
  Description: A variable-height container with a glowing border effect that matches the active theme.
*/
(function(){
  const RT = window.StyleRT = window.StyleRT || {};

  RT.page = function() {
    RT.config = RT.config || {};
    
    // Default Configuration
    const defaults = {
       width: "100%"
      ,min_height: "15rem" // Replaces fixed height
      ,padding: "3rem"
      ,margin: "4rem auto"
      
      ,bg_color:     "var(--rt-surface-0)"         
      ,border_color: "var(--rt-brand-primary)"     
      ,text_color:   "var(--rt-brand-primary)"     
      
      ,shadow: "drop-shadow(0px 0px 15px var(--rt-brand-primary))" 
    };

    RT.config.page = Object.assign({}, defaults, RT.config.page || {});

    const conf = RT.config.page;
    const style_id = 'rt-page-fixed-glow';
    
    if (!document.getElementById(style_id)) {
      const style_el = document.createElement('style');
      style_el.id = style_id;
      
      style_el.textContent = `
        /* Reset page counter on the article container */
        rt-article {
          counter-reset: rt-page-counter;
        }

        rt-page {
          display: block;
          position: relative;
          box-sizing: border-box;
          overflow: hidden; 

          /* Dimensions */
          width: ${conf.width};
          min-height: ${conf.min_height};
          margin: ${conf.margin};
          padding: ${conf.padding};
          
          /* Theming */
          background-color: ${conf.bg_color}; 
          border: 1px solid ${conf.border_color};
          
          /* The "Glow" Effect */
          filter: ${conf.shadow};
          
          /* Counter Increment */
          counter-increment: rt-page-counter;
        }

        /* Page Numbering */
        rt-page::after {
          content: "Page " counter(rt-page-counter);
          position: absolute;
          bottom: 1.5rem;
          right: 3rem;
          
          font-family: "Noto Sans", sans-serif;
          font-size: 0.9rem;
          font-weight: bold;
          
          color: ${conf.text_color}; 
          opacity: 0.8;
          pointer-events: none;
        }
      `;
      document.head.appendChild(style_el);
    }
  };
})();
