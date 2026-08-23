import re, sys, html

USAGE = """使い方:
  python3 scripts/report_to_html.py <入力.md> <出力.html> docs/_report_template.html [meta.json]

meta.json（任意）:
  {"eyebrow": "...", "date": "2026-08-23", "title": "...", "dek": "...",
   "tiles": [{"kind": "ok|ng", "v": "77", "unit": "/77", "label": "1行目<br>2行目"}]}
"""
if len(sys.argv) < 4:
    sys.exit(USAGE)

md_path, out_path, prelude_path = sys.argv[1], sys.argv[2], sys.argv[3]
for f in (md_path, prelude_path):
    if not __import__("os").path.exists(f):
        sys.exit(f"ファイルが見つかりません: {f}\n\n" + USAGE)
src = open(md_path, encoding="utf-8").read()
prelude = open(prelude_path, encoding="utf-8").read()

HR = '<hr style="border:0;border-top:1px solid var(--rule);margin:34px 0">'

def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'`([^`]+)`', lambda m: '<code>'+m.group(1)+'</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    return t

lines = src.split("\n")
out = []
i = 0
# 先頭の H1 とメタはマストヘッドで扱うのでスキップ
while i < len(lines) and not lines[i].startswith("**対象**"):
    i += 1

def flush_table(block):
    rows = [r for r in block if r.strip().startswith("|")]
    cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    head, align, body = cells[0], cells[1], cells[2:]
    h = "".join(f"<th>{inline(c)}</th>" for c in head)
    b = ""
    for r in body:
        tds = ""
        for c in r:
            cl = ""
            if c.strip() in ("✅",): cl = ' class="good"'
            elif c.strip() in ("❌",): cl = ' class="bad"'
            elif c.strip() in ("⚠️","△"): cl = ' style="color:var(--p1);font-weight:700"'
            tds += f"<td{cl}>{inline(c)}</td>"
        b += f"<tr>{tds}</tr>"
    return f'<div class="tblwrap"><table class="cmp"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>'

buf_p = []
def flush_p():
    global buf_p
    if buf_p:
        out.append("<p>" + inline(" ".join(buf_p)) + "</p>")
        buf_p = []

while i < len(lines):
    ln = lines[i]
    s = ln.strip()
    if s.startswith("```"):
        flush_p(); i += 1; code = []
        while i < len(lines) and not lines[i].strip().startswith("```"):
            code.append(html.escape(lines[i])); i += 1
        i += 1
        out.append('<div class="evidence">' + "\n".join(code) + "</div>")
        continue
    if s.startswith("|"):
        flush_p(); blk = []
        while i < len(lines) and lines[i].strip().startswith("|"):
            blk.append(lines[i]); i += 1
        out.append(flush_table(blk)); continue
    if s == "---":
        flush_p(); out.append(HR); i += 1; continue
    if s.startswith("### "):
        flush_p(); out.append(f'<h3 style="margin-top:26px">{inline(s[4:])}</h3>'); i += 1; continue
    if s.startswith("## "):
        flush_p(); t = s[3:]
        num = "§"
        m = re.match(r'^(✅|❌|⚠️|📌|🆕|🔧)\s*', t)
        if m: num = m.group(1)
        out.append(f'<div class="sec-head"><span class="sec-num">{num}</span><h2>{inline(t)}</h2></div>')
        i += 1; continue
    if s.startswith("> "):
        flush_p(); q = []
        while i < len(lines) and lines[i].strip().startswith(">"):
            q.append(lines[i].strip().lstrip(">").strip()); i += 1
        paras = "".join(f"<p>{inline(x)}</p>" for x in " \n".join(q).split("\n") if x.strip())
        out.append(f'<div class="note">{paras}</div>'); continue
    if re.match(r'^[-*] ', s):
        flush_p(); items = []
        while i < len(lines) and re.match(r'^[-*] ', lines[i].strip()):
            items.append(inline(lines[i].strip()[2:])); i += 1
        out.append("<ul>" + "".join(f"<li>{x}</li>" for x in items) + "</ul>")
        continue
    if s == "":
        flush_p(); i += 1; continue
    if re.match(r'^\*\*[^*]+\*\*[:：]', s):
        flush_p(); out.append("<p>" + inline(s) + "</p>"); i += 1; continue
    buf_p.append(s); i += 1
flush_p()

# マストヘッド（見出し・リード・数値タイル）は JSON で外から与える
import json
meta = json.loads(open(sys.argv[4], encoding="utf-8").read()) if len(sys.argv) > 4 else {}
tiles = "".join(
    f'<div class="{t.get("kind","ok")}"><span class="v">{t["v"]}<small>{t.get("unit","")}</small></span>'
    f'<span class="l">{t["label"]}</span></div>'
    for t in meta.get("tiles", []))
MASTHEAD = f"""
</head><body>
<header class="masthead"><div class="masthead-in">
<div class="eyebrow"><span>{meta.get("eyebrow","検証レポート")}</span><span class="sep"></span><span>mirai-forecast</span><span class="sep"></span><span>{meta.get("date","")}</span></div>
<h1>{meta.get("title","")}</h1>
<p class="dek">{meta.get("dek","")}</p>
</div></header>
<div class="wrap">
<div class="tally">{tiles}</div>
"""

open(out_path, "w", encoding="utf-8").write(prelude + MASTHEAD + "\n".join(out) + "\n</div></body></html>")
print("written:", out_path)
