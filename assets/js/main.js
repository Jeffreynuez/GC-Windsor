/* ============================================================
   GC WINDSOR — site behaviour (vanilla, no deps)
   Markup is server-rendered by scripts/build.js; this file wires
   interaction only. window.GCW is injected by build.js.
   The ?edit=1 visual-editor bridge lives at the bottom.
   ============================================================ */
(function () {
  'use strict';
  var GCW = window.GCW || {};
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  var ICONS = {
    bag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    menu: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    x: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    arw: '<svg class="arw" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
    chevL: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M15 18 9 12l6-6"/></svg>',
    chevR: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>',
    instagram: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    facebook: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V9.5c0-.3.2-.5.5-.5H14Z"/></svg>',
    x2: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 3h3l-6.6 7.5L21.7 21h-6l-4.3-5.6L6.4 21H3.3l7-8L2.6 3h6.1l3.9 5.1L17.5 3Zm-1 16h1.6L8 4.6H6.3L16.5 19Z"/></svg>',
    tiktok: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3c.3 2 1.5 3.5 3.5 3.8V10c-1.4 0-2.6-.4-3.6-1.1v5.7c0 3-2.2 5.4-5.2 5.4S5.5 17.6 5.5 14.7c0-2.7 2-4.9 4.7-5.2v3.1c-1 .2-1.7 1-1.7 2.1 0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.4V3H16Z"/></svg>'
  };

  /* ---- fill icon slots left by the renderer ---- */
  function fillIcons() {
    $all('.arw-slot').forEach(function (s) { s.outerHTML = ICONS.arw; });
    var cart = $('[data-cart]'); if (cart) cart.innerHTML = ICONS.bag;
    var burger = $('.nav__burger'); if (burger) burger.innerHTML = ICONS.menu;
    $all('.social [data-icon]').forEach(function (a) {
      var k = a.getAttribute('data-icon');
      a.innerHTML = ICONS[k === 'x' ? 'x2' : k] || '';
    });
  }

  /* ---- nav: solid on scroll + mobile overlay ---- */
  function initNav() {
    var host = $('[data-nav]');
    if (!host) return;
    var menu = el('div', 'menu');
    menu.innerHTML = '<button class="menu__close" aria-label="Close">' + ICONS.x + '</button>' +
      $all('.nav__link', host).map(function (a) {
        return '<a class="menu__link" href="' + a.getAttribute('href') + '">' + a.textContent.trim() + '</a>';
      }).join('');
    document.body.appendChild(menu);
    var burger = $('.nav__burger', host);
    if (burger) burger.addEventListener('click', function () { menu.classList.add('is-open'); document.body.style.overflow = 'hidden'; });
    $('.menu__close', menu).addEventListener('click', function () { menu.classList.remove('is-open'); document.body.style.overflow = ''; });

    function onScroll() { host.classList.toggle('is-solid', window.scrollY > 40); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ============================================================
     THE CUSTOMIZER — layered PNGs over the base photo.
     Swatch buttons are server-rendered; this wires the crossfade.
     ============================================================ */
  function initCustomizer() {
    var root = $('[data-customizer]');
    if (!root || !GCW.customizer) return;
    var cfg = GCW.customizer;
    var byId = function (arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return arr[0]; };

    var state = { knot: byId(cfg.knots, cfg.defaultKnot), tie: byId(cfg.ties, cfg.defaultTie) };

    var stage = $('[data-cz-stage]', root);
    stage.innerHTML =
      '<div class="cz__frame">' +
        '<img class="cz__base" data-cz-base alt="" src="' + (cfg.base || '') + '">' +
        '<img class="cz__layer" data-cz-tie-a alt=""><img class="cz__layer" data-cz-tie-b alt="">' +
        '<img class="cz__layer" data-cz-knot-a alt=""><img class="cz__layer" data-cz-knot-b alt="">' +
        '<span class="cz__gleam" data-cz-gleam></span>' +
      '</div>';

    var gleam = $('[data-cz-gleam]', stage);

    /* Run the gold gleam across the frame, in step with the wipe. */
    function runGleam() {
      if (reduceMotion || !gleam) return;
      gleam.classList.remove('is-running');
      void gleam.offsetWidth;               // force reflow so the animation restarts
      gleam.classList.add('is-running');
    }

    /* Two <img> per part. The incoming one is revealed LEFT-TO-RIGHT by a
       travelling clip-path edge; the outgoing one fades out behind it. */
    function swap(partA, partB, src, animate) {
      var a = $(partA, stage), b = $(partB, stage);
      if (!src) { a.classList.remove('is-on', 'is-off'); b.classList.remove('is-on', 'is-off'); return; }

      var incoming = a.classList.contains('is-on') ? b : a;
      var outgoing = a.classList.contains('is-on') ? a : b;
      if (incoming.getAttribute('src') === src && incoming.classList.contains('is-on')) return;

      var probe = new Image();
      probe.onload = function () {
        incoming.src = src;

        if (!animate || reduceMotion) {
          incoming.classList.add('is-on');
          incoming.classList.remove('is-off');
          outgoing.classList.remove('is-on', 'is-off');
          return;
        }

        /* reset the incoming layer to a closed wipe, then open it next frame */
        incoming.classList.remove('is-on', 'is-off');
        void incoming.offsetWidth;
        outgoing.classList.remove('is-on');
        outgoing.classList.add('is-off');    /* holds, then fades behind the wipe */

        requestAnimationFrame(function () {
          incoming.classList.add('is-on');
        });
      };
      probe.src = src;
    }

    function apply(kind) {
      var animate = !!kind;                       /* no wipe on first paint */
      if (!kind || kind === 'knot') swap('[data-cz-knot-a]', '[data-cz-knot-b]', state.knot.img, animate);
      if (!kind || kind === 'tie') swap('[data-cz-tie-a]', '[data-cz-tie-b]', state.tie.img, animate);
      if (animate) runGleam();
      var kn = $('[data-cz-knotname]', root), tn = $('[data-cz-tiename]', root), cb = $('[data-cz-combo]', root);
      if (kn) kn.textContent = state.knot.name;
      if (tn) tn.textContent = state.tie.name;
      if (cb) cb.textContent = state.knot.name + ' knot · ' + state.tie.name + ' tie';

      /* point the CTA at the closest matching product, if there is one */
      var cta = $('[data-cz-cta]', root);
      if (cta && cfg.products) {
        var exact = cfg.products.filter(function (p) { return p.knot === state.knot.id && p.tie === state.tie.id; })[0];
        var near = cfg.products.filter(function (p) { return p.knot === state.knot.id; })[0];
        var hit = exact || near;
        cta.setAttribute('href', hit ? '/product/' + hit.slug : '/shop');
      }
    }

    $all('[data-sw]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var kind = b.getAttribute('data-sw');
        var id = b.getAttribute('data-id');
        var list = kind === 'knot' ? cfg.knots : cfg.ties;
        if (state[kind].id === id) return;
        state[kind] = byId(list, id);
        $all('[data-sw="' + kind + '"]', root).forEach(function (s) { s.classList.remove('is-active'); });
        b.classList.add('is-active');
        apply(kind);
      });
    });

    apply();
  }

  /* ---- gallery lightbox (tiles are server-rendered) ---- */
  function initLightbox() {
    var tiles = $all('[data-lb]');
    if (!tiles.length) return;
    var srcs = tiles.map(function (t) { return t.getAttribute('data-full'); });
    var box = el('div', 'lightbox');
    box.innerHTML = '<button class="lightbox__close" aria-label="Close">' + ICONS.x + '</button>' +
      '<button class="lightbox__nav lightbox__nav--prev" aria-label="Previous">' + ICONS.chevL + '</button>' +
      '<img alt="">' +
      '<button class="lightbox__nav lightbox__nav--next" aria-label="Next">' + ICONS.chevR + '</button>';
    document.body.appendChild(box);
    var img = $('img', box), idx = 0;
    function show(i) { idx = (i + srcs.length) % srcs.length; img.src = srcs[idx]; }
    function open(i) { show(i); box.classList.add('is-open'); document.body.style.overflow = 'hidden'; }
    function close() { box.classList.remove('is-open'); document.body.style.overflow = ''; }
    tiles.forEach(function (t) {
      t.addEventListener('click', function () {
        if (/[?&]edit=1/.test(location.search)) return; // let the editor select it instead
        open(+t.getAttribute('data-lb'));
      });
    });
    $('.lightbox__close', box).addEventListener('click', close);
    $('.lightbox__nav--prev', box).addEventListener('click', function () { show(idx - 1); });
    $('.lightbox__nav--next', box).addEventListener('click', function () { show(idx + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ---- scroll reveal + parallax ---- */
  function initReveal() {
    var items = $all('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) { items.forEach(function (i) { i.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (i) { io.observe(i); });
  }

  function initParallax() {
    var layers = $all('[data-parallax] img');   /* photography — moves as a % of its own height */
    var motifs = $all('[data-amb]');            /* the rooster marks — move in px, by data-speed */
    if (reduceMotion || (!layers.length && !motifs.length)) return;

    var ticking = false;
    function update() {
      var vh = window.innerHeight;

      layers.forEach(function (img) {
        var r = img.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var progress = (r.top + r.height / 2 - vh / 2) / vh;   /* -0.5 .. 0.5 */
        img.style.transform = 'translateY(' + (progress * -9).toFixed(2) + '%)';
      });

      motifs.forEach(function (m) {
        var host = m.closest('section') || m.parentElement;
        var r = host.getBoundingClientRect();
        if (r.bottom < -400 || r.top > vh + 400) return;
        var speed = parseFloat(m.getAttribute('data-speed') || '100');
        var progress = (r.top + r.height / 2 - vh / 2) / vh;
        var shiftY = progress * -(speed / 100) * 90;           /* px */
        var base = m.classList.contains('founder__art') ? ' translateY(-50%)' : '';
        m.style.transform = 'translate3d(0,' + shiftY.toFixed(1) + 'px,0)' + base;
      });

      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ---- forms: local "thank you" when no Web3Forms key is wired yet ---- */
  function initForms() {
    $all('form[data-demo]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = $('button[type="submit"], .btn', f);
        if (btn) {
          var t = btn.textContent;
          btn.textContent = 'Thank you';
          btn.disabled = true;
          setTimeout(function () { btn.textContent = t; btn.disabled = false; f.reset(); }, 2400);
        }
      });
    });
  }

  /* ---- product detail ---- */
  function initPDP() {
    var pdp = $('[data-pdp]');
    if (!pdp) return;
    var mainImg = $('[data-pdp-main] img', pdp);
    $all('[data-pdp-thumb]', pdp).forEach(function (th) {
      th.addEventListener('click', function () {
        $all('[data-pdp-thumb]', pdp).forEach(function (x) { x.classList.remove('is-active'); });
        th.classList.add('is-active');
        mainImg.src = $('img', th).getAttribute('data-full');
      });
    });
    $all('[data-size]', pdp).forEach(function (s) {
      s.addEventListener('click', function () {
        $all('[data-size]', pdp).forEach(function (x) { x.classList.remove('is-active'); });
        s.classList.add('is-active');
      });
    });
    var q = $('[data-qty-val]', pdp), n = 1;
    if (q) {
      $('[data-qty-dec]', pdp).addEventListener('click', function () { n = Math.max(1, n - 1); q.textContent = n; });
      $('[data-qty-inc]', pdp).addEventListener('click', function () { n = n + 1; q.textContent = n; });
    }

    /* Stripe Checkout — only reachable when sales are live */
    var buy = $('[data-checkout]', pdp);
    if (buy) {
      buy.addEventListener('click', function () {
        var size = ($('[data-size].is-active', pdp) || {}).getAttribute
          ? $('[data-size].is-active', pdp).getAttribute('data-size') : 'regular';
        buy.disabled = true;
        buy.textContent = 'Redirecting…';
        fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: buy.getAttribute('data-checkout'),
            size: size,
            qty: parseInt(q ? q.textContent : '1', 10) || 1
          })
        })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.url) { location.href = d.url; return; }
            throw new Error(d.error || 'Checkout unavailable');
          })
          .catch(function (err) {
            buy.disabled = false;
            buy.textContent = 'Add to cart';
            alert(err.message);
          });
      });
    }
  }

  /* ---- 'Watch the film' lightbox ---- */
  function initFilm() {
    var triggers = $all('[data-film]');
    if (!triggers.length || !GCW.film) return;
    var box = el('div', 'lightbox');
    box.innerHTML = '<button class="lightbox__close" aria-label="Close">' + ICONS.x + '</button>' +
      '<video controls playsinline preload="none" style="max-width:100%;max-height:86vh" poster="' + (GCW.film.poster || '') + '">' +
      '<source src="' + (GCW.film.src || '') + '" type="video/mp4"></video>';
    document.body.appendChild(box);
    var v = $('video', box);
    function open() { box.classList.add('is-open'); document.body.style.overflow = 'hidden'; try { v.play(); } catch (e) {} }
    function close() { box.classList.remove('is-open'); document.body.style.overflow = ''; v.pause(); }
    triggers.forEach(function (t) { t.addEventListener('click', open); });
    $('.lightbox__close', box).addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('is-open')) close(); });
  }

  /* ---- hero video: fade in only once it can actually play ---- */
  function initHero() {
    var v = $('[data-hero-video]');
    if (!v) return;
    v.style.opacity = '0';
    v.style.transition = 'opacity .9s var(--ease)';
    function reveal() { v.style.opacity = '1'; }
    v.addEventListener('canplay', reveal);
    v.addEventListener('loadeddata', reveal);
    if (v.readyState >= 2) reveal();
  }

  function boot() {
    fillIcons();
    initHero();
    initNav();
    initCustomizer();
    initLightbox();
    initPDP();
    initFilm();
    initForms();
    initReveal();
    initParallax();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ============================================================
   /admin VISUAL-EDITOR BRIDGE
   Only runs inside the CMS iframe with ?edit=1. Speaks the same
   {jrd:...} postMessage protocol as the other managed sites.
   ============================================================ */
(function () {
  'use strict';
  if (!/[?&]edit=1/.test(location.search) || window.parent === window) return;

  var st = document.createElement('style');
  st.textContent =
    '[data-edit],[data-edit-item]{cursor:pointer}' +
    '[data-edit]:hover{outline:2px dashed #c9a227;outline-offset:2px}' +
    '[data-edit-item]:hover{outline:2px dashed #e3c766;outline-offset:3px}' +
    '[data-edit].jrd-sel{outline:2px solid #c9a227;outline-offset:2px}';
  document.head.appendChild(st);

  var selEl = null;
  function select(el) {
    if (selEl) { selEl.classList.remove('jrd-sel'); selEl.removeAttribute('contenteditable'); }
    selEl = el;
    if (selEl) { selEl.classList.add('jrd-sel'); selEl.setAttribute('contenteditable', 'true'); selEl.focus(); }
  }

  document.addEventListener('click', function (e) {
    var leaf = e.target.closest('[data-edit]');
    var item = e.target.closest('[data-edit-item]');
    if (!leaf && !item) { select(null); parent.postMessage({ jrd: 'deselect' }, '*'); return; }
    e.preventDefault();
    e.stopPropagation();
    select(leaf || null);
    parent.postMessage({
      jrd: 'select',
      edit: leaf ? leaf.getAttribute('data-edit') : null,
      item: item ? item.getAttribute('data-edit-item') : null,
      text: leaf ? leaf.textContent : null
    }, '*');
  }, true);

  document.addEventListener('input', function (e) {
    if (e.target === selEl && selEl && selEl.hasAttribute('data-edit')) {
      parent.postMessage({ jrd: 'text', edit: selEl.getAttribute('data-edit'), value: selEl.textContent }, '*');
    }
  }, true);

  window.addEventListener('message', function (ev) {
    var d = ev.data || {};
    if (d.jrd === 'apply' && d.edit) {
      document.querySelectorAll('[data-edit="' + d.edit + '"]').forEach(function (el) {
        if (el !== selEl || !el.isContentEditable) el.textContent = d.value;
      });
    }
    if (d.jrd === 'styleapply' && d.edit) {
      document.querySelectorAll('[data-edit="' + d.edit + '"]').forEach(function (el) {
        if (d.color) el.style.setProperty('color', d.color, 'important'); else el.style.removeProperty('color');
        if (d.align) el.style.setProperty('text-align', d.align, 'important'); else el.style.removeProperty('text-align');
      });
    }
  });

  parent.postMessage({ jrd: 'ready', page: location.pathname }, '*');
})();
