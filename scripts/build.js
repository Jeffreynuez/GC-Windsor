#!/usr/bin/env node
/* GC Windsor — data-driven renderer for the standalone JRD CMS.
   Content: data/*.json (edited via https://jrd-animation-cms.vercel.app/admin).
   Layout: this file. Design tokens: data/theme.json -> assets/css/theme.css.
   Stamps data-edit="<file>#<dot.path>" on text leaves and
   data-edit-item="<file>#<arr>#<idx>" on array-item roots for the visual editor
   (see the ?edit=1 bridge at the bottom of assets/js/main.js). */
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

/* CDN:<public_id> -> a transformed Cloudinary URL. Anything else passes through. */
const img = (u, t) => {
  if (!u) return '';
  u = String(u);
  if (!u.startsWith('CDN:')) return u;
  return IMG + (t || 'f_auto,q_auto') + '/' + u.slice(4);
};
const vid = (u, t) => {
  if (!u) return '';
  u = String(u);
  if (!u.startsWith('CDN:')) return u;
  return VID + (t || 'q_auto') + '/' + u.slice(4) + '.mp4';
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

/* ---------- theme compiler: theme.json -> assets/css/theme.css ---------- */
function buildTheme() {
  let root = '';
  for (const k in theme) root += `  --${k}: ${theme[k]};\n`;
  out('assets/css/theme.css',
    '/* GENERATED from data/theme.json — edit via /admin -> Theme. Do not hand-edit. */\n:root {\n' + root + '}\n');
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

const foot = () => `${footerHTML()}
<script>window.GCW=${JSON.stringify({
  brand: G.brand,
  salesPaused: products.salesPaused,
  customizer: {
    base: img(swapper.base, 'f_auto,q_auto,w_1600'),
    knots: swapper.knots.map(k => ({ id: k.id, name: k.name, colors: k.colors, img: img(k.img, 'f_auto,q_auto,w_1600') })),
    ties: swapper.ties.map(t => ({ id: t.id, name: t.name, colors: t.colors, img: img(t.img, 'f_auto,q_auto,w_1600') })),
    defaultKnot: swapper.defaultKnot,
    defaultTie: swapper.defaultTie,
    products: products.items.map(p => ({ id: p.id, slug: p.slug, knot: p.knot, tie: p.tie, name: p.name }))
  },
  film: { src: vid(pages.about.founder.film), poster: img(pages.about.founder.filmPoster, 'f_auto,q_auto,w_1600') }
})}</script>
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
    <a class="nav__brand" href="/"${ed('global.brand')}>${esc(G.brand)}</a>
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
        <img class="footer__logo" src="${img(G.emblem, 'f_auto,q_auto,w_220')}" alt="GC Windsor emblem">
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

/* a reusable product card */
function card(p, i) {
  const paused = products.salesPaused || p.status === 'coming-soon';
  const foot = paused
    ? `<span class="card__name"${edf('products.json', `items.${i}.name`)}>${esc(p.name)}</span><span class="badge">Coming soon</span>`
    : `<span class="card__name"${edf('products.json', `items.${i}.name`)}>${esc(p.name)}</span><span class="card__price">$${esc(p.price)}</span>`;
  return `<a class="card reveal" href="/product/${esc(p.slug)}"${edi('products.json', 'items', i)}>
  <div class="card__media">${paused ? '<span class="badge badge--onmedia">Coming soon</span>' : ''}<img src="${img(p.image, 'f_auto,q_auto,w_900,c_fill,ar_4:5')}" alt="${esc(p.name)}" loading="lazy"></div>
  <div class="card__body">${foot}</div>
</a>`;
}

/* ---------- HOME ---------- */
function buildHome() {
  const H = pages.home;
  const sw = (items, kind, file) => items.map((it, i) => {
    const dot = it.colors.length > 1
      ? `linear-gradient(135deg, ${it.colors[0]} 0 50%, ${it.colors[1]} 50% 100%)`
      : it.colors[0];
    const active = (kind === 'knot' ? swapper.defaultKnot : swapper.defaultTie) === it.id;
    return `<button type="button" class="sw${active ? ' is-active' : ''}" data-sw="${kind}" data-id="${esc(it.id)}" aria-label="${esc(it.name)}"${edi(file, kind === 'knot' ? 'knots' : 'ties', i)}><span class="sw__dot" style="background:${dot}"></span><span class="sw__tip">${esc(it.name)}</span></button>`;
  }).join('');

  const html = head({ title: H.seoTitle, desc: H.seoDesc }, '/') + `

<section id="hero" class="hero">
  <img class="hero__media" src="${img(H.hero.poster, 'f_auto,q_auto,w_1920')}" alt="" aria-hidden="true">
  <video class="hero__media" data-hero-video autoplay muted loop playsinline preload="metadata" poster="${img(H.hero.poster, 'f_auto,q_auto,w_1920')}">
    <source src="${vid(H.hero.videoMobile)}" type="video/mp4" media="(max-width: 860px)">
    <source src="${vid(H.hero.video)}" type="video/mp4">
  </video>
  <div class="hero__scrim"></div>
  <a class="hero__cue" href="#positioning" aria-label="Scroll"><span${ed('home.hero.cue')}>${esc(H.hero.cue)}</span><span class="line"></span></a>
</section>

<section id="positioning" class="section">
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
  <div class="wrap split">
    <div class="split__copy reveal">
      <p class="eyebrow"${ed('home.split.eyebrow')}>${esc(H.split.eyebrow)}</p>
      <h2 class="display display--sm"${ed('home.split.title')}>${esc(H.split.title)}</h2>
      <p class="lead"${ed('home.split.lead')}>${esc(H.split.lead)}</p>
      <div style="margin-top:.5rem"><a class="btn btn--gold" href="${esc(H.split.ctaHref)}"><span${ed('home.split.ctaLabel')}>${esc(H.split.ctaLabel)}</span> <span class="arw-slot"></span></a></div>
    </div>
    <div class="split__media reveal" data-delay="1" data-parallax>
      <img src="${img(H.split.image, 'f_auto,q_auto,w_1200')}" alt="A GC knot and tie, in detail" loading="lazy">
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
      <div class="cz__controls reveal" data-delay="1">
        <div class="cz__rowlabel"><span class="k"${edf('swapper.json', 'knotsLabel')}>${esc(swapper.knotsLabel)}</span><span class="v" data-cz-knotname></span></div>
        <div class="cz__row" data-cz-knots>${sw(swapper.knots, 'knot', 'swapper.json')}</div>
        <div class="cz__rowlabel"><span class="k"${edf('swapper.json', 'tiesLabel')}>${esc(swapper.tiesLabel)}</span><span class="v" data-cz-tiename></span></div>
        <div class="cz__row" data-cz-ties>${sw(swapper.ties, 'tie', 'swapper.json')}</div>
        <div class="cz__combo">
          <p class="now">Your combination</p>
          <p class="name" data-cz-combo></p>
          <a class="btn btn--gold btn--ondark" data-cz-cta href="/shop"><span${edf('swapper.json', 'ctaLabel')}>${esc(swapper.ctaLabel)}</span> <span class="arw-slot"></span></a>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="shop" class="section">
  <div class="wrap">
    <div class="prod-head reveal">
      <div>
        <p class="eyebrow"${ed('home.shop.eyebrow')}>${esc(H.shop.eyebrow)}</p>
        <h2 class="display display--sm" style="margin-top:16px"${ed('home.shop.title')}>${esc(H.shop.title)}</h2>
      </div>
      <a class="btn" href="${esc(H.shop.ctaHref)}"><span${ed('home.shop.ctaLabel')}>${esc(H.shop.ctaLabel)}</span> <span class="arw-slot"></span></a>
    </div>
    <div class="grid-3">${products.items.map(card).join('')}</div>
  </div>
</section>

<section id="founder" class="section founder on-dark">
  <img class="founder__art" src="${img(H.founder.artwork, 'f_auto,q_auto,w_1000')}" alt="" aria-hidden="true">
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
  <div class="wrap">
    <div class="reveal" style="margin-bottom:var(--sp-5)">
      <p class="eyebrow"${edf('gallery.json', 'eyebrow')}>${esc(gallery.eyebrow)}</p>
      <h2 class="display display--sm" style="margin-top:16px"${edf('gallery.json', 'title')}>${esc(gallery.title)}</h2>
    </div>
    <div class="mosaic reveal" data-gallery>${gallery.items.map((g, i) => `<div class="mtile${g.span === 'tall' ? ' mtile--tall' : g.span === 'wide' ? ' mtile--wide' : ''}" data-lb="${i}" data-full="${img(g.src, 'f_auto,q_auto,w_1800')}"${edi('gallery.json', 'items', i)}><img src="${img(g.src, 'f_auto,q_auto,w_800')}" alt="${esc(g.alt)}" loading="lazy"></div>`).join('')}</div>
  </div>
</section>

<section id="newsletter" class="section">
  <div class="wrap news reveal">
    <p class="eyebrow eyebrow--center"${ed('home.newsletter.eyebrow')}>${esc(H.newsletter.eyebrow)}</p>
    <h2 class="display display--sm" style="margin-top:16px"${ed('home.newsletter.title')}>${esc(H.newsletter.title)}</h2>
    <p class="lead" style="margin:16px auto 0"${ed('home.newsletter.lead')}>${esc(H.newsletter.lead)}</p>
    ${formOpen(H.newsletter.accessKey, 'GC Windsor — newsletter signup')}
      <div class="field"><label>First name</label><input type="text" name="first_name" autocomplete="given-name"></div>
      <div class="field"><label>Last name</label><input type="text" name="last_name" autocomplete="family-name"></div>
      <div class="field"><label>Email</label><input type="email" name="email" required autocomplete="email"></div>
      <button class="btn btn--solid" type="submit"${ed('home.newsletter.buttonLabel')}>${esc(H.newsletter.buttonLabel)}</button>
    </form>
    <p class="news__fine"${ed('home.newsletter.fine')}>${esc(H.newsletter.fine)}</p>
  </div>
</section>

<section id="contact-cta" class="cta-bleed">
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

/* Web3Forms-style form opener; falls back to a local "thank you" when no key is set. */
function formOpen(key, subject) {
  const cls = 'news__form';
  if (!key) return `<form class="${cls}" data-demo>`;
  return `<form class="${cls}" action="https://api.web3forms.com/submit" method="POST">
      <input type="hidden" name="access_key" value="${esc(key)}">
      <input type="hidden" name="subject" value="${esc(subject)}">
      <input type="checkbox" name="botcheck" class="hidden" style="display:none">`;
}

/* ---------- SHOP ---------- */
function buildShop() {
  const S = pages.shop;
  const html = head({ title: S.seoTitle, desc: S.seoDesc }, '/shop') + `
<section class="page-hero">
  <img class="page-hero__img" src="${img(S.hero, 'f_auto,q_auto,w_1920')}" alt="">
  <div class="page-hero__scrim"></div>
  <div class="page-hero__inner">
    <p class="eyebrow eyebrow--center" style="color:var(--gold-light)"${ed('shop.eyebrow')}>${esc(S.eyebrow)}</p>
    <h1 class="display display--sm"${ed('shop.title')}>${esc(S.title)}</h1>
  </div>
</section>
<section class="section">
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
    const thumbs = p.gallery.map((g, j) => `<button class="pdp__thumb${j === 0 ? ' is-active' : ''}" data-pdp-thumb type="button"><img src="${img(g, 'f_auto,q_auto,w_200,c_fill,ar_1:1')}" data-full="${img(g, 'f_auto,q_auto,w_1400')}" alt=""></button>`).join('');
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
           <div class="qty"><button data-qty-dec type="button" aria-label="Less">−</button><span data-qty-val>1</span><button data-qty-inc type="button" aria-label="More">+</button></div>
           <button class="btn btn--solid btn--block" data-checkout="${esc(p.id)}" type="button">Add to cart</button>
         </div>`;

    const html = head({ title: p.name + ' — G.C Windsor', desc: p.blurb }, '/shop') + `
<section class="section pdp" data-pdp data-product="${esc(p.id)}">
  <div class="wrap pdp__grid">
    <div class="pdp__media">
      <div class="pdp__main" data-pdp-main><img src="${img(p.gallery[0], 'f_auto,q_auto,w_1400')}" alt="${esc(p.name)}"></div>
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
  <div class="wrap">
    <div class="prod-head reveal"><div><p class="eyebrow">More sets</p><h2 class="display display--sm" style="margin-top:16px">You may also like</h2></div></div>
    <div class="grid-3">${products.items.filter(x => x.id !== p.id).slice(0, 3).map((x) => card(x, products.items.indexOf(x))).join('')}</div>
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
  const html = head({ title: A.seoTitle, desc: A.seoDesc }, '/about') + `
<section class="page-hero">
  <img class="page-hero__img" src="${img(A.hero, 'f_auto,q_auto,w_1920')}" alt="">
  <div class="page-hero__scrim"></div>
  <div class="page-hero__inner">
    <p class="eyebrow eyebrow--center" style="color:var(--gold-light)"${ed('about.eyebrow')}>${esc(A.eyebrow)}</p>
    <h1 class="display display--sm"${ed('about.title')}>${esc(A.title)}</h1>
  </div>
</section>

<section class="section">
  <div class="wrap" style="max-width:820px;text-align:center">
    <p class="lead reveal"${ed('about.lead')}>${esc(A.lead)}</p>
    <div class="reveal" style="margin-top:2rem"><a class="btn btn--gold" href="${esc(A.ctaHref)}"><span${ed('about.ctaLabel')}>${esc(A.ctaLabel)}</span> <span class="arw-slot"></span></a></div>
  </div>
</section>

<section class="section on-alt">
  <div class="wrap split">
    <div class="split__copy reveal">
      <p class="eyebrow"${ed('about.story.eyebrow')}>${esc(A.story.eyebrow)}</p>
      <h2 class="display display--sm"${ed('about.story.title')}>${esc(A.story.title)}</h2>
      ${story}
    </div>
    <div class="split__media reveal" data-delay="1" data-parallax>
      <img src="${img(A.story.image, 'f_auto,q_auto,w_1200')}" alt="The GC Windsor knot" loading="lazy">
    </div>
  </div>
</section>

<section id="founder" class="section founder on-dark">
  <img class="founder__art" src="${img(pages.home.founder.artwork, 'f_auto,q_auto,w_1000')}" alt="" aria-hidden="true">
  <div class="wrap founder__split">
    <div class="founder__portrait reveal"><img src="${img(A.founder.portrait, 'f_auto,q_auto,w_900')}" alt="${esc(A.founder.name)}" loading="lazy"></div>
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

/* ---------- CONTACT ---------- */
function buildContact() {
  const C = pages.contact;
  const html = head({ title: C.seoTitle, desc: C.seoDesc }, '/contact') + `
<section class="page-hero page-hero--short">
  <img class="page-hero__img" src="${img(C.hero, 'f_auto,q_auto,w_1920')}" alt="">
  <div class="page-hero__scrim"></div>
  <div class="page-hero__inner">
    <p class="eyebrow eyebrow--center" style="color:var(--gold-light)"${ed('contact.eyebrow')}>${esc(C.eyebrow)}</p>
    <h1 class="display display--sm"${ed('contact.title')}>${esc(C.title)}</h1>
  </div>
</section>

<section class="section">
  <div class="wrap news reveal">
    <p class="lead" style="margin-bottom:2rem"${ed('contact.lead')}>${esc(C.lead)}</p>
    ${formOpen(C.accessKey, 'GC Windsor — contact form')}
      <div class="field"><label>First name</label><input type="text" name="first_name" required></div>
      <div class="field"><label>Last name</label><input type="text" name="last_name" required></div>
      <div class="field"><label>Email</label><input type="email" name="email" required></div>
      <div class="field"><label>Subject</label><input type="text" name="subject_line" required></div>
      <div class="field field--full"><label>Message</label><textarea name="message" rows="5" required></textarea></div>
      <button class="btn btn--solid" type="submit"${ed('contact.buttonLabel')}>${esc(C.buttonLabel)}</button>
    </form>
  </div>
</section>

<section class="section on-alt">
  <div class="wrap" style="text-align:center">
    <p class="eyebrow eyebrow--center"${ed('contact.instagramTitle')}>${esc(C.instagramTitle)}</p>
    <h2 class="display display--sm" style="margin-top:12px"><a href="${esc(G.social[0].href)}" target="_blank" rel="noopener"${ed('global.instagramHandle')}>${esc(G.instagramHandle)}</a></h2>
  </div>
</section>
` + foot();
  out('contact.html', html);
}

buildTheme();
buildHome();
buildShop();
buildProducts();
buildAbout();
buildContact();
console.log('\n✓ GC Windsor build complete —', products.items.length, 'products,', gallery.items.length, 'gallery items,', swapper.knots.length, 'knots ×', swapper.ties.length, 'ties =', swapper.knots.length * swapper.ties.length, 'combinations');
