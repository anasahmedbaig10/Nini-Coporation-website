#!/usr/bin/env python3
"""
Bundle the 18-page site into ONE self-contained HTML file for sharing.

The published preview cannot fetch anything from another host, so every image,
video, stylesheet and script is inlined and the multi-page navigation becomes
in-page routing. The production site in _preview/ stays as it is — this is a
shareable copy, not a replacement.

    python build_preview.py   ->  preview-single-file.html
"""

import base64, mimetypes, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))

# index first so the homepage is the landing route; contact before feedback so
# the canonical enquiry form is the one the script binds to (both pages carry a
# #quoteForm, and getElementById takes the first).
ORDER = [
    ("index.html", "home"),
    ("about.html", "about"),
    ("why-choose-us.html", "why-choose-us"),
    ("process.html", "process"),
    ("industries.html", "industries"),
    ("sourcing-inspection.html", "sourcing-inspection"),
    ("compliances.html", "compliances"),
    ("certifications.html", "certifications"),
    ("quality-assurance.html", "quality-assurance"),
    ("portal.html", "portal"),
    ("products.html", "products"),
    ("gallery.html", "gallery"),
    ("contact.html", "contact"),
    ("feedback.html", "feedback"),
    ("faqs.html", "faqs"),
    ("privacy-policy.html", "privacy-policy"),
    ("terms.html", "terms"),
]

_cache = {}


def data_uri(path):
    if path in _cache:
        return _cache[path]
    full = os.path.join(ROOT, path)
    if not os.path.isfile(full):
        return path
    mime = mimetypes.guess_type(full)[0] or "application/octet-stream"
    with open(full, "rb") as f:
        uri = "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())
    _cache[path] = uri
    return uri


def collect_assets(html):
    """Replace asset URLs with short keys and return the key -> data URI map.

    Inlining each occurrence separately ballooned the file to 21 MB, because
    the same photograph appears on many routes. Every asset is emitted once and
    referenced by key instead."""
    assets = {}

    def repl(m):
        attr, url = m.group(1), m.group(2)
        if url.startswith(("data:", "http:", "https:", "#", "mailto:", "tel:")):
            return m.group(0)
        # Safari can play the WebM; dropping the H.264 fallback saves ~1.8 MB
        # of base64 in a file that has a hard size ceiling.
        if url.endswith(".mp4"):
            return '%s="" data-skip="1"' % attr
        key = re.sub(r'[^a-z0-9]+', '-', os.path.basename(url).lower())
        if key not in assets:
            assets[key] = data_uri(url)
        return 'data-%s="%s"' % (attr, key)

    html = re.sub(r'\b(src|poster)="([^"]+)"', repl, html)
    return html, assets


def grab(html, tag, cls=None):
    if cls:
        m = re.search(r'<%s[^>]*class="[^"]*%s[^"]*"[^>]*>(.*?)</%s>' % (tag, cls, tag), html, re.S)
    else:
        m = re.search(r'<%s[^>]*>(.*?)</%s>' % (tag, tag), html, re.S)
    return m.group(1) if m else ""


def main():
    pages = {}
    for fname, route in ORDER:
        p = os.path.join(ROOT, fname)
        if os.path.isfile(p):
            pages[route] = open(p, encoding="utf-8").read()

    first = pages["home"]

    # shared chrome, taken once from the homepage
    header = re.search(r'(<header class="header".*?</header>)', first, re.S).group(1)
    footer = re.search(r'(<footer class="footer".*?</footer>)', first, re.S).group(1)
    lightbox = re.search(r'(<div class="lightbox".*?</div>\s*</div>)', first, re.S)
    lightbox = lightbox.group(1) if lightbox else ""
    tray = re.search(r'(<div class="tray" id="sampleTray".*?</div>\s*</div>)', first, re.S)
    tray = tray.group(1) if tray else ""
    stitch = re.search(r'(<div class="stitch".*?</div>)\s*<div class="cursor-ring"', first, re.S)
    stitch = stitch.group(1) + "</div>" if stitch else ""

    css = open(os.path.join(ROOT, "assets/css/styles.css"), encoding="utf-8").read()
    # the font @import becomes a real <link>; keep the rest of the sheet intact
    font_url = re.search(r"@import url\('([^']+)'\);", css)
    font_href = font_url.group(1) if font_url else ""
    css = re.sub(r"@import url\('[^']+'\);\s*", "", css)

    js = open(os.path.join(ROOT, "assets/js/main.js"), encoding="utf-8").read()

    # build the routes
    seen_ids = set()
    routes_html = []
    for fname, route in ORDER:
        if route not in pages:
            continue
        body = grab(pages[route], "main")

        # a preview cannot download files, so drop the PDF button rather than
        # leave a control that does nothing when clicked
        body = re.sub(r'<a class="pill pill--ghost" href="[^"]*capability-statement\.pdf"[^>]*>.*?</a>',
                      '', body, flags=re.S)

        # keep IDs unique across routes; the first occurrence stays wired
        def dedupe(m):
            i = m.group(1)
            if i in seen_ids:
                return 'id="%s--%s"' % (i, route)
            seen_ids.add(i)
            return m.group(0)
        body = re.sub(r'id="([^"]+)"', dedupe, body)

        hidden = "" if route == "home" else " hidden"
        routes_html.append('<div class="route" data-route="%s"%s>%s</div>' % (route, hidden, body))

    doc = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nini Corporation</title>
<script>document.documentElement.classList.add('js');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="FONT_HREF">
<style>
CSS_HERE

/* --- preview-only: in-page routing replaces the multi-page navigation --- */
.route[hidden] { display: none; }
</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>
STITCH
<div class="cursor-ring" id="cursorRing" aria-hidden="true"></div>
<div class="cursor-dot" id="cursorDot" aria-hidden="true"></div>
HEADER
<main id="main">
ROUTES
</main>
FOOTER
LIGHTBOX
TRAY
<script>
/* Route between the bundled pages. Real deployment uses separate HTML files;
   this exists only so the shared preview behaves like the live site. */
(function () {
  var routes = document.querySelectorAll('.route');
  function show(name) {
    var found = false;
    routes.forEach(function (r) {
      var on = r.getAttribute('data-route') === name;
      r.hidden = !on;
      if (on) found = true;
    });
    if (!found) { routes[0].hidden = false; name = routes[0].getAttribute('data-route'); }
    document.querySelectorAll('.nav__link').forEach(function (a) {
      var h = a.getAttribute('href') || '';
      a.classList.toggle('is-active', h === '#' + name);
    });
    window.scrollTo(0, 0);
    document.title = 'Nini Corporation';
  }
  /* rewrite page links to routes */
  document.querySelectorAll('a[href$=".html"]').forEach(function (a) {
    var f = a.getAttribute('href').split('#')[0].replace('.html', '');
    a.setAttribute('href', '#' + (f === 'index' ? 'home' : f));
  });
  window.addEventListener('hashchange', function () {
    show((location.hash || '#home').slice(1));
  });
  show((location.hash || '#home').slice(1));
})();
</script>
<script>
JS_HERE
</script>
</body>
</html>
"""
    doc = (doc.replace("FONT_HREF", font_href)
              .replace("CSS_HERE", css)
              .replace("STITCH", stitch)
              .replace("HEADER", header)
              .replace("ROUTES", "\n".join(routes_html))
              .replace("FOOTER", footer)
              .replace("LIGHTBOX", lightbox)
              .replace("TRAY", tray)
              .replace("JS_HERE", js))

    doc, assets = collect_assets(doc)

    # emit each asset once, then hydrate src/poster before anything else runs
    asset_map = ",".join('"%s":"%s"' % (k, v) for k, v in assets.items())
    asset_js = (
        "<script>\n(function(){var A={" + asset_map + "};"
        "document.querySelectorAll('[data-src],[data-poster]').forEach(function(e){"
        "var s=e.getAttribute('data-src'),p=e.getAttribute('data-poster');"
        "if(s&&A[s])e.setAttribute('src',A[s]);"
        "if(p&&A[p])e.setAttribute('poster',A[p]);"
        "e.removeAttribute('data-src');e.removeAttribute('data-poster');});"
        "document.querySelectorAll('source[data-skip]').forEach(function(e){e.remove();});"
        "})();\n</script>\n"
    )
    # Must run before the router and main.js. Anchor on the router comment:
    # "JS_HERE" has already been substituted by this point, so anchoring there
    # silently matched nothing and shipped a file with no images.
    anchor = "<script>\n/* Route between the bundled pages."
    if anchor not in doc:
        raise SystemExit("asset-injection anchor not found — aborting rather than "
                         "shipping a preview with no images")
    doc = doc.replace(anchor, asset_js + anchor)

    out = os.path.join(ROOT, "preview-single-file.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(doc)

    mb = len(doc.encode()) / 1024 / 1024
    print("routes bundled : %d" % len(routes_html))
    print("inlined assets : %d" % len(_cache))
    print("output size    : %.2f MB" % mb)
    print("limit          : 16 MB  ->  %s" % ("OK" if mb < 16 else "TOO LARGE"))
    return out


if __name__ == "__main__":
    main()
