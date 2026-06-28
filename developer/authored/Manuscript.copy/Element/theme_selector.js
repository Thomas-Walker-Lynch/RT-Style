// Element/theme_selector.js

window.RT = window.RT || {};
window.RT.Element = window.RT.Element || [];

window.RT.Element.push(function build_theme_selector() {
  document.querySelectorAll('rt·theme-selector').forEach((el) => {
    
    const active_theme = window.RT.theme('read', 'meta', 'name');
    const available_themes = Object.keys(window.RT.theme_library || {});
    
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

    let html_content = `<b>Theme Selection</b><br>`;
    
    if (available_themes.length === 0) {
      html_content += `<small>No themes found in library.</small>`;
    } else {
      available_themes.forEach(theme_name => {
        const is_checked = active_theme === theme_name ? 'checked' : '';
        html_content += `
          <label>
            <input type="radio" name="RT·theme" value="${theme_name}" ${is_checked}> ${theme_name}
          </label><br>
        `;
      });
    }

    container.innerHTML = html_content;

    container.addEventListener('change', (e) => {
      if(e.target.name === 'RT·theme') {
        localStorage.setItem('RT-Style·theme_preference', e.target.value);
        // Reloading applies the new preference via theme_preference() in the <head>
        location.reload(); 
      }
    });

    el.replaceWith(container);
  });
});
