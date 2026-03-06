/*
  Targets the root element to ensure total blackout during load.
*/
function body_visibility_hidden(){
  const gate = document.createElement('style');
  gate.id = 'rt-visibility-gate';
  gate.textContent = 'html{visibility:hidden !important; background:black !important;}';
  document.head.appendChild(gate);
}

window.StyleRT = window.StyleRT || {};
window.StyleRT.body_visibility_hidden = body_visibility_hidden;
