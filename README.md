# KRONOS ATELIER

A hand-built, motion-led portfolio site for a fictional photographer
(*Elias Marchetti*, Lisbon & Milan). Single page, no build step, no external
requests — every font, image and library is vendored locally so it runs
identically offline and on GitHub Pages.

---

## What's inside

| Path | Purpose |
| --- | --- |
| `index.html` | The whole site: hero, studio, index gallery, series, darkroom, reel, clients, journal, footer, enquiry drawer, lightbox. |
| `404.html` | Matching "frame never developed" error page (GitHub Pages serves this automatically). |
| `assets/css/fonts.css` | Self-hosted `@font-face` declarations (Instrument Serif, Archivo, IBM Plex Mono). |
| `assets/css/style.css` | Design tokens, both themes, all sections, breakpoints, reduced-motion rules. |
| `assets/js/main.js` | Theme, clock, smooth scroll, pinned hero, reveals, marquees, gallery engine, lightbox, enquiry drawer, grade slider. |
| `assets/js/vendor/` | GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.18 (BSD/MIT, self-hosted). |
| `assets/img/` | 38 photographs (`-01`…`-06`, `loader-*`, gallery frames, `favicon.svg`). |
| `.nojekyll` | Tells GitHub Pages to serve files as-is (no Jekyll processing). |

No `node_modules`, no bundler, no CDN. Open `index.html` through a web server and it works.

---

## Run it locally

Browsers block some features on `file://`, so serve the folder:

```bash
# Python (already installed on most machines)
python -m http.server 8123

# or Node
npx serve .
```

Then open <http://127.0.0.1:8123/>.

---

## Deploy to GitHub Pages

**One-time, from this folder:**

```bash
git init
git add .
git commit -m "KRONOS ATELIER — initial build"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

Then in the repository: **Settings → Pages → Build and deployment**

- **Source:** *Deploy from a branch*
- **Branch:** `main` · **Folder:** `/ (root)`
- **Save**

The site goes live at `https://<your-user>.github.io/<your-repo>/` in about a minute.
Custom domain: add a `CNAME` file containing the bare domain, then point a CNAME
DNS record at `<your-user>.github.io`.

Because the site is 100% static with `./`-relative paths and a `.nojekyll` file,
it also deploys unchanged to Netlify, Cloudflare Pages or any static host.

---

## How it's built

**Gallery engine (`#work`)** — one absolutely-positioned track, fourteen frames.
The three modes animate the same DOM nodes (no clones, no `display:none` churn):

- **Scatter** — hand-placed percentages from the `SCATTER` array in `main.js`,
  each frame rotated a couple of degrees (`ROT`).
- **Filmstrip** — frames sized to a shared band height with alternating vertical
  offset, drag/wheel/trackpad to pan, inertia on release.
- **Archive** — a typographic index list; rows fade in and open the matching frame.

Filters re-run the layout for the visible subset only. Under 900 px the whole
engine steps aside for a CSS-only grid (and horizontal scroll-snap in filmstrip
mode).

**Pinned hero** — ScrollTrigger pins the hero for `+=1700px`: the wordmark splits,
the three prints fly out, and the full-bleed frame pulls focus. Mobile gets a
static version.

**Darkroom grade** — a pointer/keyboard divider revealing the same frame before
and after the grade, with a one-shot auto-drag when it scrolls into view.

**Theming** — `darkroom` (default) and `daylight`, swapped on `<html data-theme>`
and remembered in `localStorage` under `kronos-theme`. Add `?theme=daylight` to a
URL to force one for a client pitch.

---

## Editing content

- **Photographs** — replace files in `assets/img/` (keep the names, or update
  `src` in `index.html`). Gallery captions live on each `.frame` element as
  `data-title`, `data-client`, `data-year`, `data-exif`, `data-genre`, `data-ar`.
- **Colours / type scale** — the `:root` and `[data-theme]` blocks at the top of
  `style.css`.
- **Scatter composition** — `SCATTER` and `ROT` near the top of the gallery
  section in `main.js`. Values are viewport fractions: `[centreX, centreY, width]`.
- **Copy** — straight text in `index.html`; section labels are the `.eyebrow` lines.

---

## Notes for a client demo

- Every name, client logo, award and caption is **fictional**. Nothing here is a
  real endorsement.
- The enquiry form validates and shows a receipt, but **sends nothing**.
  `studio@kronosatelier.com` and the phone number are placeholders.
- Photographs are from Unsplash and are used here as demo content only. Swap them
  for the client's own work before anything goes public.
- Total payload is ~11.6 MB, but only the three hero frames (~1.4 MB) block first
  paint; the rest lazy-loads.
- `prefers-reduced-motion: reduce` is fully supported: no pin, no scrub, no
  marquee, no cursor — just the finished layout.

---

## Content

Photography: [Unsplash](https://unsplash.com) (demo use).
Type: Instrument Serif, Archivo (Omnibus-Type), IBM Plex Mono (IBM) — all SIL OFL.
Motion: [GSAP 3](https://gsap.com) + [Lenis](https://lenis.darkroom.engineering).
