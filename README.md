# Nini Corporation — Website

18-page static site for Nini Corporation, a textile buying house in Karachi, Pakistan.
No build step, no dependencies, no Node required to run or deploy.

---

## ⚠ Before you publish — required changes

Two of these are legal, not cosmetic:

- **`privacy-policy.html` and `terms.html` are templates, not legal documents.** They set out
  the right structure with `[Complete: …]` markers, but the wording has not been reviewed by a
  lawyer. You serve UK and EU buyers, so UK GDPR / GDPR very likely apply to enquiry data.
  Have an adviser finish them before publishing.
- **Update the domain in `build.py`.** `build_seo()` has `BASE = "https://www.ninicorporation.com"`.
  If you deploy elsewhere, change it and re-run, or `sitemap.xml` will point at the wrong host.
- **Point your host's 404 handler at `404.html`** (Netlify and Vercel do this automatically;
  on cPanel/Apache add `ErrorDocument 404 /404.html` to `.htaccess`).

Still outstanding — each is marked with a `TODO:` comment in `build.py`:

| # | What | Where |
|---|------|-------|
| 1 | **Testimonials** are unattributed (role + market only, no named person or company). Replace with real permissioned quotes, or remove the section. | `TESTIMONIALS` in `build.py` |
| 2 | **Contact form** is not connected to anything — it validates, clears, and sends nothing. See "Connecting the form". | `CONTACT_FORM` in `build.py` |
| 3 | **Client portal details** — app name, what the reports contain, whether the portal is live. The report card is a deliberate illustration, not a screenshot. | `portal.html` section |
| 4 | **Audit count** currently reads "1,000+". Your source says "thousands plus"; a real figure is stronger. | `build_index()` stat row |
| 5 | **Years in business** shows "25+". 1999→2026 is 27; 25+ was chosen because it ages better. | `build_index()` stat row |

Contact details, address, founding date, services, process and product list are all **real**,
taken from ninicorporation.com and verified.

---

## Connecting the inspection app / client portal

Every hand-off point to the app is configured in one place — the `APP` dict at the top of
`build.py`. Fill in a value, run `python build.py`, and that piece points at the app. Leave it
blank and the site keeps its own local behaviour, so you can connect them one at a time.

```python
APP = {
    "capability_pdf": "https://app.example.com/docs/capability.pdf",
    "enquiry_url":    "https://app.example.com/enquiry",
    "enquiry_api":    "https://app.example.com/api/enquiries",
    "portal_login":   "https://app.example.com/login",
}
```

| Key | What it changes | Blank behaviour |
|---|---|---|
| `capability_pdf` | The "Capability Statement (PDF)" button on 13 pages. The `download` attribute is dropped automatically for a remote URL, since it only works same-origin. | Serves the locally generated PDF |
| `enquiry_url` | All 6 enquiry destinations — hero CTA, header icon, mobile nav, product cards, footer, sample tray | `contact.html#quote` |
| `enquiry_api` | Adds `action` + `method="POST"` to the contact form. The submit handler then lets the browser post normally instead of blocking it, and clears the saved sample list. | Validates, then says it is not connected |
| `portal_login` | Adds a "Client Login" link to the header | Hidden |

**One thing worth knowing about the sample tray.** It stores selections in `localStorage`, which
does **not** cross origins. If `enquiry_url` points at another domain, the tray detects that and
passes the list as `?samples=Bath%20Towels|Bathrobes` instead. The contact page already reads
that parameter, so the same mechanism works whichever end handles it — have the app read
`?samples=`, split on `|`.

**On the form endpoint:** if the app's API is on another domain it must send
`Access-Control-Allow-Origin` for the site's origin, or the POST will be blocked by CORS. A
normal (non-AJAX) form POST avoids that, which is why the form uses a real `action` rather than
`fetch`.

---

## Running it locally

Any static server works. With Python (already installed on this machine):

```bash
python -m http.server 8123
```

Then open <http://localhost:8123>. Opening `index.html` directly via `file://` also works,
but a server is closer to production.

---

## Deploying

The whole site is static files — upload the folder to any host:

- **Netlify / Vercel / Cloudflare Pages** — drag the folder onto their dashboard, done.
- **Shared hosting / cPanel** — upload via FTP to `public_html`.
- **GitHub Pages** — commit and enable Pages on the branch.

No build command. No environment variables.

---

## Connecting the form

The markup is ready; it just needs an endpoint. Easiest option is [Formspree](https://formspree.io)
— create a form, then in `index.html`:

```html
<form class="form" id="quoteForm" novalidate
      action="https://formspree.io/f/YOUR_ID" method="POST">
```

…and in `assets/js/main.js`, delete the `e.preventDefault()` line in the submit handler so the
browser posts normally. Client-side validation still runs first.

---

## Structure

18 pages. The homepage teases; detail lives on subpages — the same shape as the
reference and as the Vercel proposal.

```
build.py                page generator (see below)
index.html              homepage
about.html              why-choose-us.html   process.html      industries.html
sourcing-inspection.html compliances.html    certifications.html
quality-assurance.html  portal.html
products.html           gallery.html         feedback.html      contact.html
faqs.html               privacy-policy.html  terms.html        404.html
sitemap.xml             robots.txt
assets/
  css/styles.css        design system + all components
  js/main.js            nav, mega menus, reveals, 3D, lightbox, carousel, forms
  img/                  optimised JPEG (2.4 MB total)
  video/backdrop.webm   hero video, VP9 (900 KB — served first)
  video/backdrop.mp4    hero video, H.264 (1.3 MB — fallback)
Nini Coporation/        your original source files, untouched
.claude/launch.json     local dev-server config
```

### Editing pages — `build.py`

The header, footer and navigation are identical on all 18 pages. Rather than
hand-editing them 18 times, they are generated:

```bash
python build.py
```

**This is not a deploy step.** The output is plain static HTML — deployment is
still "upload the folder". Run it only when you change shared chrome (nav,
footer, contact details) or page copy, then commit the regenerated `.html`
files. Contact details live in the `SITE` dict at the top; nav lives in `NAV`.

> If you edit an `.html` file by hand, re-running `build.py` will overwrite it.
> Make the change in `build.py` instead.

### Why it was split

The single-page version reached **25,600px across 17 sections** — 3.5× the
reference's 7,214px. That length was the main reason it felt less premium than
the reference: it read as an exhaustive brochure rather than a considered
homepage. The homepage is now **~10,000px across 9 sections**, and the detail
that used to bloat it has real pages of its own.

### Images

Originals were 4096×4096 / 5504×3072 PNGs totalling **275 MB** — unusable on the web.
They were resized and re-encoded to JPEG at quality 82: **2.4 MB total**, a 99% reduction.
Your originals in `Nini Coporation/` were not modified.

To regenerate after replacing a source image, re-run the conversion or resize manually to
1200px (square product tiles) / 1920px (wide process shots).

### The hero video

Your original `Nini Coporation backdrop.mp4` had two problems:

1. **It was HEVC (H.265).** Chrome and Firefox largely cannot decode HEVC in MP4 — so the hero
   video would have failed to play for most of your visitors, silently falling back to the
   poster image. Only Safari would have shown it.
2. **15 MB for 5 seconds** — a 24.6 Mbps bitrate, roughly 10× what a silent background loop needs.

Both are fixed. It was re-encoded to two web-standard formats:

| File | Codec | Size | Notes |
|---|---|---|---|
| `backdrop.webm` | VP9 Profile 0, 8-bit | 900 KB | listed first; Chrome, Firefox, Edge |
| `backdrop.mp4` | H.264 High, yuv420p | 1.3 MB | fallback; Safari, older browsers |

**15 MB → 900 KB, and it now actually plays.** Verified in-browser: `readyState 4`, playing,
no decode error.

> Note on the WebM: VP9 initially inherited 10-bit colour from the HEVC source, producing
> Profile 2, which many browsers cannot decode. It was re-encoded with `-profile:v 0
> -pix_fmt yuv420p` to force 8-bit. **If you ever re-encode, keep those flags.**

Loading is a progressive enhancement — the poster shows immediately and the video fades in when
ready. It is skipped only on `save-data`/2G connections or with `prefers-reduced-motion`.

> There was previously a `min-width: 900px` gate, added when the source was 15 MB. It was
> removed after compression: at 900 KB the video is fine on a phone, and the gate meant the
> hero video never loaded at all in any window narrower than 900px.

Your original 15 MB HEVC file remains untouched in `Nini Coporation/`.

To re-encode after replacing the source:

```bash
ffmpeg -i source.mp4 -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 27 -preset slow -movflags +faststart -an backdrop.mp4
```
```bash
ffmpeg -i source.mp4 -c:v libvpx-vp9 -profile:v 0 -pix_fmt yuv420p -crf 36 -b:v 0 -row-mt 1 -an backdrop.webm
```

---

## Design notes

The structure and proportions are modelled on **arville.com**, at your request. The layout
logic, section rhythm and component sizing were measured from the live site rather than
guessed. None of Arville's code, imagery or copy was used — this is an independent
implementation using your assets and brand.

What was matched, and the measured values behind it:

| | Arville | This site |
|---|---|---|
| Page ground | `#000000` | `#000000` |
| Body text | `#FFFFFF` | `#FFFFFF` |
| Single accent | `#FFFF00` yellow | `#8CC163` your green |
| h1 | 79px / w600 / **line-height 1.0** | same ratio, fluid |
| h2 | 50px / w600 / **line-height 1.0** | same ratio, fluid |
| Eyebrow | 21px, accent-coloured, sentence case | same |
| Container | full width, 30px gutters | same (capped at 1600px) |
| Section rhythm | 80px | same |
| Circle button | 41px, 1px accent border | 44px (see below) |
| Header | centred wordmark, nav row beneath, utilities right | same |

**Two deliberate deviations:**

1. **Circle buttons are 44px, not 41px.** Three extra pixels, visually indistinguishable,
   but it clears touch-target guidance comfortably.
2. **Typeface.** Arville uses "Value", a licensed commercial font that cannot legally be
   reused. **Plus Jakarta Sans** is the substitute — the closest free geometric humanist
   sans in proportion and weight. If you want an exact match you would need to license
   Value, or a closer commercial alternative.

### Scroll animation

The keyframes and timings were read out of the reference's stylesheet and reproduced exactly:

| Animation | Timing | Motion |
|---|---|---|
| `slide-in-up` | 0.75s `cubic-bezier(.25,.46,.45,.94)` | `translate3d(0,20px,0)` → `0`, opacity 0 → .75 at 50% → 1 |
| `slide-in-left` / `right` | same | `translate3d(∓100%,0,0)` → `0` |
| `fade-in` | 0.75s ease-in-out | opacity 0 → 1 |
| `scale-in` | 0.75s ease-in-out | `scale(0)` → `scale(1)` |
| `floating` | 3s ease-in-out infinite | reference travels 30px; **softened to 12px** here because our badge sits in flow above text rather than absolutely positioned |

Apply with `.reveal` plus an optional modifier: `.reveal--fade`, `--scale`, `--left`, `--right`.
Delays: `.reveal-d1/-d2/-d3` (90/180/270ms).

### 3D — added, not copied

The reference is 2D apart from its `translate3d` compositing. These are additions:

| Class / behaviour | What it does |
|---|---|
| `.reveal--tilt` | cards hinge up: `rotateX(14deg)` + `translateZ(-90px)` → flat, 0.95s |
| `.reveal--depth` | images arrive from `translateZ(-160px)` at `scale(.94)`, 0.9s |
| `.reveal--swing` | `rotateY(-16deg)` → flat, 0.9s |
| `.stagger` | grid children animate in sequence, 70ms apart, via a `--i` index set in JS |
| `.tilt3d` | **pointer-driven tilt** — the image rotates up to 12° on both axes toward the cursor |
| Hero parallax | media plane drifts 90px, recedes 70px in Z and scales 1.06 across the hero |
| Magnetic buttons | large circle buttons drift toward the cursor at 0.28× |
| Mega menu | opens with `rotateX(-6deg)` → flat over 0.4s, matching the reference's timing |
| Stat count-up | figures count from 0 with easeOutCubic |

### The woven band

A real warp-and-weft weave drawn on canvas, not a texture image. Vertical warp and horizontal
weft threads, every fourth one in brand green; at each intersection the crossing thread is
**redrawn over** the other, alternating, so it reads as interlaced cloth rather than a grid.
Threads bow toward the cursor. It animates only while on screen and while the tab is focused,
is DPR-aware, and paints one static frame first so it is never blank.

### Fabric drape (hero transitions)

On slide change the outgoing frame is rebuilt as **12 vertical panels** which fall away at
staggered delays and durations, rotating back in Z — cloth dropping off a bolt. Built in JS as
a temporary overlay using the slide's `<img>` (the video slide's poster), so it works for every
slide, and removes itself after 2s. Disabled under reduced-motion.

### Stitched scroll indicator

A thread stitched down the right edge, dashes appearing as you scroll, with a needle riding the
leading end. Built from a repeating CSS gradient revealed with `clip-path`, **not** an SVG
`stroke-dasharray` — a stretched SVG would smear the 9px/7px stitch rhythm at different page
heights. Hidden under 980px.

### Scroll-pinned process

On `process.html` the imagery frame is `position: sticky` while the six steps scroll past it.
The active step brightens and takes an accent border, the frame cross-fades to that step's
image, and a counter tracks `01/06`. Pinning switches off under 980px, where every step shows
at full opacity instead.

### Capability statement PDF

`capability-statement.html` is a print-designed, light-themed, self-contained one-pager — it
deliberately does **not** use the site stylesheet, because it is the source Chrome renders from.
The PDF is generated with headless Chrome:

```bash
chrome --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="nini-corporation-capability-statement.pdf" "http://localhost:8123/capability-statement.html"
```

Re-run it after changing services, process or contact details. The output is a real 2-page PDF
(2,702 glyph operations, 2 embedded font subsets) — not a print dialog dressed up as a download.

### Sample request tray

Buyers add product categories from `products.html`; a floating tray tracks the list and carries
it to the enquiry form on `contact.html`, pre-filling the message and pre-selecting the service.
Stored in `localStorage` under `nini_samples` — every read and write is wrapped in try/catch,
because `localStorage` throws outright in private windows and when site data is blocked.

To add a category elsewhere, put `data-sample="Name"` on a button; the tray wires itself up.

**One implementation note worth keeping.** The pointer tilt is applied to the `<img>` *inside*
each card (`.tilt3d__inner`), never the card itself. The card carries the reveal animation, and
a CSS animation with `fill-mode: forwards` outranks inline styles — so tilting the card would
silently fight the reveal. Tilt the child, not the animated parent.

All of it is disabled under `prefers-reduced-motion`, including parallax and pointer tilt, and
the pointer effects are gated on `(hover: hover) and (pointer: fine)` so touch devices skip them.

**Brand colours** sampled directly from `Logo.jpeg`:

| Token | Value | Use |
|---|---|---|
| `--accent` | `#8CC163` | the single accent — eyebrows, second headline line, buttons |
| `--accent-bright` | `#A0D477` | hover |
| `--accent-deep` | `#6BA344` | dropdown numerals |

Green on black measures **8.7:1** — noticeably better than Arville's yellow-on-black, so
the accent is safe at small sizes here in a way theirs is not.

**Logo variants** generated from your JPEG, with the white background made transparent:
`mark-light.png` / `mark-dark.png` (mark only, used in header and footer) and
`logo-light.png` / `logo-dark.png` (full lockup, spare).

---

## Accessibility

Verified in-browser, not assumed:

- All text passes WCAG AA contrast on the black ground — lowest measured 8.05:1.
- No horizontal overflow at 375px.
- Zero interactive targets under 44px.
- Closed mobile menu is removed from the tab order via `visibility: hidden`.
- Full keyboard support: skip link, visible 3px focus rings, Escape closes menus and lightbox.
- `prefers-reduced-motion` disables reveals, the scroll cue, and the hero video entirely.
- Form validates on blur, not keystroke; errors sit beside their field and focus moves to the
  first invalid one on submit.

### One known implementation note

`.header` uses `backdrop-filter`, which makes it a containing block for `position: fixed`
descendants. That collapsed the off-canvas mobile nav to the header box. The fix is in the
`max-width: 900px` block, which drops the filter — **do not re-add `backdrop-filter` there**
or the mobile menu will break again.
