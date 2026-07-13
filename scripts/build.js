#!/usr/bin/env node
/* GC Windsor - data-driven renderer for the standalone JRD CMS.
   Content: data/*.json (edited via https://jrd-animation-cms.vercel.app/admin).
   Layout: this file. Design tokens: data/theme.json -> assets/css/theme.css.
   Stamps data-edit="<file>#<dot.path>" on text leaves and
   data-edit-item="<file>#<arr>#<idx>" on array-item roots for the visual editor
   (see the ?edit=1 bridge at the bottom of assets/js/main.js).

   NOTE: keep this file pure ASCII. The Cowork sandbox mount mangles non-ASCII
   bytes and produces phantom syntax errors. Use HTML entities in output. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const CLOUD = 'dlgc3fj6w';
const IMG = 'https://res.cloudinary.com/' + CLOUD + '/image/upload/';
const VID = 'https://res.cloudinary.com/' + CLOUD + '/video/upload/';

const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const out = (f, html) => {
  const p = path.join(ROOT, f);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, html);
  console.log('built', f);
};

/* Expand a CDN: reference into a transformed Cloudinary URL.
   Two forms are supported, because they come from two places:
     1. "CDN:gcwindsor/products/red"                 - hand-authored (this repo)
     2. "CDN:image/upload/v1234/gcwindsor/red.jpg"   - what the CMS writes after
                                                       an upload (it keeps the
                                                       resource type + version)
   The transform must be injected AFTER "<type>/upload/", so form 2 is unpacked
   rather than blindly appended - otherwise the URL 404s. */
const CDN_RE = /^(image|video|raw)\/upload\/(.*)$/;

function cdn(u, transform, kind) {
  if (!u) return '';
  u = String(u);
  if (!u.startsWith('CDN:')) return u;               // already a full URL
  const id = u.slice(4);
  const m = id.match(CDN_RE);
  const base = 'https://res.cloudinary.com/' + CLOUD + '/';
  if (m) return base + m[1] + '/upload/' + transform + '/' + m[2];
  return base + kind + '/upload/' + transform + '/' + id;
}

const img = (u, t) => cdn(u, t || 'f_auto,q_auto', 'image');

const vid = (u, t) => {
  if (!u) return '';
  u = String(u);
  if (!u.startsWith('CDN:')) return u;
  const out = cdn(u, t || 'q_auto', 'video');
  return CDN_RE.test(u.slice(4)) ? out : out + '.mp4';  // bare ids need the ext
};

/* editor stamps */
const ed = p => ` data-edit="pages.json#${p}"`;
const edf = (file, p) => ` data-edit="${file}#${p}"`;
const edi = (file, arr, i) => ` data-edit-item="${file}#${arr}#${i}"`;

const pages = D('pages.json');
const products = D('products.json');
const swapper = D('swapper.json');
const gallery = D('gallery.json');
const theme = D('theme.json');
const G = pages.global;

/* ---------- ambient parallax layers ----------
   amb()  = the gold rooster mark, for DARK / photographic sections.
   mark() = the large black GC logo, a low-opacity watermark for LIGHT sections.
   Both are decorative, aria-hidden, driven by main.js [data-amb] and killed
   under prefers-reduced-motion. */
const ROOSTER = 'CDN:gcwindsor/logo/rooster';
const BLACKMARK = 'CDN:gcwindsor/logo/gcw-logo-black-3x';

const amb = (pos, speed) =>
  `<img class="amb amb--${pos}" data-amb data-speed="${speed}" src="${img(ROOSTER, 'f_auto,q_auto,w_900')}" alt="" aria-hidden="true" loading="lazy">`;

const mark = (pos, speed) =>
  `<img class="mark mark--${pos}" data-amb data-speed="${speed}" src="${img(BLACKMARK, 'f_auto,q_auto,w_1200')}" alt="" aria-hidden="true" loading="lazy">`;

/* ---------- theme compiler: theme.json -> assets/css/theme.css ---------- */
function buildTheme() {
  let root = '';
  for (const k in theme) root += `  --${k}: ${theme[k]};\n`;
  out('assets/css/theme.css',
    '/* GENERATED from data/theme.json - edit via /admin -> Theme. Do not hand-edit. */\n:root {\n' + root + '}\n');
}

/* ---------- shared chrome ---------- */
const FONTS = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;1,200;1,300&family=Jost:wght@200;300;400;500&family=Pinyon+Script&display=swap';
const OG = img(pages.home.split.image, 'c_fill,g_auto,w_1200,h_630,f_jpg,q_auto');

const head = (seo, page) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(seo.title)}</title>
<meta name="description" content="${esc(seo.desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="G.C. Windsor">
<meta property="og:title" content="${esc(seo.title)}">
<meta property="og:description" content="${esc(seo.desc)}">
<meta property="og:image" content="${OG}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${img(G.emblem, 'f_png,w_64,c_fit')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/theme.css">
<link rel="stylesheet" href="/assets/css/main.css">
</head>
<body data-page="${page}">
${navHTML(page)}`;

/* window.GCW: everything the client needs, with CDN paths already expanded. */
const gcw = () => JSON.stringify({
  brand: G.brand,
  salesPaused: products.salesPaused,
  customizer: {
    base: img(swapper.base, 'f_auto,q_auto,w_1600'),
    defaultKnotColor: swapper.defaultKnotColor,
    defaultTieColor: swapper.defaultTieColor,
    soonLabel: swapper.soonLabel,
    soonNote: swapper.soonNote,
    types: swapper.types.map(t => ({
      id: t.id,
      label: t.label,
      designs: t.designs.map(d => ({
        id: d.id,
        label: d.label,
        status: d.status,
        colors: (d.colors || []).map(c => ({
          id: c.id, name: c.name, colors: c.colors,
          img: img(c.img, 'f_auto,q_auto,w_1600')
        }))
      }))
    })),
    products: products.items.map(p => ({ id: p.id, slug: p.slug, knot: p.knot, tie: p.tie, name: p.name }))
  },
  film: {
    src: vid(pages.about.founder.film),
    poster: img(pages.about.founder.filmPoster, 'f_auto,q_auto,w_1600')
  }
});

const foot = () => `${footerHTML()}
<script>window.GCW=${gcw()}</script>
<script src="/assets/js/main.js"></script>
</body>
</html>`;

function navHTML(page) {
  const link = (l, i) => `<a class="nav__link${l.href === page ? ' is-active' : ''}" href="${esc(l.href)}"${edi('pages.json', 'global.nav', i)}><span${edf('pages.json', `global.nav.${i}.label`)}>${esc(l.label)}</span></a>`;
  const mid = Math.ceil(G.nav.length / 2);
  const left = G.nav.slice(0, mid).map((l, i) => link(l, i)).join('');
  const right = G.nav.slice(mid).map((l, i) => link(l, i + mid)).join('');
  return `<header class="nav" data-nav>
  <div class="nav__inner">
    <nav class="nav__group nav__group--left">${left}</nav>
    <a class="nav__brand" href="/" aria-label="GC Windsor home"><img class="nav__logo" src="${img(G.navLogo, 'f_auto,q_auto,w_600')}" alt="GC Windsor"></a>
    <div class="nav__group nav__group--right">${right}
      <a class="nav__cart" href="/shop" aria-label="Cart" data-cart></a>
    </div>
    <button class="nav__burger" aria-label="Menu"></button>
  </div>
</header>`;
}

function footerHTML() {
  const cols = G.footerCols.map(c => `<nav class="footer__col"><h4>${esc(c.heading)}</h4>${c.links.map(l => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join('')}</nav>`).join('');
  const social = G.social.map(s => `<a href="${esc(s.href)}" aria-label="${esc(s.label)}" data-icon="${esc(s.icon)}" target="_blank" rel="noopener"></a>`).join('');
  return `<footer class="footer" data-footer>
  <div class="wrap">
    <div class="footer__top">
      <div class="footer__brandcol">
        <img class="footer__logo" src="${img(G.emblem, 'f_auto,q_auto,w_400')}" alt="GC Windsor emblem">
        <div class="footer__brand"${ed('global.brand')}>${esc(G.brand)}</div>
        <p class="footer__tag"${ed('global.tagline')}>${esc(G.tagline)}</p>
      </div>
      ${cols}
    </div>
    <div class="footer__bar">
      <span class="footer__copy"${ed('global.copyright')}>${esc(G.copyright)}</span>
      <div class="social">${social}</div>
    </div>
  </div>
</footer>`;
}

/* Product card. The combo photos are 1920x1080 LANDSCAPE - always shown WHOLE
   (c_fit + object-fit:contain). Never crop a product. */
function card(p, i) {
  const paused = products.salesPaused || p.status === 'coming-soon';
  const body = paused
    ? `<span class="card__name"${edf('products.json', `items.${i}.name`)}>${esc(p.name)}</span><span class="badge">Coming soon</span>`
    : `<span class="card__name"${edf('products.json', `items.${i}.name`)}>${esc(p.name)}</span><span class="card__price">$${esc(p.price)}</span>`;
  return `<a class="card reveal" href="/product/${esc(p.slug)}"${edi('products.json', 'items', i)}>
  <div class="card__media">${paused ? '<span class="badge badge--onmedia">Coming soon</span>' : ''}<img src="${img(p.image, 'f_auto,q_auto,w_1000,c_fit')}" alt="${esc(p.name)}" loading="lazy"></div>
  <div class="card__body">${body}</div>
</a>`;
}

/* Web3Forms opener; falls back to a local "thank you" when no key is set. */
function formOpen(key, subject, cls) {
  const c = cls || 'news__form';
  if (!key) return `<form class="${c}" data-demo>`;
  return `<form class="${c}" action="https://api.web3forms.com/submit" method="POST">
      <input type="hidden" name="access_key" value="${esc(key)}">
      <input type="hidden" name="subject" value="${esc(subject)}">
      <input type="checkbox" name="botcheck" style="display:none">`;
}

/* The newsletter block - reused on the home page and the gallery page. */
function newsletter() {
  const N = pages.home.newsletter;
  return `<section id="newsletter" class="section">
  <div class="wrap news reveal">
    <p class="eyebrow eyebrow--center"${ed('home.newsletter.eyebrow')}>${esc(N.eyebrow)}</p>
    <h2 class="display display--sm" style="margin-top:16px"${ed('home.newsletter.title')}>${esc(N.title)}</h2>
    <p class="lead" style="margin:16px auto 0"${ed('home.newsletter.lead')}>${esc(N.lead)}</p>
    ${formOpen(N.accessKey, 'GC Windsor - newsletter signup')}
      <div class="field"><label>First name</label><input type="text" name="first_name" autocomplete="given-name"></div>
      <div class="field"><label>Last name</label><input type="text" name="last_name" autocomplete="family-name"></div>
      <div class="field"><label>Email</label><input type="email" name="email" required autocomplete="email"></div>
      <button class="btn btn--solid news__submit" type="submit"${ed('home.newsletter.buttonLabel')}>${esc(N.buttonLabel)}</button>
    </form>
    <p class="news__fine"${ed('home.newsletter.fine')}>${esc(N.fine)}</p>
  </div>
</section>`;
}

/* A shared page hero, with parallax and a rooster motif.
   file/prefix let it stamp editor paths into any data file. */
function pageHero(o, file, prefix, short) {
  const p = k => edf(file, prefix ? prefix + '.' + k : k);
  return `<section class="page-hero${short ? ' page-hero--short' : ''}" data-parallax>
  ${amb('tr', 130)}
  <img class="page-hero__img" src="${img(o.hero, 'f_auto,q_auto,w_1920')}" alt="">
  <div class="page-hero__scrim"></div>
  <div class="page-hero__inner">
    <p class="eyebrow eyebrow--center" style="color:var(--gold-light)"${p('eyebrow')}>${esc(o.eyebrow)}</p>
    <h1 class="script"${p('title')}>${esc(o.title)}</h1>
  </div>
</section>`;
}

/* ---------- HOME ---------- */
function buildHome() {
  const H = pages.home;
  const strip = gallery.items.slice(0, gallery.stripCount || 9);

  const html = head({ title: H.seoTitle, desc: H.seoDesc }, '/') + `

<section id="hero" class="hero">
  <img class="hero__media" src="${img(H.hero.poster, 'f_auto,q_auto,w_1920')}" alt="" aria-hidden="true">
  <video class="hero__media" data-hero-video autoplay muted loop playsinline preload="metadata" poster="${img(H.hero.poster, 'f_auto,q_auto,w_1920')}">
    <source src="${vid(H.hero.videoMobile)}" type="video/mp4" media="(max-width: 860px)">
    <source src="${vid(H.hero.video)}" type="video/mp4">
  </video>
  <div class="hero__scrim"></div>
  <a class="hero__cue" href="#positioning" aria-label="Scroll">
    <span class="hero__cue-label"${ed('home.hero.cue')}>${esc(H.hero.cue)}</span>
    <span class="hero__cue-rail"><span class="hero__cue-draw"></span></span>
    <span class="hero__cue-chev" aria-hidden="true"></span>
  </a>
</section>

<section id="positioning" class="section">
  ${amb('tr', 150)}
  ${mark('bl', -120)}
  <div class="wrap posn">
    <div class="reveal">
      <p class="eyebrow"${ed('home.positioning.eyebrow')}>${esc(H.positioning.eyebrow)}</p>
      <h1 class="display posn__display" style="margin-top:18px"${ed('home.positioning.title')}>${esc(H.positioning.title)}</h1>
    </div>
    <div class="posn__body reveal" data-delay="1">
      <p class="posn__sub"${ed('home.positioning.sub')}>${esc(H.positioning.sub)}</p>
      <p class="lead"${ed('home.positioning.lead')}>${esc(H.positioning.lead)}</p>
      <div style="margin-top:2rem"><a class="btn" href="${esc(H.positioning.ctaHref)}"><span${ed('home.positioning.ctaLabel')}>${esc(H.positioning.ctaLabel)}</span> <span class="arw-slot"></span></a></div>
    </div>
  </div>
</section>

<section id="elevate" class="section on-alt">
  ${mark('tr', 140)}
  <div class="wrap split">
    <div class="split__copy reveal">
      <p class="eyebrow"${ed('home.split.eyebrow')}>${esc(H.split.eyebrow)}</p>
      <h2 class="script split__script"${ed('home.split.title')}>${esc(H.split.title)}</h2>
      <p class="lead"${ed('home.split.lead')}>${esc(H.split.lead)}</p>
      <div style="margin-top:.5rem"><a class="btn btn--gold" href="${esc(H.split.ctaHref)}"><span${ed('home.split.ctaLabel')}>${esc(H.split.ctaLabel)}</span> <span class="arw-slot"></span></a></div>
    </div>
    <div class="split__media split__media--full reveal" data-delay="1">
      <img src="${img(H.split.image, 'f_auto,q_auto,w_1600')}" alt="A GC knot and tie, in detail" loading="lazy">
    </div>
  </div>
</section>

<section id="customize" class="section cz" data-customizer>
  <div class="wrap">
    <div class="cz__head reveal">
      <p class="eyebrow eyebrow--center"${edf('swapper.json', 'eyebrow')}>${esc(swapper.eyebrow)}</p>
      <h2 class="script cz__title"${edf('swapper.json', 'title')}>${esc(swapper.title)}</h2>
      <p class="lead cz__intro"${edf('swapper.json', 'intro')}>${esc(swapper.intro)}</p>
    </div>
    <div class="cz__grid">
      <div class="cz__stage reveal" data-cz-stage></div>
      <div class="cz__side reveal" data-delay="1">
        <div class="cz__picker">
          <div class="cz__pick" data-cz-pick="knots">
            <div class="cz__rowlabel"><span class="k"${edf('swapper.json', 'types.0.label')}>${esc(swapper.types[0].label)}</span><span class="v" data-cz-knotname></span></div>
            <div class="cz__tabs" data-cz-designs="knots"></div>
            <div class="cz__opts" data-cz-colors="knots"></div>
          </div>
          <div class="cz__pick" data-cz-pick="ties">
            <div class="cz__rowlabel"><span class="k"${edf('swapper.json', 'types.1.label')}>${esc(swapper.types[1].label)}</span><span class="v" data-cz-tiename></span></div>
            <div class="cz__tabs" data-cz-designs="ties"></div>
            <div class="cz__opts" data-cz-colors="ties"></div>
          </div>
        </div>
        <div class="cz__panel">
          <p class="now">Your combination</p>
          <p class="name" data-cz-combo></p>
          <a class="btn btn--gold btn--ondark" data-cz-cta href="/shop"><span${edf('swapper.json', 'ctaLabel')}>${esc(swapper.ctaLabel)}</span> <span class="arw-slot"></span></a>
          <p class="cz__count" data-cz-count></p>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="shop" class="section">
  ${amb('bl', 120)}
  ${mark('tr', 130)}
  <div class="wrap">
    <div class="prod-head reveal">
      <div>
        <p class="eyebrow"${ed('home.shop.eyebrow')}>${esc(H.shop.eyebrow)}</p>
        <h2 class="script" style="margin-top:16px"${ed('home.shop.title')}>${esc(H.shop.title)}</h2>
      </div>
      <a class="btn" href="${esc(H.shop.ctaHref)}"><span${ed('home.shop.ctaLabel')}>${esc(H.shop.ctaLabel)}</span> <span class="arw-slot"></span></a>
    </div>
    <div class="grid-3">${products.items.map(card).join('')}</div>
  </div>
</section>

<section id="founder" class="section founder on-dark">
  <img class="founder__art" data-amb data-speed="64" src="${img(H.founder.artwork, 'f_auto,q_auto,w_1200')}" alt="" aria-hidden="true">
  <div class="wrap">
    <div class="founder__inner reveal">
      <p class="eyebrow"${ed('home.founder.eyebrow')}>${esc(H.founder.eyebrow)}</p>
      <p class="founder__quote"${ed('home.founder.quote')}>${esc(H.founder.quote)}</p>
      <p class="founder__bio"${ed('home.founder.bio')}>${esc(H.founder.bio)}</p>
      <a class="btn btn--ondark" href="${esc(H.founder.ctaHref)}"><span${ed('home.founder.ctaLabel')}>${esc(H.founder.ctaLabel)}</span> <span class="arw-slot"></span></a>
    </div>
  </div>
</section>

<section id="gallery" class="section on-alt">
  ${amb('tr', 110)}
  ${mark('bl', -130)}
  <div class="wrap gstrip__head reveal">
    <div>
      <p class="eyebrow"${edf('gallery.json', 'eyebrow')}>${esc(gallery.eyebrow)}</p>
      <h2 class="script" style="margin-top:16px"${edf('gallery.json', 'title')}>${esc(gallery.title)}</h2>
    </div>
    <div class="gstrip__ctrl">
      <button class="gstrip__arw" data-gstrip-prev aria-label="Previous images"></button>
      <button class="gstrip__arw" data-gstrip-next aria-label="Next images"></button>
    </div>
  </div>
  <div class="gstrip reveal" data-delay="1" data-gallery data-gallery-strip>
    <div class="gstrip__track" data-gstrip-track tabindex="0" role="region" aria-label="Gallery, scroll horizontally">${strip.map((g, i) => `<div class="gtile" data-lb="${i}" data-full="${img(g.src, 'f_auto,q_auto,w_1800')}"${edi('gallery.json', 'items', i)}><img src="${img(g.src, 'f_auto,q_auto,w_1000')}" alt="${esc(g.alt)}" loading="lazy"></div>`).join('')}</div>
  </div>
  <div class="wrap gstrip__more">
    <a class="btn" href="/gallery"><span${edf('gallery.json', 'moreLabel')}>${esc(gallery.moreLabel)}</span> <span class="arw-slot"></span></a>
  </div>
</section>

${newsletter()}

<section id="contact-cta" class="cta-bleed" data-parallax>
  <img class="cta-bleed__img" src="${img(H.contactCta.image, 'f_auto,q_auto,w_1920')}" alt="" loading="lazy">
  <div class="cta-bleed__scrim"></div>
  <div class="cta-bleed__inner reveal">
    <p class="eyebrow eyebrow--center" style="color:var(--gold-light)"${ed('home.contactCta.eyebrow')}>${esc(H.contactCta.eyebrow)}</p>
    <h2 class="display display--sm" style="margin:16px 0 28px"${ed('home.contactCta.title')}>${esc(H.contactCta.title)}</h2>
    <a class="btn btn--gold btn--ondark" href="${esc(H.contactCta.ctaHref)}"><span${ed('home.contactCta.ctaLabel')}>${esc(H.contactCta.ctaLabel)}</span> <span class="arw-slot"></span></a>
  </div>
</section>
` + foot();
  out('index.html', html);
}

/* ---------- GALLERY PAGE ---------- */
function buildGallery() {
  const P = gallery.page;
  const html = head({ title: P.seoTitle, desc: P.seoDesc }, '/gallery')
    + pageHero(P, 'gallery.json', 'page', false) + `

<section class="section on-alt">
  ${amb('tr', 120)}
  ${mark('bl', -140)}
  <div class="wrap">
    <p class="lead reveal" style="max-width:680px;margin-bottom:var(--sp-5)"${edf('gallery.json', 'page.lead')}>${esc(P.lead)}</p>
    <div class="mosaic reveal" data-gallery>${gallery.items.map((g, i) => `<div class="mtile${g.span === 'tall' ? ' mtile--tall' : g.span === 'wide' ? ' mtile--wide' : ''}" data-lb="${i}" data-full="${img(g.src, 'f_auto,q_auto,w_1800')}"${edi('gallery.json', 'items', i)}><img src="${img(g.src, 'f_auto,q_auto,w_900')}" alt="${esc(g.alt)}" loading="lazy"></div>`).join('')}</div>
  </div>
</section>

${newsletter()}
` + foot();
  out('gallery.html', html);
}

/* ---------- SHOP ---------- */
function buildShop() {
  const S = pages.shop;
  const html = head({ title: S.seoTitle, desc: S.seoDesc }, '/shop')
    + pageHero(S, 'pages.json', 'shop', false) + `
<section class="section">
  ${amb('bl', 120)}
  ${mark('tr', 140)}
  <div class="wrap">
    <p class="lead reveal" style="max-width:720px;margin-bottom:var(--sp-5)"${ed('shop.lead')}>${esc(S.lead)}</p>
    <div class="grid-3">${products.items.map(card).join('')}</div>
  </div>
</section>
` + foot();
  out('shop.html', html);
}

/* ---------- PRODUCT PAGES (one per SKU) ---------- */
function buildProducts() {
  products.items.forEach((p, i) => {
    const paused = products.salesPaused || p.status === 'coming-soon';
    const thumbs = p.gallery.map((g, j) => `<button class="pdp__thumb${j === 0 ? ' is-active' : ''}" data-pdp-thumb type="button"><img src="${img(g, 'f_auto,q_auto,w_300,c_pad,ar_1:1,b_auto')}" data-full="${img(g, 'f_auto,q_auto,w_1600,c_fit')}" alt=""></button>`).join('');
    const sizes = products.sizes.map((s, j) => `<button type="button" class="size${j === 0 ? ' is-active' : ''}" data-size="${esc(s.id)}"><span class="size__label">${esc(s.label)}</span><span class="size__spec">${esc(s.spec)}</span></button>`).join('');

    const buy = paused
      ? `<div class="pdp__soon">
           <span class="badge badge--lg">Coming soon</span>
           <p class="pdp__soonnote">We are not taking orders at the moment. Leave your email and you will be the first to know when this set returns.</p>
           <form class="pdp__notify" data-demo>
             <div class="field"><label>Email</label><input type="email" name="email" required></div>
             <button class="btn btn--solid" type="submit">Notify me</button>
           </form>
         </div>`
      : `<div class="pdp__buy">
           <div class="qty"><button data-qty-dec type="button" aria-label="Less">&minus;</button><span data-qty-val>1</span><button data-qty-inc type="button" aria-label="More">+</button></div>
           <button class="btn btn--solid btn--block" data-checkout="${esc(p.id)}" type="button">Add to cart</button>
         </div>`;

    const html = head({ title: p.name + ' - G.C Windsor', desc: p.blurb }, '/shop') + `
<section class="section pdp" data-pdp data-product="${esc(p.id)}">
  ${mark('tr', 120)}
  <div class="wrap pdp__grid">
    <div class="pdp__media">
      <div class="pdp__main" data-pdp-main><img src="${img(p.gallery[0], 'f_auto,q_auto,w_1600,c_fit')}" alt="${esc(p.name)}"></div>
      <div class="pdp__thumbs">${thumbs}</div>
    </div>
    <div class="pdp__info">
      <p class="eyebrow">The Collection</p>
      <h1 class="display display--sm"${edf('products.json', `items.${i}.name`)}>${esc(p.name)}</h1>
      <p class="pdp__price">$${esc(p.price)}</p>
      <p class="lead"${edf('products.json', `items.${i}.blurb`)}>${esc(p.blurb)}</p>
      <p class="pdp__contents"${edf('products.json', `items.${i}.contents`)}>${esc(p.contents)}</p>
      <div class="pdp__sizes">
        <p class="pdp__lab">Size</p>
        <div class="sizes">${sizes}</div>
      </div>
      ${buy}
      <p class="pdp__ship"${edf('products.json', 'shippingNote')}>${esc(products.shippingNote)}</p>
    </div>
  </div>
</section>
<section class="section on-alt">
  ${amb('bl', 120)}
  <div class="wrap">
    <div class="prod-head reveal"><div><p class="eyebrow">More sets</p><h2 class="script" style="margin-top:16px">You may also like</h2></div></div>
    <div class="grid-3">${products.items.filter(x => x.id !== p.id).slice(0, 3).map(x => card(x, products.items.indexOf(x))).join('')}</div>
  </div>
</section>
` + foot();
    out('product/' + p.slug + '.html', html);
  });
}

/* ---------- ABOUT ---------- */
function buildAbout() {
  const A = pages.about;
  const story = A.story.body.map((para, i) => `<p class="lead"${ed(`about.story.body.${i}`)}>${esc(para)}</p>`).join('');
  const html = head({ title: A.seoTitle, desc: A.seoDesc }, '/about')
    + pageHero(A, 'pages.json', 'about', false) + `

<section class="section">
  ${mark('tr', 140)}
  <div class="wrap" style="max-width:820px;text-align:center">
    <p class="lead reveal"${ed('about.lead')}>${esc(A.lead)}</p>
    <div class="reveal" style="margin-top:2rem"><a class="btn btn--gold" href="${esc(A.ctaHref)}"><span${ed('about.ctaLabel')}>${esc(A.ctaLabel)}</span> <span class="arw-slot"></span></a></div>
  </div>
</section>

<section class="section on-alt">
  ${amb('tr', 135)}
  ${mark('bl', -130)}
  <div class="wrap split">
    <div class="split__copy reveal">
      <p class="eyebrow"${ed('about.story.eyebrow')}>${esc(A.story.eyebrow)}</p>
      <h2 class="script"${ed('about.story.title')}>${esc(A.story.title)}</h2>
      ${story}
    </div>
    <div class="split__media split__media--full reveal" data-delay="1">
      <img src="${img(A.story.image, 'f_auto,q_auto,w_1600')}" alt="The GC Windsor knot" loading="lazy">
    </div>
  </div>
</section>

<section id="founder" class="section founder on-dark">
  <img class="founder__art" data-amb data-speed="64" src="${img(pages.home.founder.artwork, 'f_auto,q_auto,w_1200')}" alt="" aria-hidden="true">
  <div class="wrap founder__split">
    <div class="founder__portrait reveal"><img src="${img(A.founder.portrait, 'f_auto,q_auto,w_1000')}" alt="${esc(A.founder.name)}" loading="lazy"></div>
    <div class="founder__inner reveal" data-delay="1">
      <p class="eyebrow"${ed('about.founder.eyebrow')}>${esc(A.founder.eyebrow)}</p>
      <h2 class="display display--sm"${ed('about.founder.name')}>${esc(A.founder.name)}</h2>
      <p class="founder__bio"${ed('about.founder.bio')}>${esc(A.founder.bio)}</p>
      <button class="btn btn--ondark" data-film type="button"><span${ed('about.founder.filmLabel')}>${esc(A.founder.filmLabel)}</span> <span class="arw-slot"></span></button>
    </div>
  </div>
</section>
` + foot();
  out('about.html', html);
}

/* ---------- CONTACT ----------
   The form now uses the same panel treatment as the newsletter. */
function buildContact() {
  const C = pages.contact;
  const html = head({ title: C.seoTitle, desc: C.seoDesc }, '/contact')
    + pageHero(C, 'pages.json', 'contact', true) + `

<section class="section">
  ${mark('tr', 140)}
  <div class="wrap news news--wide reveal">
    <p class="eyebrow eyebrow--center"${ed('contact.eyebrow')}>${esc(C.eyebrow)}</p>
    <h2 class="display display--sm" style="margin-top:16px"${ed('contact.title')}>${esc(C.title)}</h2>
    <p class="lead" style="margin:16px auto 0"${ed('contact.lead')}>${esc(C.lead)}</p>
    ${formOpen(C.accessKey, 'GC Windsor - contact form', 'news__form news__form--contact')}
      <div class="field"><label>First name</label><input type="text" name="first_name" required></div>
      <div class="field"><label>Last name</label><input type="text" name="last_name" required></div>
      <div class="field"><label>Email</label><input type="email" name="email" required></div>
      <div class="field"><label>Subject</label><input type="text" name="subject_line" required></div>
      <div class="field field--full"><label>Message</label><textarea name="message" rows="5" required></textarea></div>
      <button class="btn btn--solid news__submit" type="submit"${ed('contact.buttonLabel')}>${esc(C.buttonLabel)}</button>
    </form>
  </div>
</section>

<section class="section on-alt">
  ${amb('bl', 120)}
  <div class="wrap" style="text-align:center">
    <p class="eyebrow eyebrow--center"${ed('contact.instagramTitle')}>${esc(C.instagramTitle)}</p>
    <h2 class="script" style="margin-top:12px"><a href="${esc(G.social[0].href)}" target="_blank" rel="noopener"${ed('global.instagramHandle')}>${esc(G.instagramHandle)}</a></h2>
  </div>
</section>
` + foot();
  out('contact.html', html);
}

buildTheme();
buildHome();
buildGallery();
buildShop();
buildProducts();
buildAbout();
buildContact();

const combos = swapper.types[0].designs.reduce((n, d) => n + (d.status === 'available' ? d.colors.length : 0), 0)
             * swapper.types[1].designs.reduce((n, d) => n + (d.status === 'available' ? d.colors.length : 0), 0);
console.log('\nOK - GC Windsor build complete:', products.items.length, 'products,', gallery.items.length, 'gallery images,', combos, 'live combinations');
