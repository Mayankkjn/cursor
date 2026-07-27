#!/usr/bin/env python3
"""Rebuild the standalone process-map/build/*.html files.

Inlines all local <link rel="stylesheet"> and <script src="..."> references
so each output file is fully self-contained apart from the two cross-links
between home.html and index.html (which must stay as relative hrefs / a
window.location.href assignment so the two-page navigation flow works when
both files sit side by side, e.g. after unzipping).
"""
import re
from pathlib import Path

SRC_DIR = Path(__file__).parent
OUT_DIR = SRC_DIR / "build"

LINK_RE = re.compile(r'<link rel="stylesheet" href="([^"]+)" ?/?>')
SCRIPT_RE = re.compile(r'<script src="([^"]+)"></script>')


def inline(html_path: Path) -> str:
    html = html_path.read_text()

    def link_sub(m):
        css_path = SRC_DIR / m.group(1)
        return f"<style>\n{css_path.read_text()}\n</style>"

    def script_sub(m):
        js_path = SRC_DIR / m.group(1)
        return f"<script>\n{js_path.read_text()}\n</script>"

    html = LINK_RE.sub(link_sub, html)
    html = SCRIPT_RE.sub(script_sub, html)
    return html


def main():
    OUT_DIR.mkdir(exist_ok=True)
    for name in ("home.html", "index.html"):
        out = inline(SRC_DIR / name)
        (OUT_DIR / name).write_text(out)
        print(f"built {OUT_DIR / name} ({len(out)} bytes)")


if __name__ == "__main__":
    main()
