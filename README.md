# RT-style-JS_public

A JavaScript based layout, themes, and elements semantic HTML documents. Used for documents on RT projects.

## To build the library

This project is based on RT's **Harmony** project skeleton. Hence there are role directroies. After clocing the repo, go to the top of the project and type:

```bash
. setup developer
make
./developer/tool/release write
```

The resulting JavaScript library will be located in the `consumer/release/RT` 

## To use the library

Here is an example document using the library.


```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Example Document</title>
    
    <script>
      window.RT_REPO_ROOT = "../../";
      document.write('<script src="' + window.RT_REPO_ROOT + 'shared/style_directory_dict.js"></script>');
      document.write('<script src="' + window.RT_REPO_ROOT + 'shared/third_party/RT-style-JS_public/consumer/release/RT/core/loader.js"></script>');
      document.write('<script src="' + window.RT_REPO_ROOT + 'shared/third_party/RT-style-JS_public/consumer/release/RT/core/body_visibility_hidden.js"></script>');
    </script>

    <script>
      window.StyleRT.include('RT/theme');
      window.StyleRT.include('RT/layout/article_tech_ref');
    </script>
  </head>
  <body>
    <RT-article>
      <RT-title 
        title="Example Document" 
        author="Thomas Walker Lynch" 
        date="2026-03-06">
      </RT-title>

      <RT-TOC level="1"></RT-TOC>

      <h1>Introduction</h1>
      <p>
        This is a demonstration of the <RT-term>RT-style-JS_public</RT-term> engine in action.
      </p>
    </RT-article>
  </body>
</html>
```

## Semantic Elements

The engine targets custom HTML tags to apply formatting and behavior.

* `<RT-article>` : The primary container for standard documentation.
* `<RT-memo>` : The container for strict formal printed layouts.
* `<RT-title>` : Generates a standardized document header. Accepts `title`, `author`, and `date` attributes.
* `<RT-TOC>` : Automatically generates a Table of Contents. Uses the `level` attribute to target specific heading depths.
* `<RT-term>` / `<RT-neologism>` : Italicizes the first occurrence of a specific term and generates an anchor ID for indexing.
* `<RT-code>` : Code block formatting with auto-dedentation and syntax highlighting hooks.
* `<RT-math>` : Integration hooks for MathJax rendering.

## Code Formatting Standard

This project adheres to the **RT Code Format** for all JavaScript source files:

1. **Indentation:** Strictly 2 spaces. Never use tabs.
2. **Naming Conventions:** PascalCase for Modules/Classes; snake_case for variables and functions. Semantic suffixes are utilized (e.g., `TOC_seq`, `term_norm_s`).
3. **Vertical Commas:** Multi-line arrays, arguments, or structures place the comma at the start of the new line, aligned with the item.
4. **Enclosure Spacing:** Single-level enclosures require zero padding (`if(condition){`). Multi-level enclosures require one space of padding on the outermost enclosure only (`if( f(x) ){`).
5. **Braces:** No space before an opening brace.
