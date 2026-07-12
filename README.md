# GC Windsor

The GC Windsor storefront — a static, data-driven site managed by the standalone
JRD CMS at **https://jrd-animation-cms.vercel.app/admin** and deployed on Vercel.

Rebuilt out of Squarespace (July 2026). Design: vanilla HTML/CSS/JS, no framework,
no client-side rendering of content — `scripts/build.js` renders every page from
`data/*.json` at deploy time.

## Structure

```
data/
  _schema.json     Drives the CMS content-manager drawer.
  pages.json       Global chrome + all page copy (home, shop, about, contact).
  products.json    The 6 combos, sizes, and the sales kill-switch.
  swapper.json     The Customizer — 12 GC Knots × 6 GC Ties.
  gallery.json     The gallery mosaic.
  theme.json       Design tokens -> compiled to assets/css/theme.css.
scripts/
  build.js         Renders data -> HTML. Stamps data-edit hooks for the editor.
assets/
  css/main.css     Site styles (theme.css is GENERATED — do not hand-edit).
  js/main.js       Behaviour + the ?edit=1 visual-editor bridge.
api/
  checkout.js      Stripe Checkout session. Dormant while sales are paused.
vercel.json        buildCommand: npm run build, cleanUrls
```

Run `npm run build` to regenerate the HTML.

## Media

All images and video live on **Cloudinary** (cloud `dlgc3fj6w`, folder `gcwindsor/`).
In the data files they are written as `CDN:gcwindsor/<public_id>`; `build.js`
expands that into a transformed delivery URL (`f_auto,q_auto` + sizing).

The hero autoplays `gcwindsor/video/hero-promo-1080` — silent, looping, with a
720p source swapped in under 860px and a poster frame so nothing flashes.

## The Customizer

The centrepiece. A base photo of the model (`swapper/main`) with a **tie layer**
and a **knot layer** stacked on top as transparent PNGs. All three share the same
7010×4674 frame, so they register exactly — no manual alignment. Clicking a swatch
crossfades the relevant layer.

12 knots × 6 ties = **72 combinations**. Adding a new knot or tie is a new entry in
`swapper.json` plus its PNG on Cloudinary — no code changes.

## Sales are PAUSED

`products.json` has `"salesPaused": true`, and every product's `status` is
`"coming-soon"`. Product pages show a *Coming soon* badge and a notify-me field
instead of Add to Cart, and `api/checkout.js` refuses to create a session. Nothing
can be bought by accident.

### To start selling again

1. Create the products and prices in Stripe (one price per size).
2. Paste the price ids into `products.json` → `stripePriceIdRegular` /
   `stripePriceIdTall` (editable in the CMS).
3. Add `STRIPE_SECRET_KEY` to the Vercel project's environment variables.
4. Set `salesPaused` to `false`, and each product's `status` to `live`.
5. **Redeploy** — Vercel bakes env vars at deploy time.

You can switch products on one at a time; `salesPaused` is a global override.

## Forms

The newsletter and contact forms use **Web3Forms**. Until an `accessKey` is set in
`pages.json` they run in demo mode (they show a thank-you but send nothing). Create
a key at web3forms.com and paste it into `home.newsletter.accessKey` and
`contact.accessKey` via the CMS.

## Deploying

Claude edits files host-side; Jeffrey runs git:

```bash
git pull --no-rebase --no-edit
git add -A
git commit -m "..."
git push
```

Vercel rebuilds on push. The CMS commits directly to this repo, so always **pull
before you commit** — your local copy will otherwise be behind.
