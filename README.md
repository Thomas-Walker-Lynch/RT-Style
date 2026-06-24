# RT-Style

RT-Style is a client-side, JavaScript-driven publishing framework designed for Reasoning Technology projects. It transforms raw HTML into high-readability technical documentation.

Instead of wrestling with complex CSS classes or static site generators, authors write structural HTML using custom semantic tags. The RT-Style engine intercepts the DOM at load time to handle complex layout tasks, dynamic pagination, and theme injection.

## Capabilities

By linking a document to the RT-Style engine, authors can accomplish the following natively in the browser:

* **Semantic Abstraction:** Separate structure from presentation using tags like `<RT-article>`, `<RT-title>`, and `<RT-constraint>`.
* **Dynamic Typography:** Automatically format mathematical equations (`<RT-math>`), code blocks (`<RT-code>`), and technical symbols without manual styling.
* **Smart Terminology:** Use `<RT-term>` and `<RT-neologism>` to automatically emphasize and anchor the first occurrence of technical jargon for future indexing.
* **Automated Navigation:** Generate document-aware Tables of Contents (`<RT-TOC>`) that scan heading depths dynamically.
* **Intelligent Pagination:** Break long documents into readable, soft-limited pages that respect paragraph and heading boundaries.
* **Hot-Swappable Themes:** Toggle between dark and light modes seamlessly.

## Initial Setup (Reading the Manuals)

This repository is built on the **Harmony** project skeleton. Because the layout engine is an artifact that must be built, a freshly cloned repository will display raw, unstyled HTML if you attempt to read the manuals immediately.

To view the project documentation locally, you must first compile and stage the semantic engine. Navigate to the root of the project and execute:

```bash
. setup developer
build Manuscript
promote write
