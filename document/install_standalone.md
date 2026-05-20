The `Harmony` skeletong is setup to use `RT-style-JS_public`, it only requires that the `RT-style-JS_public` be installed to the side, at the same directory level, as the `Harmony` project.

`RT-style-JS_public` can be used with a standalone html document

1. cd to the directory with the standalone document

2. install RT-style-JS_public
   1.1 git clone https://github.com/Thomas-Walker-Lynch/RT-style-JS_public.git
   1.2 enter RT-style-JS:
        > bash
        > . setup developer
        > make
        > release write
        > exit

3. make these files:

   > cat_named setup.js dictionary_style-directory.js 
   --------------------------------------------------------------------------------
   setup.js 2026-05-20T06:47:33Z

   window.RT_REPO_ROOT = "../";
   document.write('<script src="' + 'dictionary_style-directory.js"></script>');
   document.write('<script src="' + 'RT-style-JS_public/consumer/release/RT/core/loader.js"></script>');
   document.write('<script src="' + 'RT-style-JS_public/consumer/release/RT/core/body_visibility_hidden.js"></script>');


   --------------------------------------------------------------------------------
   dictionary_style-directory.js 2026-05-20T06:49:14Z

   window.StyleRT_namespaces = {
     "RT": "RT-style-JS_public/consumer/release/RT"
     ,"Project": "style"
   };


4. Give the html file this structure:

    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>On Cybersecurity and Commonsense</title>
        <script src="setup.js"></script>
        <script>
          window.StyleRT.include('RT/theme');
          window.StyleRT.include('RT/layout/article_tech_ref');
        </script>
      </head>
      <body>
        <RT-article>

          <rt-title 
            title="RTL DARPA proposal" 
            author="Thomas Walker Lynch" date="2026-05-16" 
            copyright="2026 Thomas Walker Lynch - All rights reserved."
            >
          </rt-title>

          <RT-TOC level="1-2"></RT-TOC>

          <!-- contents here, note that text not wrapped in an element is ignored -->
          <p>hello</p>


        </RT-article>
      </body>
    </html>
