class ThemeSelector extends HTMLElement{
  connectedCallback(){
    let current_theme = localStorage.getItem('RT_theme_preference');
    if(!current_theme){
      current_theme = 'dark_gold';
    }
    
    this.innerHTML = `
      <div style="position:fixed; top:10px; right:10px; z-index:1000; background:#222; padding:10px; border:1px solid #555; color: white; font-family: sans-serif;">
        <b>Theme Selection</b><br>
        <label>
          <input type="radio" name="rt-theme" value="dark_gold" ${current_theme === 'dark_gold' ? 'checked' : ''}> Dark Gold
        </label><br>
        <label>
          <input type="radio" name="rt-theme" value="light_gold" ${current_theme === 'light_gold' ? 'checked' : ''}> Light Gold
        </label>
      </div>
    `;

    this.addEventListener( 'change' ,(e) => {
      localStorage.setItem('RT_theme_preference' ,e.target.value);
      location.reload();
    } );
  }
}

customElements.define('rt-theme-selector' ,ThemeSelector);
