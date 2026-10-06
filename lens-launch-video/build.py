"""Inline the Inter font files into video.src.html -> build/lens-launch-video.html.

The output is a single self-contained file (no network needed) that plays the
launch video in any browser, and is also what render.js captures frame by frame.
"""
import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "video.src.html"
OUT = ROOT / "build" / "lens-launch-video.html"

faces = []
for weight in (400, 500, 600, 700, 800):
    data = base64.b64encode((ROOT / "fonts" / f"inter-{weight}.woff2").read_bytes()).decode("ascii")
    faces.append(
        "@font-face { font-family: 'Inter'; font-style: normal; font-weight: %d; font-display: block;"
        " src: url(data:font/woff2;base64,%s) format('woff2'); }" % (weight, data)
    )

html = SRC.read_text(encoding="utf-8").replace("/*__FONT_FACES__*/", "\n".join(faces))
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(html, encoding="utf-8")
print(f"built {OUT} ({OUT.stat().st_size} bytes)")
