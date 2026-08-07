/*
  Processes <rt·theme-selector> tags.
  Builds a floating UI for the user to switch active themes.
*/

(function() {

  if (!window.RT) {
    console.error("RT not defined - was RT-Manuscript_make run?");
    return;
  }

  if(RT.Element.ThemeSelector) return;      // already plugged in
  const ns = RT.Element.ThemeSelector = {};
  if (!window.RT.Element) {
    console.error("RT.Element not defined - was the state_manager run?");
    return;
  }

  RT.task_add('element' , function() {
    const debug = window.RT.Debug || { log: function(){} };
    if (debug.log) debug.log('theme_selector', 'Building theme selectors');

    document.querySelectorAll('rt·theme-selector').forEach((el) => {
      
      // This holds the display name, e.g., "Inverse Wheat"
      const active_theme_name = window.RT.theme('read', 'meta', 'name'); 
      const available_theme_keys = Object.keys(window.RT.theme_library || {});
      
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '10px';
      container.style.right = '10px';
      container.style.zIndex = '1000';
      container.style.background = '#222';
      container.style.padding = '10px';
      container.style.border = '1px solid #555';
      container.style.color = 'white';
      container.style.fontFamily = 'sans-serif';

      /* A widget, not part of the document.

         It overlaps the text once the window is narrow enough to fit the page,
         and it has nothing left to say once a theme has been chosen. So it can
         be dismissed. Nothing is persisted: a reload brings it back, which is
         the behaviour wanted for a control that is occasionally needed and
         usually not. */
      let html_content = `
        <div style="display:flex; align-items:baseline; gap:0.75rem;">
          <b style="flex:1">Theme selection</b>
          <span class="RT·theme-dismiss"
                title="Dismiss until reload"
                style="cursor:pointer; opacity:0.6; font-size:1.1em; line-height:1;"
                >&times;</span>
        </div>`;
      
      if (available_theme_keys.length === 0) {
        html_content += `<small>No themes found in library.</small>`;
      } else {
        available_theme_keys.forEach(theme_key => {
          // Extract the display name from the library, fallback to key if missing
          const theme_def = window.RT.theme_library[theme_key];
          const display_name = (theme_def.meta && theme_def.meta.name) ? theme_def.meta.name : theme_key;
          
          // Compare display name to display name
          const is_checked = active_theme_name === display_name ? 'checked' : '';
          
          // Store the registry key in the value, but show the display name to the user
          html_content += `
            <label>
              <input type="radio" name="RT·theme" value="${theme_key}" ${is_checked}> ${display_name}
            </label><br>
          `;
        });
      }

      container.innerHTML = html_content;

      container.addEventListener('change', (e) => {
        if(e.target.name === 'RT·theme') {
          // Saves 'inverse_wheat' to local storage
          localStorage.setItem('RT-Manuscript·theme_preference', e.target.value);
          location.reload(); 
        }
      });

      const dismiss = container.querySelector('.RT·theme-dismiss');
      if(dismiss){
        dismiss.addEventListener('click' ,function(){ container.remove(); });
        dismiss.addEventListener('mouseenter' ,function(){ dismiss.style.opacity = '1'; });
        dismiss.addEventListener('mouseleave' ,function(){ dismiss.style.opacity = '0.6'; });
      }

      el.replaceWith(container);
    });
  });

})();
