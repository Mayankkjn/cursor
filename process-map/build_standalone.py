#!/usr/bin/env python3
"""Rebuild the standalone process-map/build/*.html files.

1. build/home.html, build/index.html, build/decision-map.html
   Each page with its local <link rel="stylesheet"> and <script src="..."> references
   inlined, so each file is self-contained apart from the cross-links between pages
   (relative hrefs / window.location.href), which work when the files sit side by side.

2. build/whatfix-lens-app.html
   The complete UI in ONE file: landing page → decision map / process detail page,
   with working navigation. A tiny router shell renders the current page in a
   full-window iframe (fresh JS context per page, exactly like real navigation) and
   carries the page-to-page state that the app keeps in sessionStorage. Vendor
   libraries (d3, dagre, jsPDF) are embedded once and shared by the pages that need them.
"""
import json
import re
from pathlib import Path

SRC_DIR = Path(__file__).parent
OUT_DIR = SRC_DIR / "build"
PAGES = ("home.html", "index.html", "decision-map.html")

LINK_RE = re.compile(r'<link rel="stylesheet" href="([^"]+)" ?/?>')
SCRIPT_RE = re.compile(r'<script src="([^"]+)"></script>')
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.S)


def inline(html_path: Path, vendor_placeholders: bool = False, app_rewrites: bool = False) -> str:
    html = html_path.read_text()

    def link_sub(m):
        css_path = SRC_DIR / m.group(1)
        return f"<style>\n{css_path.read_text()}\n</style>"

    def script_sub(m):
        src = m.group(1)
        if vendor_placeholders and src.startswith("vendor/"):
            # resolved by the shell at render time from the shared vendor store
            return f'<script data-lens-vendor="{src}"></script>'
        js = (SRC_DIR / src).read_text()
        if app_rewrites:
            js = rewrite_for_shell(js)
        return f"<script>\n{js}\n</script>"

    html = LINK_RE.sub(link_sub, html)
    html = SCRIPT_RE.sub(script_sub, html)
    return html


def rewrite_for_shell(js: str) -> str:
    """Route page-to-page state and navigation through the single-file shell."""
    js = re.sub(r"\bsessionStorage\b", "__lensSession", js)
    js = re.sub(r"window\.location\.href\s*=\s*([^;]+);", r"window.__lensNavigate(\1);", js)
    return js


# Injected at the top of every page inside the single-file app.
PAGE_PRELUDE = r"""<script>
(function () {
  var store = __LENS_STORE__;
  function sync() { parent.postMessage({ type: 'lens:session', store: store }, '*'); }
  window.__lensSession = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); sync(); },
    removeItem: function (k) { delete store[k]; sync(); },
    clear: function () { store = {}; sync(); },
    key: function (i) { var k = Object.keys(store); return i < k.length ? k[i] : null; },
    get length() { return Object.keys(store).length; }
  };
  window.__lensNavigate = function (href) { parent.postMessage({ type: 'lens:nav', href: String(href) }, '*'); };
  // keep the browser tab title in step with the page (the detail page renames itself per process)
  function postTitle() { parent.postMessage({ type: 'lens:title', title: document.title }, '*'); }
  document.addEventListener('DOMContentLoaded', function () {
    postTitle();
    var t = document.querySelector('title');
    if (t && window.MutationObserver) new MutationObserver(postTitle).observe(t, { childList: true, characterData: true, subtree: true });
  });
  // in-app links (e.g. the back arrow to the Overview page)
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (/^(\.\/)?(home|index|decision-map)\.html([?#].*)?$/.test(h)) { e.preventDefault(); window.__lensNavigate(h); }
  }, true);
})();
</script>"""

SHELL = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Whatfix Lens</title>
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #f6f6f9; }
  #lens-view { position: fixed; inset: 0; width: 100%; height: 100%; border: 0; display: block; background: #f6f6f9; }
</style>
</head>
<body>
<iframe id="lens-view" title="Whatfix Lens"></iframe>
<script type="application/json" id="lens-pages">__PAGES__</script>
<script type="application/json" id="lens-vendor">__VENDOR__</script>
<script type="application/json" id="lens-prelude">__PRELUDE__</script>
<script>
(function () {
  // Whatfix Lens — single-file build. Pages: home (Overview) → index (process detail) / decision-map.
  var PAGES = JSON.parse(document.getElementById('lens-pages').textContent);
  var VENDOR = JSON.parse(document.getElementById('lens-vendor').textContent);
  var PRELUDE = JSON.parse(document.getElementById('lens-prelude').textContent);
  var view = document.getElementById('lens-view');
  var session = {};
  try { session = JSON.parse(sessionStorage.getItem('lens:session') || '{}'); } catch (e) {}

  function pageName(href) {
    var m = /(?:^|[/#])(home|index|decision-map)(?:\.html)?(?:[?#]|$)/.exec(href || ''); // 'index.html?x', './home.html', '#/index'
    return m ? m[1] : 'home';
  }

  function render(name) {
    var html = PAGES[name] || PAGES.home;
    var prelude = PRELUDE.replace('__LENS_STORE__', function () { return JSON.stringify(session).replace(/</g, '\\u003c'); });
    html = html.replace(/<head>/i, function (h) { return h + prelude; });
    html = html.replace(/<script data-lens-vendor="([^"]+)"><\/script>/g, function (_, src) {
      return '<script>' + (VENDOR[src] || '') + '<\/script>';
    });
    var t = /<title>([\s\S]*?)<\/title>/i.exec(html);
    document.title = t ? t[1] : 'Whatfix Lens';
    view.srcdoc = html;
  }

  function navigate(href, replace) {
    var name = pageName(href);
    var url = '#/' + name;
    try { replace ? history.replaceState({ page: name }, '', url) : history.pushState({ page: name }, '', url); } catch (e) {}
    render(name);
  }

  window.addEventListener('message', function (e) {
    if (e.source !== view.contentWindow || !e.data) return;
    if (e.data.type === 'lens:session') {
      session = e.data.store || {};
      try { sessionStorage.setItem('lens:session', JSON.stringify(session)); } catch (err) {}
    } else if (e.data.type === 'lens:title') {
      if (e.data.title) document.title = e.data.title;
    } else if (e.data.type === 'lens:nav') {
      navigate(e.data.href, false);
    }
  });
  window.addEventListener('popstate', function (e) { render((e.state && e.state.page) || pageName(location.hash)); });

  var start = /^#\/(home|index|decision-map)$/.exec(location.hash);
  navigate(start ? start[1] : 'home', true);
})();
</script>
</body>
</html>
"""


def json_for_script(obj) -> str:
    # safe inside <script type="application/json">: never let a "</script" end the block
    return json.dumps(obj, ensure_ascii=False).replace("</", "<\\/")


def build_single_file() -> str:
    pages = {}
    vendor = {}
    for name in PAGES:
        html = inline(SRC_DIR / name, vendor_placeholders=True, app_rewrites=True)
        pages[name.removesuffix(".html")] = html
        for src in re.findall(r'data-lens-vendor="([^"]+)"', html):
            vendor[src] = (SRC_DIR / src).read_text()
    return (
        SHELL.replace("__PAGES__", json_for_script(pages))
        .replace("__VENDOR__", json_for_script(vendor))
        .replace("__PRELUDE__", json_for_script(PAGE_PRELUDE))
    )


def main():
    OUT_DIR.mkdir(exist_ok=True)
    for name in PAGES:
        out = inline(SRC_DIR / name)
        (OUT_DIR / name).write_text(out)
        print(f"built {OUT_DIR / name} ({len(out)} bytes)")
    single = build_single_file()
    (OUT_DIR / "whatfix-lens-app.html").write_text(single)
    print(f"built {OUT_DIR / 'whatfix-lens-app.html'} ({len(single)} bytes) — complete UI in one file")


if __name__ == "__main__":
    main()
