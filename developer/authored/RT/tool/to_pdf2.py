import re
import os
import glob
from weasyprint import HTML

def process_rt_html(html_str, out_file):
    # Fix escaped dollar signs
    html_str = html_str.replace('\\$', '$')

    # Remove hardcoded page breaks that cause blank pages
    html_str = re.sub(r'<div\s+style=["\']page-break-[^>]*["\']>\s*</div>', '', html_str, flags=re.IGNORECASE)

    css = """
    <style>
    @page {
        size: A4;
        margin: 25mm 20mm;
        background-color: #faf9f6;
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 11pt;
        color: #2c3e50;
        line-height: 1.6;
        margin: 0;
        padding: 0;
        background-color: #faf9f6;
    }
    h1, h2, h3 {
        color: #1a252f;
        page-break-after: avoid;
        font-family: 'Georgia', serif;
    }
    h1 {
        font-size: 16pt;
        border-bottom: 2px solid #d4af37;
        padding-bottom: 5px;
        margin-top: 2em;
    }
    h2 {
        font-size: 14pt;
        margin-top: 1.5em;
        color: #2c3e50;
    }
    h3 {
        font-size: 12pt;
        margin-top: 1.2em;
        color: #34495e;
    }
    .rt-title-block {
        text-align: center;
        margin: -25mm -20mm 30px -20mm;
        padding: 35px 20mm;
        background-color: #1a252f;
        color: #ecf0f1;
    }
    .rt-title-block h1 {
        color: #d4af37;
        border: none;
        font-size: 20pt;
        margin: 0 0 15px 0;
        padding: 0;
    }
    .rt-meta {
        font-family: 'Georgia', serif;
        font-size: 11pt;
        color: #bdc3c7;
        font-style: italic;
    }
    .rt-copyright {
        font-size: 9pt;
        color: #95a5a6;
        margin-top: 10px;
    }
    .rt-term {
        border-bottom: 1px dashed #7f8c8d;
        font-style: italic;
        color: #2980b9;
    }
    .rt-term-plain {
        font-style: normal;
    }
    .rt-neologism {
        font-weight: bold;
        color: #c0392b;
    }
    .rt-neologism-plain {
        font-weight: normal;
    }
    .toc {
        background-color: #ffffff;
        border-left: 4px solid #d4af37;
        padding: 20px;
        margin: 25px 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        /* Ensure the TOC breaks naturally, without forcing an empty page */
    }
    .toc-title {
        font-family: 'Georgia', serif;
        font-size: 14pt;
        font-weight: bold;
        color: #1a252f;
        margin-bottom: 15px;
    }
    .toc ul {
        list-style: none;
        padding-left: 0;
        margin: 0;
    }
    .toc li {
        margin-bottom: 8px;
    }
    .toc-h1 { font-weight: bold; margin-top: 12px; }
    .toc-h2 { margin-left: 20px; font-size: 10pt; color: #34495e; }
    .toc-h3 { margin-left: 40px; font-size: 10pt; color: #7f8c8d; }
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 25px 0;
        background-color: #ffffff;
    }
    th, td {
        border: 1px solid #ecf0f1;
        padding: 12px;
        text-align: left;
    }
    th {
        background-color: #f4f6f7;
        color: #1a252f;
        font-weight: bold;
    }
    tr:nth-child(even) {
        background-color: #fafbfc;
    }
    ul, ol {
        margin: 15px 0;
        padding-left: 25px;
    }
    li {
        margin-bottom: 10px;
    }
    /* Let's remove this completely for this specific case to see if it lets the table and TOC share a page */
    /* .content-start {
        page-break-before: always;
    } */
    </style>
    """

    # Inject CSS
    html_str = html_str.replace("</head>", css + "</head>")
    
    # Process Title Block
    title_match = re.search(r'<RT-title\s+([^>]+)>(.*?)</RT-title>', html_str, re.DOTALL | re.IGNORECASE)
    if title_match:
        attrs = title_match.group(1)
        title = re.search(r'title="(.*?)"', attrs).group(1) if 'title="' in attrs else 'Document'
        author = re.search(r'author="(.*?)"', attrs).group(1) if 'author="' in attrs else ''
        date = re.search(r'date="(.*?)"', attrs).group(1) if 'date="' in attrs else ''
        copyright_txt = re.search(r'copyright="(.*?)"', attrs).group(1) if 'copyright="' in attrs else ''
        
        title_block = f'''
        <div class="rt-title-block">
            <h1>{title}</h1>
            <div class="rt-meta"><span class="author">{author}</span> | <span class="date">{date}</span></div>
            <div class="rt-copyright">{copyright_txt}</div>
        </div>
        '''
        html_str = html_str[:title_match.start()] + title_block + html_str[title_match.end():]
        
    # Process TOC
    toc_match = re.search(r'<RT-TOC\s+level="(.*?)"></RT-TOC>', html_str, re.IGNORECASE)
    if toc_match:
        level = toc_match.group(1)
        headings = []
        if '-' in level:
            headings = re.findall(r'<h([123])>(.*?)</h[123]>', html_str, re.IGNORECASE)
        else:
            headings = re.findall(rf'<h({level})>(.*?)</h{level}>', html_str, re.IGNORECASE)
            
        toc_html = '<div class="toc"><div class="toc-title">Table of Contents</div><ul>'
        for lvl, text in headings:
            # exclude COVER SHEET from TOC
            if "COVER SHEET" in text:
                continue
            toc_html += f'<li class="toc-h{lvl}">{text}</li>'
        toc_html += '</ul></div>'
        
        html_str = html_str[:toc_match.start()] + toc_html + html_str[toc_match.end():]

    # Term Replacement (First occurrence)
    seen_terms = set()
    def term_replace(match):
        text = match.group(1)
        l_text = text.lower()
        if l_text not in seen_terms:
            seen_terms.add(l_text)
            return f'<span class="rt-term">{text}</span>'
        else:
            return f'<span class="rt-term-plain">{text}</span>'
            
    html_str = re.sub(r'<RT-term>(.*?)</RT-term>', term_replace, html_str)
    
    # Neologism Replacement (First occurrence)
    seen_neos = set()
    def neo_replace(match):
        text = match.group(1)
        l_text = text.lower()
        if l_text not in seen_neos:
            seen_neos.add(l_text)
            return f'<span class="rt-neologism">{text}</span>'
        else:
            return f'<span class="rt-neologism-plain">{text}</span>'
            
    html_str = re.sub(r'<RT-neologism>(.*?)</RT-neologism>', neo_replace, html_str)

    HTML(string=html_str).write_pdf(out_file)

# Locate the uploaded file
uploaded_files = glob.glob('/mnt/data/user_uploads/*abstract.html')
if not uploaded_files:
    uploaded_files = glob.glob('/mnt/data/uploads/*abstract.html')
if not uploaded_files:
    # Look for it anywhere under /mnt/data
    for root, dirs, files in os.walk('/mnt/data'):
        for file in files:
            if file == 'abstract.html':
                uploaded_files.append(os.path.join(root, file))

if uploaded_files:
    filepath = uploaded_files[0]
    with open(filepath, 'r', encoding='utf-8') as f:
        html_content = f.read()
    process_rt_html(html_content, 'abstract.pdf')
    print("PDF successfully generated.")
else:
    print("Could not find abstract.html in the data directory.")

Code output
Traceback (most recent call last):
  File "<xbox-string>", line 1, in <module>
    import bs4
ModuleNotFoundError: No module named 'bs4'

Python
import re
import os
import glob
from weasyprint import HTML

def process_rt_html(html_str, out_file):
    html_str = html_str.replace('\\$', '$')
    html_str = re.sub(r'<div\s+style=["\']page-break-[^>]*["\']>\s*</div>', '', html_str, flags=re.IGNORECASE)

    css = """
    <style>
    @page {
        size: A4;
        margin: 25mm 20mm;
        background-color: #faf9f6;
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 11pt;
        color: #2c3e50;
        line-height: 1.6;
        margin: 0;
        padding: 0;
        background-color: #faf9f6;
    }
    h1, h2, h3 {
        color: #1a252f;
        page-break-after: avoid;
        font-family: 'Georgia', serif;
    }
    h1 {
        font-size: 16pt;
        border-bottom: 2px solid #d4af37;
        padding-bottom: 5px;
        margin-top: 2em;
    }
    h2 {
        font-size: 14pt;
        margin-top: 1.5em;
        color: #2c3e50;
    }
    h3 {
        font-size: 12pt;
        margin-top: 1.2em;
        color: #34495e;
    }
    .rt-title-block {
        text-align: center;
        margin: -25mm -20mm 30px -20mm;
        padding: 35px 20mm;
        background-color: #1a252f;
        color: #ecf0f1;
    }
    .rt-title-block h1 {
        color: #d4af37;
        border: none;
        font-size: 20pt;
        margin: 0 0 15px 0;
        padding: 0;
    }
    .rt-meta {
        font-family: 'Georgia', serif;
        font-size: 11pt;
        color: #bdc3c7;
        font-style: italic;
    }
    .rt-copyright {
        font-size: 9pt;
        color: #95a5a6;
        margin-top: 10px;
    }
    .rt-term {
        border-bottom: 1px dashed #7f8c8d;
        font-style: italic;
        color: #2980b9;
    }
    .rt-term-plain {
        font-style: normal;
    }
    .rt-neologism {
        font-weight: bold;
        color: #c0392b;
    }
    .rt-neologism-plain {
        font-weight: normal;
    }
    .toc {
        background-color: #ffffff;
        border-left: 4px solid #d4af37;
        padding: 20px;
        margin: 25px 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        /* Ensure no forced break before TOC */
        page-break-before: auto;
    }
    .toc-title {
        font-family: 'Georgia', serif;
        font-size: 14pt;
        font-weight: bold;
        color: #1a252f;
        margin-bottom: 15px;
    }
    .toc ul {
        list-style: none;
        padding-left: 0;
        margin: 0;
    }
    .toc li {
        margin-bottom: 8px;
    }
    .toc-h1 { font-weight: bold; margin-top: 12px; }
    .toc-h2 { margin-left: 20px; font-size: 10pt; color: #34495e; }
    .toc-h3 { margin-left: 40px; font-size: 10pt; color: #7f8c8d; }
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 25px 0;
        background-color: #ffffff;
    }
    th, td {
        border: 1px solid #ecf0f1;
        padding: 12px;
        text-align: left;
    }
    th {
        background-color: #f4f6f7;
        color: #1a252f;
        font-weight: bold;
    }
    tr:nth-child(even) {
        background-color: #fafbfc;
    }
    ul, ol {
        margin: 15px 0;
        padding-left: 25px;
    }
    li {
        margin-bottom: 10px;
    }
    .content-start {
        page-break-before: always;
    }
    </style>
    """

    html_str = html_str.replace("</head>", css + "</head>")
    
    title_match = re.search(r'<RT-title\s+([^>]+)>(.*?)</RT-title>', html_str, re.DOTALL | re.IGNORECASE)
    if title_match:
        attrs = title_match.group(1)
        title = re.search(r'title="(.*?)"', attrs).group(1) if 'title="' in attrs else 'Document'
        author = re.search(r'author="(.*?)"', attrs).group(1) if 'author="' in attrs else ''
        date = re.search(r'date="(.*?)"', attrs).group(1) if 'date="' in attrs else ''
        copyright_txt = re.search(r'copyright="(.*?)"', attrs).group(1) if 'copyright="' in attrs else ''
        
        title_block = f'''
        <div class="rt-title-block">
            <h1>{title}</h1>
            <div class="rt-meta"><span class="author">{author}</span> | <span class="date">{date}</span></div>
            <div class="rt-copyright">{copyright_txt}</div>
        </div>
        '''
        html_str = html_str[:title_match.start()] + title_block + html_str[title_match.end():]
        
    toc_match = re.search(r'<RT-TOC\s+level="(.*?)"></RT-TOC>', html_str, re.IGNORECASE)
    if toc_match:
        level = toc_match.group(1)
        headings = []
        if '-' in level:
            headings = re.findall(r'<h([123])>(.*?)</h[123]>', html_str, re.IGNORECASE)
        else:
            headings = re.findall(rf'<h({level})>(.*?)</h{level}>', html_str, re.IGNORECASE)
            
        toc_html = '<div class="toc"><div class="toc-title">Table of Contents</div><ul>'
        for lvl, text in headings:
            if "COVER SHEET" in text:
                continue
            toc_html += f'<li class="toc-h{lvl}">{text}</li>'
        toc_html += '</ul></div>'
        
        # Add page break AFTER the TOC instead of before it
        toc_html += '<div class="content-start"></div>'
        
        html_str = html_str[:toc_match.start()] + toc_html + html_str[toc_match.end():]

    seen_terms = set()
    def term_replace(match):
        text = match.group(1)
        l_text = text.lower()
        if l_text not in seen_terms:
            seen_terms.add(l_text)
            return f'<span class="rt-term">{text}</span>'
        else:
            return f'<span class="rt-term-plain">{text}</span>'
            
    html_str = re.sub(r'<RT-term>(.*?)</RT-term>', term_replace, html_str)
    
    seen_neos = set()
    def neo_replace(match):
        text = match.group(1)
        l_text = text.lower()
        if l_text not in seen_neos:
            seen_neos.add(l_text)
            return f'<span class="rt-neologism">{text}</span>'
        else:
            return f'<span class="rt-neologism-plain">{text}</span>'
            
    html_str = re.sub(r'<RT-neologism>(.*?)</RT-neologism>', neo_replace, html_str)

    HTML(string=html_str).write_pdf(out_file)

uploaded_files = glob.glob('/mnt/data/user_uploads/*abstract.html')
if not uploaded_files:
    uploaded_files = glob.glob('/mnt/data/uploads/*abstract.html')
if not uploaded_files:
    for root, dirs, files in os.walk('/mnt/data'):
        for file in files:
            if file == 'abstract.html':
                uploaded_files.append(os.path.join(root, file))

if uploaded_files:
    filepath = uploaded_files[0]
    with open(filepath, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # One last aggressive check to ensure we absolutely strip ANY style="page-break..." strings
    # in case the earlier regex missed a specific formatting
    html_content = re.sub(r'style="[^"]*page-break-after:\s*always;?[^"]*"', '', html_content, flags=re.IGNORECASE)

    process_rt_html(html_content, 'abstract_no_gap.pdf')
    print("PDF successfully generated.")
else:
    print("Could not find abstract.html in the data directory.")
