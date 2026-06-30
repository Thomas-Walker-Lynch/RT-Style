/*
  <head>
    <script>
      window.RT.load('Layout/memo_state_dept');
    </script>
  </head>
  <body>
    <RT·memo>
       </RT·memo>
  </body>
*/

(function(){

   if (!window.RT) {
    console.error("RT not defined - was RT-Manuscript_make run?");
    return;
  }

  // 1. Declare Dependencies
  RT.load('Core/utility');
  RT.load('Element/title');
  RT.load('Element/term');
  RT.load('Element/TOC');
  RT.load('Core/body_visibility_visible');

  // 2. The Typography Layout
  RT.memo_state_dept = function(){
    const body = document.body;
    const html = document.documentElement;
    
    // Force strict print colors regardless of user system settings
    html.style.backgroundColor = "white";
    body.style.backgroundColor = "white";
    body.style.color = "black";

    // Target the new semantic tag
    const memo_seq = document.querySelectorAll("RT·memo");
    if(memo_seq.length === 0) return;

    for(let i = 0; i < memo_seq.length; i++){
      let style = memo_seq[i].style;
      style.display = "block";
      style.fontFamily = '"Times New Roman", Times, serif';
      style.fontSize = "12pt";
      style.lineHeight = "1.15";
      // 8.5 inch standard width minus 1-inch margins on each side
      style.maxWidth = "6.5in"; 
      style.margin = "1in auto";
      style.padding = "0";
      style.textAlign = "left";
      style.color = "black";
    }
  };

  // 3. The Execution Sequence
  const run_semantics = function(){
    RT.memo_state_dept(); 
    
    if(RT.title) RT.title(); 
    if(RT.term) RT.term();
    if(RT.TOC) RT.TOC();

    run_layout();
  };

  const run_layout = function(){
    if(RT.body_visibility_visible) RT.body_visibility_visible();
  };

  // 4. Bind to DOM Ready
  document.addEventListener('DOMContentLoaded' ,run_semantics);

})();
