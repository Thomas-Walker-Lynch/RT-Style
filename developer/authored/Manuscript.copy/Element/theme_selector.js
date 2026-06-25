window.RT = window.RT || {};

window.RT.theme_selector = function(){
  document.querySelectorAll('rt·theme-selector').forEach( (el) => {
    let current_theme = localStorage.getItem('RT_theme_preference');
    if(!current_theme){
      current_theme = 'dark_gold';
    }
    
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

    container.innerHTML = `
      <b>Theme Selection</b><br>
      <label>
        <input type="radio" name="RT·theme" value="dark_gold" ${current_theme === 'dark_gold' ? 'checked' : ''}> Dark Gold
      </label><br>
      <label>
        <input type="radio" name="RT·theme" value="light_gold" ${current_theme === 'light_gold' ? 'checked' : ''}> Light Gold
      </label>
    `;

    container.addEventListener( 'change' ,(e) => {
      if(e.target.name === 'RT·theme') {
        localStorage.setItem('RT_theme_preference' ,e.target.value);
        location.reload();
      }
    });

    el.replaceWith(container);
  });
};
