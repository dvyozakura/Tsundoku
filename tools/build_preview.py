# 1ファイルで遊べるプレビューを作る: python3 tools/build_preview.py <出力先>
import base64, re, sys
ORDER = ['data', 'physics', 'game', 'art', 'audio', 'ui']
out = []
for m in ORDER:
    src = open(f'js/{m}.js', encoding='utf8').read()
    imports = re.findall(r'import\s*\{([^}]*)\}\s*from\s*[\'"][^\'"]+[\'"];', src)
    names = [n.strip() for i in imports for n in i.split(',') if n.strip()]
    src = re.sub(r'import\s*\{[^}]*\}\s*from\s*[\'"][^\'"]+[\'"];\n', '', src)
    src = re.sub(r'import \* as (\w+) from [\'"][^\'"]+[\'"];', r'const \1 = M;', src)
    exp = re.findall(r'^export (?:const|function|class) (\w+)', src, re.M)
    src = re.sub(r'^export ', '', src, flags=re.M)
    head = f"const {{{', '.join(names)}}} = M;\n" if names else ''
    out.append(f"(() => {{\n{head}{src}\nObject.assign(M, {{{', '.join(exp)}}});\n}})();")
css = open('css/style.css', encoding='utf8').read()
def font(m):
    d = base64.b64encode(open('fonts/' + m.group(1), 'rb').read()).decode()
    return f'url("data:font/woff;base64,{d}")'
css = re.sub(r'url\("\.\./fonts/([^"]+)"\)', font, css)
html = open('index.html', encoding='utf8').read()
body = re.search(r'<body>(.*?)<script type="module"', html, re.S).group(1)
page = f'''<title>積読合格</title>
<style>{css}
#app {{ height: 100%; }}</style>
{body}
<script>window.__TSUNDOKU_PREVIEW__ = true; const M = {{}};
{chr(10).join(out)}
</script>
'''
open(sys.argv[1], 'w', encoding='utf8').write(page)
print(len(page) // 1024, 'KB')
