# RT-style

A JavaScript based layout, themes, and semantic elements for HTML documents. Used for documents on RT projects.

## To build the library

This project is based on RT's **Harmony** project skeleton. Hence there are role directories. After cloning the repo, go to the top of the project and type:

```bash
. setup developer
make
release write
```

The resulting JavaScript library will be located in `consumer/release/RT`.

## To use the library

Using the library requires creating two files, and then including one of them in the document.

One file is a js dictionary that maps names to style directory paths. The other does some setup and loads the dictionary.

### 1. The Style Dictionary

First, create a `style_directory_dict.js` file at a central location in the project. We will refer to this location as `<path_0>`. This dictionary tells the inclusion engine where the named style directories are located. Suppose that a style directory is located at `<path_1>`, the dictionary will appear as:

```javascript
window.StyleRT_namespaces = {
  "RT": window.RT_REPO_ROOT + "<path_1>/consumer/release/RT"
};
```

In the Harmony skeleton, there is a good example of a style dictionary located at `shared/style_directory_dict.js`. The style dictionary in this project is probably not a good example, because, for practical reasons, it points back into the developer's code.

### 2. The Document Setup Script

Next, create a `setup.js` script in the same directory with the HTML document. In our projects, this is typically a general document directory that can have many documents. This `setup.js` script sets the relative path back to the project root, loads the `style_directory_dict.js` file, and pulls in the core js code needed for all documents.

Here is an example `setup.js`. Find other examples in the document directories in this project and other RT projects, such as the Harmony project.

```javascript
window.RT_REPO_ROOT = "<relative_path_to_root>";
document.write('<script src="' + window.RT_REPO_ROOT + '<path_0>/style_directory_dict.js"></script>');
document.write('<script src="' + window.RT_REPO_ROOT + '<path_1>/consumer/release/RT/core/loader.js"></script>');
document.write('<script src="' + window.RT_REPO_ROOT + '<path_1>/consumer/release/RT/core/body_visibility_hidden.js"></script>');
```

### 3. The HTML Document

Typically the `style_directory_dict.js` and `setup.js` files are created by an administrator in advance. The same person who creates the `document` directory that the documents live in.

With the bootstrap script in place alongside the HTML file, the document authoring using the style library requires only that `setup.js` is included, as shown in the example code below.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Example Document</title>
    
    <script src="setup.js"></script>

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
        This is a demonstration of the <RT-term>RT-style</RT-term> engine in action.
      </p>
    </RT-article>
  </body>
</html>
```

### Using Harmony Conventions

If the project utilizes the **Harmony** skeleton, these paths map directly to standard locations:

* `<path_0>` is `shared/`.
* `<path_1>` is `shared/third_party/RT-style`.
* The `setup.js` script is placed in the role-specific document folder (e.g., `administrator/document/setup.js`).
* `<relative_path_to_root>` is `../../` (stepping up out of `document/` and `administrator/` back to the root).

Hence, when starting with the Harmony skeleton the `style_directory_dict.js` file will already exist in the `shared` directory, and existing `document` directories will already have a `setup.js` file.

## Semantic Elements

The engine targets custom HTML tags to apply formatting and behavior.

* `<RT-article>` : The primary container for standard documentation.
* `<RT-title>` : Generates a standardized document header. Accepts `title`, `author`, and `date` attributes.
* `<RT-TOC>` : Automatically generates a Table of Contents. Uses the `level` attribute to target specific heading depths.
* `<RT-term>` / `<RT-neologism>` : Italicizes the first occurrence of a specific term and generates an anchor ID for indexing.
* `<RT-code>` : Code block formatting with auto-dedentation and syntax highlighting hooks.
* `<RT-math>` : Integration hooks for MathJax rendering.

## Developer information

This project follows the **RT Code Format** convention for all JavaScript source files. See the documents in the `developer/document` directory for more information.
