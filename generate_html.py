import os
import json

md_path = r'c:\final_yearproject\FINAL_IEEE_PAPER.md'
html_path = r'c:\final_yearproject\IEEE_PAPER_RENDERED.html'

try:
    with open(md_path, 'r', encoding='utf-8') as f:
        markdown_content = f.read()

    # Safely pass markdown to JS using JSON
    safe_markdown = json.dumps(markdown_content)

    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>Enterprise AI Smart Support Desk - IEEE Paper</title>
    <!-- MathJax for rendering equations -->
    <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    
    <!-- Marked.js for markdown rendering -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    
    <style>
        body {{ 
            font-family: 'Times New Roman', Times, serif; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 40px; 
            line-height: 1.6; 
            background: #fdfdfd;
            color: #000;
        }}
        .paper-container {{
            background: white;
            padding: 50px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }}
        h1 {{ text-align: center; font-size: 24px; }}
        h2 {{ font-size: 20px; margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }}
        h3 {{ font-size: 16px; font-style: italic; }}
        p {{ text-align: justify; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; font-size: 14px; }}
        th, td {{ border: 1px solid #000; padding: 10px; text-align: left; }}
        th {{ background-color: #f2f2f2; font-weight: bold; }}
        .center {{ text-align: center; }}
        pre {{ background: #f8f8f8; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: monospace; font-size: 13px; }}
        .mermaid-container {{ text-align: center; margin: 20px 0; }}
        @media print {{
            body {{ background: white; padding: 0; }}
            .paper-container {{ box-shadow: none; padding: 0; }}
        }}
    </style>
</head>
<body>
    <div class="paper-container" id="content">Loading paper, equations, and diagrams... Please wait 5 seconds...</div>

    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({{ startOnLoad: false, theme: 'default' }});

        const markdownText = {safe_markdown};

        window.onload = async function() {{
            document.getElementById('content').innerHTML = marked.parse(markdownText);
            
            // Render Mermaid diagrams
            const blocks = document.querySelectorAll('code.language-mermaid');
            for (let i = 0; i < blocks.length; i++) {{
                const block = blocks[i];
                const code = block.textContent;
                try {{
                    const {{ svg }} = await mermaid.render('mermaid-' + i, code);
                    const div = document.createElement('div');
                    div.className = 'mermaid-container';
                    div.innerHTML = svg;
                    block.parentElement.replaceWith(div);
                }} catch (err) {{
                    console.error('Mermaid rendering failed', err);
                }}
            }}
            
            // Trigger MathJax rendering
            if (window.MathJax) {{
                MathJax.typesetPromise();
            }}
        }};
    </script>
</body>
</html>"""

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print("HTML File successfully generated!")
except Exception as e:
    print(f"Error: {{e}}")
