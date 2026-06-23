import os
import glob
import base64
import re
from weasyprint import HTML

# Find the image file
img_path = None
for search_dir in ['/mnt/data', '/tmp', '.']:
    for root, dirs, files in os.walk(search_dir):
        if 'money_circle.jpeg' in files:
            img_path = os.path.join(root, 'money_circle.jpeg')
            break
    if img_path:
        break

img_b64 = ""
if img_path:
    with open(img_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode('utf-8')

html_content = """
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>On Cybersecurity and Commonsense</title>
  </head>
  <body>
    </body>
</html>
"""

# String replacements (hyphens, 'may', 'just')
html_content = html_content.replace('—', '-')
html_content = re.sub(r'\bmay\b', 'can', html_content)
html_content = re.sub(r'\bMay\b', 'Can', html_content)
html_content = re.sub(r'\bjust\b', 'merely', html_content)
html_content = re.sub(r'\bJust\b', 'Merely', html_content)

# Title block replacement
title_match = re.search(r'<rt-title\s+title="(.*?)"\s+author="(.*?)"\s+date="(.*?)"\s+copyright="(.*?)"\s*>\s*</rt-title>', html_content, re.IGNORECASE | re.DOTALL)
if title_match:
    title, author, date, copyright_text = title_match.groups()
    if not copyright_text.startswith('©') and not copyright_text.startswith('&copy;'):
        copyright_text = f"&copy; {copyright_text}"
        
    title_html = f'''
    <div class="title-block">
        <h1>{title}</h1>
        <p class="meta-author">{author}</p>
        <p class="meta-date">{date}</p>
        <p class="meta-copyright">{copyright_text}</p>
    </div>
    '''
    html_content = html_content[:title_match.start()] + title_html + html_content[title_match.end():]

# TOC replacement
headings = re.findall(r'<h([12])\s*(id="(.*?)")?>(.*?)</h\1>', html_content, re.IGNORECASE)
toc_html = '<div class="toc-block"><h2>Table of Contents</h2><ul>'
for idx, (level, _, id_val, text) in enumerate(headings):
    if not id_val:
        id_val = f"heading-{idx}"
        html_content = re.sub(f'<h{level}>{text}</h{level}>', f'<h{level} id="{id_val}">{text}</h{level}>', html_content, count=1)
    toc_html += f'<li class="toc-h{level}"><a href="#{id_val}">{text}</a></li>'
toc_html += '</ul></div>'

html_content = re.sub(r'<RT-TOC[^>]*></RT-TOC>', toc_html, html_content, flags=re.IGNORECASE)

# Image replacement
if img_b64:
    html_content = re.sub(r'src="money_circle\.jpeg"', f'src="data:image/jpeg;base64,{img_b64}" class="content-image"', html_content)

# Custom tags
html_content = re.sub(r'<RT-article>', '<div class="rt-article">', html_content, flags=re.IGNORECASE)
html_content = re.sub(r'</RT-article>', '</div>', html_content, flags=re.IGNORECASE)
html_content = re.sub(r'<RT-term>', '<span class="rt-term">', html_content, flags=re.IGNORECASE)
html_content = re.sub(r'</RT-term>', '</span>', html_content, flags=re.IGNORECASE)
html_content = re.sub(r'<RT-term-em>', '<span class="rt-term-em">', html_content, flags=re.IGNORECASE)
html_content = re.sub(r'</RT-term-em>', '</span>', html_content, flags=re.IGNORECASE)
html_content = re.sub(r'<RT-neologism>', '<span class="rt-neologism">', html_content, flags=re.IGNORECASE)
html_content = re.sub(r'</RT-neologism>', '</span>', html_content, flags=re.IGNORECASE)

def replace_rt_math(m):
    content = m.group(1)
    if '\n' in content:
        return f'<div class="math-block math">{content}</div>'
    return f'<span class="math-inline math">{content}</span>'

def replace_rt_code(m):
    content = m.group(1)
    if '\n' in content:
        return f'<pre class="rt-code-block">{content}</pre>'
    return f'<code class="rt-code-inline">{content}</code>'

html_content = re.sub(r'<RT-math>(.*?)</RT-math>', replace_rt_math, html_content, flags=re.IGNORECASE | re.DOTALL)
html_content = re.sub(r'<RT-code>(.*?)</RT-code>', replace_rt_code, html_content, flags=re.IGNORECASE | re.DOTALL)

css_styles = """
    @page {
        size: letter;
        margin: 25mm 20mm;
        background-color: #FAFAFA;
        @bottom-center {
            content: counter(page);
            font-family: 'Georgia', serif;
            font-size: 10pt;
            color: #555;
        }
    }
    body {
        margin: 0;
        padding: 0;
        font-family: 'Georgia', serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #2c3e50;
        background-color: #FAFAFA;
    }
    *, *::before, *::after { box-sizing: border-box; }
    
    h1, h2, h3, h4 {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #1A365D;
        page-break-after: avoid;
    }
    h1 { font-size: 20pt; margin-top: 1.5em; margin-bottom: 0.5em; border-bottom: 2px solid #E2E8F0; padding-bottom: 0.2em; }
    h2 { font-size: 16pt; margin-top: 1.5em; margin-bottom: 0.5em; }
    p { margin-bottom: 1em; text-align: justify; }
    ul, ol { margin-bottom: 1em; padding-left: 2em; }
    li { margin-bottom: 0.5em; }
    
    .title-block { text-align: center; margin-bottom: 4em; padding: 2em 0; border-bottom: 3px solid #1A365D; }
    .title-block h1 { font-size: 26pt; border: none; margin-top: 0; margin-bottom: 0.5em; color: #0F2040; }
    .title-block .meta-author { font-size: 14pt; font-weight: bold; margin: 0.2em 0; }
    .title-block .meta-date { font-size: 12pt; color: #555; font-style: italic; margin: 0.2em 0; }
    .title-block .meta-copyright { font-size: 10pt; color: #777; margin-top: 1em; }
    
    .toc-block { background-color: #F0F4F8; padding: 20px; border-radius: 5px; margin-bottom: 3em; page-break-after: always; }
    .toc-block h2 { margin-top: 0; border: none; }
    .toc-block ul { list-style-type: none; padding-left: 0; }
    .toc-h1 { font-weight: bold; margin-top: 0.8em; }
    .toc-h2 { padding-left: 1.5em; font-size: 0.95em; }
    .toc-block a { text-decoration: none; color: #2c3e50; }
    
    .rt-term { font-weight: bold; color: #2980B9; }
    .rt-term-em { font-weight: bold; font-style: italic; color: #2980B9; }
    .rt-neologism { font-variant: small-caps; font-weight: bold; color: #C0392B; }
    .rt-code-inline { font-family: 'Courier New', Courier, monospace; background-color: #EAECEE; padding: 2px 4px; border-radius: 3px; font-size: 0.9em; }
    .rt-code-block { font-family: 'Courier New', Courier, monospace; background-color: #F4F6F7; padding: 15px; border-left: 4px solid #7F8C8D; border-radius: 3px; font-size: 0.9em; overflow-x: auto; white-space: pre-wrap; }
    
    .math { font-family: 'Times New Roman', serif; font-style: italic; font-weight: bold; color: #2C3E50; }
    .math-block { text-align: center; margin: 1.5em 0; font-size: 1.2em; background-color: #F9EBEA; padding: 10px; border-radius: 5px; }
    .math-inline { font-size: 1.05em; }
    
    table { width: 100%; border-collapse: collapse; margin: 2em 0; }
    th, td { padding: 10px; text-align: left; vertical-align: top; }
    th { background-color: #1A365D; color: white; font-weight: bold; }
    tr { border-bottom: 1px solid #ddd; }
    hr { border: 0; border-top: 1px solid #eee; }
    
    .content-image { display: block; max-width: 90%; margin: 2em auto; border: 1px solid #ccc; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
"""

final_html = f"<!DOCTYPE html><html><head><meta charset='UTF-8'><style>{css_styles}</style></head><body>{html_content}</body></html>"
HTML(string=final_html).write_pdf("White_Paper_Cybersecurity_Legislation.pdf")
print("Success")
