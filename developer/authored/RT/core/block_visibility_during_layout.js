// block_visibility_during_layout.js

// 1. Hide the document immediately upon execution in the <head>
document.documentElement.style.visibility = "hidden";

// 2. Define the restoration function
const restore_visibility = function() {
    document.documentElement.style.visibility = "";
    document.removeEventListener("RT_layout_complete", restore_visibility);
    window.removeEventListener("load", restore_visibility);
};

// 3. Listen for a specific completion signal from the layout engine
document.addEventListener("RT_layout_complete", restore_visibility);

// 4. Structural Safety Net: If the layout engine fails or is never loaded, 
//    restore visibility on the final window 'load' event so the page doesn't remain blank.
window.addEventListener("load", restore_visibility);

