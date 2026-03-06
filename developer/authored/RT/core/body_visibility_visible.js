/*
  Restores visibility by removing the visibility gate.
*/
function body_visibility_visible(){
  const gate = document.getElementById('rt-visibility-gate');
  if (gate){
    gate.remove();
  }
  document.body.style.visibility = 'visible';
}

window.StyleRT = window.StyleRT || {};
window.StyleRT.body_visibility_visible = body_visibility_visible;
