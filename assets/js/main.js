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
    var types = cfg.types || [];
    if (!types.length) return;

    var typeById = {};
    types.forEach(function (t) { typeById[t.id] = t; });
    var typeIndex = function (t) { return types.indexOf(t); };
    function partKeyOf(typeKey) { return typeKey.replace(/s$/, ''); }   /* 'knots' -> 'knot' */
    function firstAvailable(t) { for (var i = 0; i < t.designs.length; i++) if (t.designs[i].status === 'available') return t.designs[i]; return t.designs[0]; }
    function designById(t, id) { for (var i = 0; i < t.designs.length; i++) if (t.designs[i].id === id) return t.designs[i]; return null; }
    function colorById(d, id) { if (!d || !d.colors) return null; for (var i = 0; i < d.colors.length; i++) if (d.colors[i].id === id) return d.colors[i]; return null; }
    function swatchBg(cols) {
      if (!cols || !cols.length) return '#333';
      if (cols.length === 1) return cols[0];
      return 'linear-gradient(135deg, ' + cols[0] + ' 0 50%, ' + cols[1] + ' 50% 100%)';
    }

    /* state per type: selDesignId = tab currently shown; appDesignId/appColorId
       = what is actually applied to the model (always an AVAILABLE design). */
    var state = {};
    types.forEach(function (t) {
      var avail = firstAvailable(t);
      var defId = t.id === 'knots' ? cfg.defaultKnotColor : cfg.defaultTieColor;
      var col = colorById(avail, defId) || (avail.colors && avail.colors[0]) || null;
      state[t.id] = { selDesignId: avail.id, appDesignId: avail.id, appColorId: col ? col.id : null };
    });

    /* ---- stage: base + two <img> per part + gleam + horizontal-blur filters ---- */
    var stage = $('[data-cz-stage]', root);
    stage.innerHTML =
      '<div class="cz__frame">' +
        '<img class="cz__base" data-cz-base alt="" src="' + (cfg.base || '') + '">' +
        '<img class="cz__layer" data-cz-tie-a alt=""><img class="cz__layer" data-cz-tie-b alt="">' +
        '<img class="cz__layer" data-cz-knot-a alt=""><img class="cz__layer" data-cz-knot-b alt="">' +
        '<span class="cz__gleam" data-cz-gleam></span>' +
      '</div>' +
      '<svg class="cz__filters" width="0" height="0" aria-hidden="true" focusable="false">' +
        '<filter id="czBlurKnot" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur data-cz-blur="knot" in="SourceGraphic" stdDeviation="0 0"></feGaussianBlur></filter>' +
        '<filter id="czBlurTie" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur data-cz-blur="tie" in="SourceGraphic" stdDeviation="0 0"></feGaussianBlur></filter>' +
      '</svg>';

    var PART = {
      knot: { a: '[data-cz-knot-a]', b: '[data-cz-knot-b]', blur: stage.querySelector('[data-cz-blur="knot"]') },
      tie:  { a: '[data-cz-tie-a]',  b: '[data-cz-tie-b]',  blur: stage.querySelector('[data-cz-blur="tie"]') }
    };

    function setBlur(node, px) { if (node) node.setAttribute('stdDeviation', (px > 0 ? px.toFixed(2) : '0') + ' 0'); }
    function resetLayer(el) {
      el.classList.remove('is-on', 'is-anim', 'is-fade');
      el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; el.style.filter = ''; el.style.zIndex = '';
    }

    /* selecting a colour CROSSFADES: the old layer holds still underneath while
       the new one fades in on top — the same quiet dissolve as the drag scrub,
       no sliding, no motion blur. */
    function swap(partKey, src, animate) {
      var P = PART[partKey];
      var a = $(P.a, stage), b = $(P.b, stage);
      if (!src) { resetLayer(a); resetLayer(b); setBlur(P.blur, 0); return; }

      var incoming = a.classList.contains('is-on') ? b : a;
      var outgoing = a.classList.contains('is-on') ? a : b;
      if (incoming.getAttribute('src') === src && incoming.classList.contains('is-on')) return;

      var probe = new Image();
      probe.onload = function () {
        incoming.src = src;

        if (!animate || reduceMotion) {
          resetLayer(outgoing);
          incoming.classList.remove('is-anim', 'is-fade');
          incoming.style.transition = ''; incoming.style.transform = ''; incoming.style.opacity = ''; incoming.style.filter = '';
          incoming.classList.add('is-on');
          return;
        }

        /* WAIT for the layer to actually hold the new bitmap before showing
           it — an <img> keeps painting its previous image until the new src
           is decoded, which is what caused the old colour to flash for a
           frame at the start of the fade. */
        var begin = function () {
          if (incoming.getAttribute('src') !== src) return;   /* superseded by a newer selection */
          outgoing.style.zIndex = '1';
          incoming.style.zIndex = '2';
          incoming.classList.remove('is-anim', 'is-fade');
          incoming.style.transition = 'none'; incoming.style.transform = ''; incoming.style.filter = '';
          incoming.style.opacity = '0';
          incoming.classList.add('is-on');
          outgoing.classList.remove('is-anim', 'is-fade');
          outgoing.style.transition = 'none'; outgoing.style.opacity = '1';
          void incoming.offsetWidth;

          /* a quick TRUE dissolve: the old colour fades OUT as the new one
             fades in — the old one never lingers underneath. */
          requestAnimationFrame(function () {
            incoming.classList.add('is-fade');
            outgoing.classList.add('is-fade');
            incoming.style.transition = ''; incoming.style.opacity = '1';
            outgoing.style.transition = ''; outgoing.style.opacity = '0';
            var settled = false;
            var done = function (e) {
              if (settled) return;
              if (e && e.propertyName && e.propertyName !== 'opacity') return;
              settled = true;
              incoming.removeEventListener('transitionend', done);
              incoming.classList.remove('is-fade');
              incoming.style.opacity = ''; incoming.style.zIndex = '';
              resetLayer(outgoing);
            };
            incoming.addEventListener('transitionend', done);
            setTimeout(done, 450);   /* safety: settle even if transitionend is swallowed */
          });
        };
        if (incoming.decode) incoming.decode().then(begin, begin);
        else begin();
      };
      probe.src = src;
    }

    /* ---- paint the model from applied state ---- */
    function applyStage(onlyPart, instant) {
      var animate = !!onlyPart && !instant;
      types.forEach(function (t) {
        var pk = partKeyOf(t.id);
        if (onlyPart && onlyPart !== pk) return;
        var st = state[t.id];
        var d = designById(t, st.appDesignId);
        var c = colorById(d, st.appColorId);
        swap(pk, c ? c.img : null, animate);
      });
      updatePanel();
    }

    function updatePanel() {
      var kt = typeById['knots'], tt = typeById['ties'];
      var ks = state['knots'], ts = state['ties'];
      var kd = designById(kt, ks.appDesignId), kc = colorById(kd, ks.appColorId);
      var td = designById(tt, ts.appDesignId), tc = colorById(td, ts.appColorId);
      var kn = $('[data-cz-knotname]', root), tn = $('[data-cz-tiename]', root);
      var cb = $('[data-cz-combo]', root), cnt = $('[data-cz-count]', root);
      if (kn) kn.textContent = kc ? kc.name : '';
      if (tn) tn.textContent = tc ? tc.name : '';
      if (cb) cb.textContent =
        (kd ? kd.label : '') + ' · ' + (kc ? kc.name : '') + ' knot — ' +
        (td ? td.label : '') + ' · ' + (tc ? tc.name : '') + ' tie';

      if (cnt) {
        var knotN = availColorCount(kt), tieN = availColorCount(tt);
        cnt.innerHTML = '<em>' + (knotN * tieN) + '</em> combinations available today — more designs coming.';
      }

      var cta = $('[data-cz-cta]', root);
      if (cta && cfg.products) {
        var exact = cfg.products.filter(function (p) { return p.knot === ks.appColorId && p.tie === ts.appColorId; })[0];
        var near = cfg.products.filter(function (p) { return p.knot === ks.appColorId; })[0];
        var hit = exact || near;
        cta.setAttribute('href', hit ? '/product/' + hit.slug : '/shop');
      }
    }
    function availColorCount(t) {
      var n = 0;
      t.designs.forEach(function (d) { if (d.status === 'available') n += (d.colors ? d.colors.length : 0); });
      return n;
    }

    /* ---- render level-2 tabs + level-3 colours (data-driven, any count) ---- */
    function renderType(t) {
      renderTabs(t);
      renderOpts(t);
    }
    function renderTabs(t) {
      var el = root.querySelector('[data-cz-designs="' + t.id + '"]');
      var st = state[t.id];
      el.innerHTML = '';
      t.designs.forEach(function (d, di) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'cz__tab' + (d.status !== 'available' ? ' cz__tab--soon' : '') + (d.id === st.selDesignId ? ' is-active' : '');
        b.setAttribute('data-design', d.id);
        b.setAttribute('data-edit-item', 'swapper.json#types.' + typeIndex(t) + '.designs#' + di);
        b.innerHTML = '<span class="cz__tab-l">' + d.label + '</span>' +
          (d.status !== 'available' ? '<span class="cz__tab-soon">Soon</span>' : '');
        b.addEventListener('click', function () { selectDesign(t.id, d.id); });
        el.appendChild(b);
      });
    }
    function renderOpts(t) {
      var el = root.querySelector('[data-cz-colors="' + t.id + '"]');
      var st = state[t.id];
      var d = designById(t, st.selDesignId);
      el.innerHTML = '';

      if (!d || d.status !== 'available') {
        var soon = document.createElement('div');
        soon.className = 'cz__soon';
        soon.innerHTML =
          '<span class="cz__soon-k">Coming soon</span>' +
          '<span class="cz__soon-n">' + (d ? d.label : '') + '</span>' +
          '<span class="cz__soon-note">A new ' + (t.id === 'knots' ? 'knot' : 'tie') + ' for the house — join the list to hear first.</span>';
        el.appendChild(soon);
        return;
      }

      var di = t.designs.indexOf(d);
      var row = document.createElement('div');
      row.className = 'cz__row';
      d.colors.forEach(function (c, ci) {
        var active = (c.id === st.appColorId && st.selDesignId === st.appDesignId);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'sw' + (active ? ' is-active' : '');
        b.setAttribute('data-color', c.id);
        b.setAttribute('aria-label', c.name);
        b.setAttribute('data-edit-item', 'swapper.json#types.' + typeIndex(t) + '.designs.' + di + '.colors#' + ci);
        b.innerHTML = '<span class="sw__dot" style="background:' + swatchBg(c.colors) + '"></span><span class="sw__tip">' + c.name + '</span>';
        b.addEventListener('click', function () { selectColor(t.id, c.id); });
        row.appendChild(b);
      });
      el.appendChild(row);
    }

    function selectDesign(typeKey, designId) {
      var t = typeById[typeKey], st = state[typeKey];
      st.selDesignId = designId;
      var d = designById(t, designId);
      if (d && d.status === 'available') {
        var keep = colorById(d, st.appColorId);
        var col = keep || d.colors[0];
        var changed = (st.appDesignId !== designId) || (st.appColorId !== (col ? col.id : null));
        st.appDesignId = designId;
        st.appColorId = col ? col.id : null;
        renderType(t);
        if (changed) applyStage(partKeyOf(typeKey)); else updatePanel();
      } else {
        renderType(t);   /* coming-soon teaser; the model does not change */
      }
    }
    function selectColor(typeKey, colorId, instant) {
      var st = state[typeKey];
      if (st.appColorId === colorId && st.selDesignId === st.appDesignId) return;  /* clicking the active swatch does nothing */
      st.appColorId = colorId;
      st.appDesignId = st.selDesignId;
      renderOpts(typeById[typeKey]);
      applyStage(partKeyOf(typeKey), instant);
    }

    /* ---- press & drag on the model to scrub colours ----
       Drag horizontally over the stage: the UPPER half cycles the knot, the
       LOWER half cycles the tie (mirrors where the knot and tie actually sit).
       Every ~step of travel advances to the next colour in that design, wrapping.
       Uses instant swaps so the scrub feels direct. */
    (function initDrag() {
      var frame = stage.querySelector('.cz__frame');
      if (!frame) return;
      var STEP = 64;                       // px of drag per colour change
      var dragging = false, part = null, lastX = 0, acc = 0;

      function colorsOf(typeKey) {
        var t = typeById[typeKey], st = state[typeKey];
        var d = designById(t, st.appDesignId);
        return (d && d.status === 'available' && d.colors && d.colors.length > 1) ? d.colors : null;
      }
      function cycle(typeKey, dir) {
        var cols = colorsOf(typeKey); if (!cols) return;
        var st = state[typeKey], idx = 0;
        for (var i = 0; i < cols.length; i++) { if (cols[i].id === st.appColorId) { idx = i; break; } }
        idx = (idx + dir + cols.length) % cols.length;
        selectColor(typeKey, cols[idx].id, true);   // instant scrub
      }
      function partAt(clientY) {
        var r = frame.getBoundingClientRect();
        return (clientY - r.top) < r.height * 0.55 ? 'knots' : 'ties';
      }
      function down(e) {
        dragging = true; acc = 0; lastX = e.clientX;
        part = partAt(e.clientY);
        frame.classList.add('is-grabbing');
        if (frame.setPointerCapture && e.pointerId != null) { try { frame.setPointerCapture(e.pointerId); } catch (_) {} }
      }
      function move(e) {
        if (!dragging) return;
        acc += (e.clientX - lastX); lastX = e.clientX;
        var fired = false;
        while (acc >= STEP) { cycle(part, 1); acc -= STEP; fired = true; }
        while (acc <= -STEP) { cycle(part, -1); acc += STEP; fired = true; }
        if (fired && e.cancelable) e.preventDefault();
      }
      function up() { dragging = false; frame.classList.remove('is-grabbing'); }

      if (window.PointerEvent) {
        frame.addEventListener('pointerdown', down);
        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      } else {
        frame.addEventListener('mousedown', down);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      }
    })();

    types.forEach(renderType);
    applyStage();

    /* on small screens the design tabs + colour rows become side-scrollers
       (edge fades + arrows appear only in the direction that can scroll) */
    $all('[data-cz-designs], [data-cz-colors]', root).forEach(makeHscroll);
  }

  /* ---- generic horizontal scroller: edge fades + directional arrows ----
     Wraps `container` in a .hs shell. The container itself scrolls; the shell
     carries the fade masks and the two arrow buttons. Arrows/fades only show
     when there is actually somewhere to scroll in that direction, and vanish
     at the ends. Content re-renders inside the container are picked up via a
     MutationObserver. All of it is inert on desktop (CSS gates the overflow). */
  function makeHscroll(container) {
    if (!container || (container.parentElement && container.parentElement.classList.contains('hs'))) return;
    var wrap = document.createElement('div');
    wrap.className = 'hs';
    container.parentNode.insertBefore(wrap, container);
    wrap.appendChild(container);

    function arrow(dir) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hs__arrow hs__arrow--' + dir;
      b.setAttribute('aria-label', dir === 'l' ? 'Scroll left' : 'Scroll right');
      b.innerHTML = dir === 'l' ? ICONS.chevL : ICONS.chevR;
      b.addEventListener('click', function () {
        var step = Math.max(120, container.clientWidth * 0.7) * (dir === 'l' ? -1 : 1);
        if (container.scrollBy) container.scrollBy({ left: step, behavior: 'smooth' });
        else container.scrollLeft += step;
      });
      return b;
    }
    wrap.appendChild(arrow('l'));
    wrap.appendChild(arrow('r'));

    function update() {
      var max = container.scrollWidth - container.clientWidth;
      var x = container.scrollLeft;
      wrap.classList.toggle('has-l', max > 4 && x > 4);
      wrap.classList.toggle('has-r', max > 4 && x < max - 4);
    }
    container.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('load', update);
    if ('MutationObserver' in window) new MutationObserver(update).observe(container, { childList: true, subtree: true });
    update();
    setTimeout(update, 350);   /* fonts/images can change widths after load */

    /* mouse users can grab-and-slide the row, same as a finger on touch
       (touch itself uses native overflow scrolling). A real drag swallows
       the click so letting go doesn't accidentally pick a swatch. */
    if (window.PointerEvent) {
      var panning = false, moved = false, panX = 0, panL = 0;
      container.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        if (container.scrollWidth - container.clientWidth <= 4) return;
        panning = true; moved = false; panX = e.clientX; panL = container.scrollLeft;
      });
      window.addEventListener('pointermove', function (e) {
        if (!panning) return;
        var dx = e.clientX - panX;
        if (Math.abs(dx) > 5) { moved = true; wrap.classList.add('is-panning'); }
        container.scrollLeft = panL - dx;
      });
      window.addEventListener('pointerup', function () {
        panning = false; wrap.classList.remove('is-panning');
      });
      container.addEventListener('click', function (e) {
        if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
      }, true);
    }
  }

  /* ---- gallery: a horizontal scrolling strip (tiles are server-rendered) ---- */
  function initGalleryStrip() {
    var strip = $('[data-gallery-strip]');
    if (!strip) return;
    var track = $('[data-gstrip-track]', strip);
    if (!track) return;
    var prev = $('[data-gstrip-prev]');
    var next = $('[data-gstrip-next]');
    if (prev) prev.innerHTML = ICONS.chevL;
    if (next) next.innerHTML = ICONS.chevR;

    function step() {
      var tile = track.querySelector('.gtile');
      var g = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 16;
      return tile ? tile.getBoundingClientRect().width + g : track.clientWidth * 0.8;
    }
    function updateArrows() {
      if (!prev || !next) return;
      var max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    }
    function page(dir) {
      var n = Math.max(1, Math.round((track.clientWidth / step()) * 0.85));
      track.scrollBy({ left: dir * step() * n, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    if (prev) prev.addEventListener('click', function () { page(-1); });
    if (next) next.addEventListener('click', function () { page(1); });

    var raf = 0;
    track.addEventListener('scroll', function () {
      if (!raf) raf = requestAnimationFrame(function () { updateArrows(); raf = 0; });
    }, { passive: true });

    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); page(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); page(-1); }
    });

    /* vertical wheel intent scrolls the strip horizontally */
    track.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { track.scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });

    /* pointer drag, with click-suppression so a drag never opens the lightbox */
    var down = false, startX = 0, startLeft = 0, moved = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      down = true; moved = 0; startX = e.clientX; startLeft = track.scrollLeft;
      if (track.setPointerCapture) { try { track.setPointerCapture(e.pointerId); } catch (x) {} }
    });
    track.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 3) track.classList.add('is-drag');
      moved = Math.max(moved, Math.abs(dx));
      track.scrollLeft = startLeft - dx;
    });
    function end() {
      if (!down) return;
      down = false;
      track.classList.remove('is-drag');
      if (moved > 6) {
        var kill = function (ev) { ev.stopPropagation(); ev.preventDefault(); track.removeEventListener('click', kill, true); };
        track.addEventListener('click', kill, true);
        setTimeout(function () { track.removeEventListener('click', kill, true); }, 0);
      }
      updateArrows();
    }
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);

    window.addEventListener('resize', updateArrows, { passive: true });
    updateArrows();
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
    var layerEls = $all('[data-parallax] img:not([data-amb])'); /* photography + full-bleed — moves as a % of its own height */
    var motifs = $all('[data-amb]');            /* rooster marks + founder emblem — move in px, by data-speed */
    if (reduceMotion || (!layerEls.length && !motifs.length)) return;

    /* travel strengths are tokens on :root, so the CMS theme controls them */
    var cs = getComputedStyle(document.documentElement);
    var MEDIA = parseFloat(cs.getPropertyValue('--parallax-media')) || 18;   /* % of image height */
    var MOTIF = parseFloat(cs.getPropertyValue('--parallax-motif')) || 1.8;  /* multiplier */

    /* a section can boost its own travel via data-parallax-strength="30" */
    var layers = layerEls.map(function (img) {
      var host = img.closest('[data-parallax]');
      var s = host ? parseFloat(host.getAttribute('data-parallax-strength')) : NaN;
      return { img: img, strength: (s && s > 0) ? s : MEDIA };
    });

    var ticking = false;
    function update() {
      var vh = window.innerHeight;

      layers.forEach(function (L) {
        var img = L.img;
        var r = img.parentElement.getBoundingClientRect();
        if (r.bottom < -300 || r.top > vh + 300) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh;   /* -0.5 .. 0.5 across the viewport */
        if (p > 0.5) p = 0.5; else if (p < -0.5) p = -0.5;
        img.style.transform = 'translate3d(0,' + (p * -L.strength).toFixed(2) + '%,0)';
      });

      motifs.forEach(function (m) {
        var host = m.closest('section') || m.parentElement;
        var r = host.getBoundingClientRect();
        if (r.bottom < -500 || r.top > vh + 500) return;
        var speed = parseFloat(m.getAttribute('data-speed') || '100');
        var p = (r.top + r.height / 2 - vh / 2) / vh;
        var shiftY = p * -(speed / 100) * 120 * MOTIF;           /* px — layers move at clearly different depths */
        var base = m.classList.contains('founder__art') ? ' translateY(-50%)' : '';
        m.style.transform = 'translate3d(0,' + shiftY.toFixed(1) + 'px,0)' + base;
      });

      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ---- newsletter signup -> /api/subscribe -> Brevo ---- */
  function initSubscribe() {
    $all('form[data-subscribe]').forEach(function (f) {
      var msg = $('[data-subscribe-msg]', f.parentNode) || $('[data-subscribe-msg]');
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = $('button[type="submit"], .btn', f);
        var label = btn ? btn.textContent : '';
        var data = {
          first_name: (f.querySelector('[name="first_name"]') || {}).value || '',
          last_name: (f.querySelector('[name="last_name"]') || {}).value || '',
          email: (f.querySelector('[name="email"]') || {}).value || '',
          company: (f.querySelector('[name="company"]') || {}).value || ''
        };
        if (msg) { msg.textContent = ''; msg.className = 'news__msg'; }
        if (btn) { btn.disabled = true; btn.textContent = 'Joining...'; }

        fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            if (!res.ok) throw new Error(res.j.error || 'Something went wrong.');
            f.reset();
            if (btn) { btn.textContent = 'Welcome'; }
            if (msg) { msg.className = 'news__msg is-ok'; msg.textContent = 'You are on the list. Check your inbox.'; }
            setTimeout(function () { if (btn) { btn.textContent = label; btn.disabled = false; } }, 3000);
          })
          .catch(function (err) {
            if (btn) { btn.textContent = label; btn.disabled = false; }
            if (msg) { msg.className = 'news__msg is-err'; msg.textContent = err.message; }
          });
      });
    });
  }

  /* ---- Web3Forms (contact page) -> fetch submit so the visitor stays put ---- */
  function initWeb3Forms() {
    $all('form[data-web3]').forEach(function (f) {
      var msg = document.createElement('p');
      msg.className = 'news__msg';
      msg.setAttribute('role', 'status');
      msg.setAttribute('aria-live', 'polite');
      f.parentNode.insertBefore(msg, f.nextSibling);

      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = $('button[type="submit"], .btn', f);
        var label = btn ? btn.textContent : '';
        msg.textContent = ''; msg.className = 'news__msg';
        if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(f)
        })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (!j.success) throw new Error(j.message || 'Could not send your message.');
            f.reset();
            if (btn) btn.textContent = 'Sent';
            msg.className = 'news__msg is-ok';
            msg.textContent = 'Thank you. We will be in touch shortly.';
            setTimeout(function () { if (btn) { btn.textContent = label; btn.disabled = false; } }, 3000);
          })
          .catch(function (err) {
            if (btn) { btn.textContent = label; btn.disabled = false; }
            msg.className = 'news__msg is-err';
            msg.textContent = err.message;
          });
      });
    });
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


  /* ---------- 360 spin viewer (#spin) ----------
     Canvas frame-sequence player fed by Cloudinary frames (GCW.spin).
     Auto-rotates; pointer-drag scrubs 1:1 with flick inertia, then eases
     back to auto speed. Thumbs swap knots with a slide transition.
     Loading is lazy (IntersectionObserver) and progressive (coarse->fine). */
  function initSpin() {
    var host = $('[data-spin]');
    if (!host || !window.GCW || !GCW.spin || !GCW.spin.knots || !GCW.spin.knots.length) return;
    var S = GCW.spin;
    var stages = $('[data-spin-stages]', host);
    if (!stages) return;
    var barBox = $('[data-spin-load]', host);
    var bar = barBox ? $('i', barBox) : null;
    var thumbs = $all('[data-spin-thumb]', host);

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var BASE = reduced ? 0 : (S.baseSpeed || 15);      /* frames per second */
    var DIRC = S.dragDir || -1;
    var RESUME_MS = 1200;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var px = (stages.clientWidth || 640) * dpr;
    var W = px <= 850 ? 800 : (px <= 1250 ? 1200 : 1500);

    function pad3(n) { n = String(n); while (n.length < 3) n = '0' + n; return n; }
    function frameURL(k, i) { return S.base + 'f_auto,q_auto:good,w_' + W + '/' + k.folder + '/f-' + pad3(i + 1); }

    var cur = 0, viewers = [], started = false, visible = false;

    function makeViewer(k, idx) {
      var v = { k: k, frames: new Array(k.count), loaded: 0, frame: 0, vel: BASE,
                releaseVel: BASE, dragging: false, resumeT: null, loading: false };
      v.el = el('div', 'spin__stage' + (idx ? ' no-anim is-off-r' : ''));
      v.cv = document.createElement('canvas');
      v.cv.width = W; v.cv.height = W;
      v.ctx = v.cv.getContext('2d');
      v.el.appendChild(v.cv);
      stages.appendChild(v.el);

      v.preload = function () {
        if (v.loading) return; v.loading = true;
        var order = [], seen = {};
        [6, 3, 1].forEach(function (step) {
          for (var i = 0; i < k.count; i += step) if (!seen[i]) { seen[i] = 1; order.push(i); }
        });
        var inflight = 0, qi = 0;
        function prog() {
          if (viewers[cur] === v && bar) {
            bar.style.width = (100 * v.loaded / k.count) + '%';
            if (v.loaded >= k.count && barBox) barBox.classList.add('is-done');
          }
          if (v.loaded >= k.count) {
            var next = viewers[(idx + 1) % viewers.length];
            if (next && !next.loading) next.preload();   /* warm the other knot */
          }
        }
        function pump() {
          while (inflight < 8 && qi < order.length) {
            (function (i) {
              inflight++;
              var im = new Image();
              im.onload = function () { v.frames[i] = im; v.loaded++; inflight--; prog(); pump(); };
              im.onerror = function () { inflight--; pump(); };
              im.src = frameURL(k, i);
            })(order[qi++]);
          }
        }
        pump();
      };

      v.nearest = function (i) {
        if (v.frames[i]) return v.frames[i];
        for (var d = 1; d < k.count; d++) {
          var a = (i + d) % k.count, b = (i - d + k.count) % k.count;
          if (v.frames[b]) return v.frames[b];
          if (v.frames[a]) return v.frames[a];
        }
        return null;
      };

      v.draw = function () {
        var n = k.count;
        var i = ((Math.floor(v.frame) % n) + n) % n;
        var im = v.nearest(i);
        if (im) { v.ctx.clearRect(0, 0, W, W); v.ctx.drawImage(im, 0, 0, W, W); }
      };

      v.tick = function (dt) {
        if (!v.dragging) {
          if (v.resumeT !== null) {
            v.resumeT += dt * 1000;
            var t = Math.min(1, v.resumeT / RESUME_MS);
            var e = 1 - Math.pow(1 - t, 3);
            v.vel = v.releaseVel + (BASE - v.releaseVel) * e;
            if (t >= 1) v.resumeT = null;
          }
          v.frame += v.vel * dt;
        }
        v.draw();
      };

      var lastX = 0, lastT = 0, mv = 0, SENSV = k.count / 900;
      v.cv.addEventListener('pointerdown', function (e) {
        v.cv.setPointerCapture(e.pointerId);
        v.dragging = true; v.resumeT = null; mv = 0;
        v.cv.classList.add('is-grabbing');
        lastX = e.clientX; lastT = performance.now();
      });
      v.cv.addEventListener('pointermove', function (e) {
        if (!v.dragging) return;
        var now = performance.now();
        var dx = e.clientX - lastX;
        v.frame += DIRC * dx * SENSV;
        var dt = Math.max(1, now - lastT) / 1000;
        mv = 0.7 * mv + 0.3 * (DIRC * dx * SENSV / dt);
        lastX = e.clientX; lastT = now;
        v.draw();
      });
      function up() {
        if (!v.dragging) return;
        v.dragging = false;
        v.cv.classList.remove('is-grabbing');
        v.releaseVel = Math.max(-140, Math.min(140, mv));
        v.vel = v.releaseVel; v.resumeT = 0;
      }
      v.cv.addEventListener('pointerup', up);
      v.cv.addEventListener('pointercancel', up);
      return v;
    }

    S.knots.forEach(function (k, i) { viewers.push(makeViewer(k, i)); });

    function swapTo(to) {
      if (to === cur || !viewers[to]) return;
      var out = viewers[cur], inn = viewers[to];
      if (!inn.loading) inn.preload();
      inn.el.classList.add('no-anim');
      inn.el.classList.remove('is-off-r');
      inn.el.classList.add('is-off-l');
      inn.el.getBoundingClientRect();                 /* force reflow */
      inn.el.classList.remove('no-anim');
      requestAnimationFrame(function () {
        out.el.classList.remove('is-off-l');
        out.el.classList.add('is-off-r');             /* exit right */
        inn.el.classList.remove('is-off-l');          /* enter from left */
      });
      cur = to;
      thumbs.forEach(function (t, i) { t.classList.toggle('is-active', i === to); });
      if (barBox) barBox.classList.toggle('is-done', inn.loaded >= inn.k.count);
      if (bar) bar.style.width = (100 * inn.loaded / inn.k.count) + '%';
    }
    thumbs.forEach(function (t) {
      t.addEventListener('click', function () { swapTo(parseInt(t.getAttribute('data-spin-thumb'), 10) || 0); });
    });

    var last = 0;
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (visible) for (var i = 0; i < viewers.length; i++) viewers[i].tick(dt);
      requestAnimationFrame(loop);
    }
    function start() {
      if (started) return; started = true;
      viewers[0].preload();
      last = performance.now();
      requestAnimationFrame(loop);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          visible = en.isIntersecting;
          if (en.isIntersecting) start();
        });
      }, { rootMargin: '600px 0px' });
      io.observe(host);
    } else { visible = true; start(); }
  }

  function boot() {
    fillIcons();
    initHero();
    initNav();
    initCustomizer();
    initSpin();
    initLightbox();
    initGalleryStrip();
    initPDP();
    initFilm();
    initSubscribe();
    initWeb3Forms();
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
    '[data-edit].jrd-sel{outline:2px solid #c9a227;outline-offset:2px}' +
    '.jrd-drop{outline:3px solid #c9a227 !important;outline-offset:3px}' +
    '.jrd-drop-add{outline:3px dashed #c9a227 !important;outline-offset:4px}' +
    '.jrd-drag{opacity:.35}' +
    '#jrd-ins{position:fixed;z-index:2147483000;background:linear-gradient(180deg,#e3c766,#c9a227);border-radius:3px;box-shadow:0 0 0 1px rgba(13,13,13,.6),0 0 12px rgba(201,162,39,.85);pointer-events:none;display:none}' +
    '#jrd-badge{position:fixed;z-index:2147483001;transform:translate(-50%,-50%);background:rgba(13,13,13,.92);color:#e3c766;border:1px solid #c9a227;padding:7px 14px;font:600 11px/1.3 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;border-radius:999px;pointer-events:none;display:none;white-space:nowrap}';
  document.head.appendChild(st);

  /* floating drag helpers: a gold insertion divider (reorder) and a pill
     badge that says what a file drop will do — the pattern every polished
     CMS (Squarespace etc.) uses so you always know where things will land */
  var insBar = document.createElement('div'); insBar.id = 'jrd-ins';
  var badge = document.createElement('div'); badge.id = 'jrd-badge';
  function mountHelpers() { document.body.appendChild(insBar); document.body.appendChild(badge); }
  if (document.body) mountHelpers(); else document.addEventListener('DOMContentLoaded', mountHelpers);

  function showIns(over, useY, after) {
    var r = over.getBoundingClientRect();
    /* centre the bar in the gap next to the tile's edge */
    if (useY) {
      insBar.style.left = (r.left + 2) + 'px';
      insBar.style.width = (r.width - 4) + 'px';
      insBar.style.height = '4px';
      insBar.style.top = ((after ? r.bottom + 4 : r.top - 8)) + 'px';
    } else {
      insBar.style.top = (r.top + 2) + 'px';
      insBar.style.height = (r.height - 4) + 'px';
      insBar.style.width = '4px';
      insBar.style.left = ((after ? r.right + 4 : r.left - 8)) + 'px';
    }
    insBar.style.display = 'block';
  }
  function hideIns() { insBar.style.display = 'none'; }
  function showBadge(el, text) {
    var r = el.getBoundingClientRect();
    badge.textContent = text;
    badge.style.left = (r.left + r.width / 2) + 'px';
    badge.style.top = Math.max(30, Math.min(window.innerHeight - 30, r.top + r.height / 2)) + 'px';
    badge.style.display = 'block';
  }
  function hideBadge() { badge.style.display = 'none'; }

  var selEl = null;
  function select(el) {
    if (selEl) { selEl.classList.remove('jrd-sel'); selEl.removeAttribute('contenteditable'); }
    selEl = el;
    if (selEl) {
      selEl.classList.add('jrd-sel');
      if (!selEl.hasAttribute('data-edit-media')) { selEl.setAttribute('contenteditable', 'true'); selEl.focus(); }
    }
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
      media: (leaf && leaf.hasAttribute('data-edit-media')) ? (leaf.getAttribute('data-edit-media') || 'image') : null,
      text: (leaf && !leaf.hasAttribute('data-edit-media')) ? leaf.textContent : null
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
    if (d.jrd === 'item-remove' && d.file && d.arr != null && typeof d.idx === 'number') {
      var pref = d.file + '#' + d.arr + '#';
      var editPref = d.file + '#' + d.arr + '.';
      var victim = document.querySelector('[data-edit-item="' + pref + d.idx + '"]');
      if (victim) victim.remove();
      /* re-index the stamps after the removed item so further edits hit the right slots */
      document.querySelectorAll('[data-edit-item]').forEach(function (el2) {
        var v = el2.getAttribute('data-edit-item');
        if (v.indexOf(pref) === 0) {
          var n = parseInt(v.slice(pref.length), 10);
          if (n > d.idx) el2.setAttribute('data-edit-item', pref + (n - 1));
        }
      });
      document.querySelectorAll('[data-edit]').forEach(function (el2) {
        var v = el2.getAttribute('data-edit');
        if (v.indexOf(editPref) === 0) {
          var rest = v.slice(editPref.length), m2 = rest.match(/^(\d+)(\..*)?$/);
          if (m2) { var n2 = parseInt(m2[1], 10); if (n2 > d.idx) el2.setAttribute('data-edit', editPref + (n2 - 1) + (m2[2] || '')); }
        }
      });
    }
    if (d.jrd === 'styleapply' && d.edit) {
      document.querySelectorAll('[data-edit="' + d.edit + '"]').forEach(function (el) {
        if (d.color) el.style.setProperty('color', d.color, 'important'); else el.style.removeProperty('color');
        if (d.align) el.style.setProperty('text-align', d.align, 'important'); else el.style.removeProperty('text-align');
      });
    }
    /* a media field changed in the panel -> live-swap the image/video on the page */
    if (d.jrd === 'media-apply' && d.edit && d.url) {
      document.querySelectorAll('[data-edit="' + d.edit + '"]').forEach(function (el) {
        var m = (el.tagName === 'IMG' || el.tagName === 'VIDEO') ? el : el.querySelector('img,video');
        if (m) { m.src = d.url; if (m.tagName === 'VIDEO' && m.load) m.load(); }
      });
    }
    /* a non-media field of an item changed in the panel — mirror what we can */
    if (d.jrd === 'item-field' && d.file && d.arr != null && typeof d.idx === 'number' && d.key) {
      applyItemField(document.querySelector('[data-edit-item="' + d.file + '#' + d.arr + '#' + d.idx + '"]'),
        d.file + '#' + d.arr, d.key, d.value);
    }
    /* an item's image was replaced (panel upload or file dropped on its tile) */
    if (d.jrd === 'item-media' && d.file && d.arr != null && typeof d.idx === 'number' && d.url) {
      var host = document.querySelector('[data-edit-item="' + d.file + '#' + d.arr + '#' + d.idx + '"]');
      if (host) {
        var hm = (host.tagName === 'IMG' || host.tagName === 'VIDEO') ? host : host.querySelector('img,video');
        if (hm) { hm.src = d.url; if (hm.tagName === 'VIDEO' && hm.load) hm.load(); }
        if (host.hasAttribute('data-full')) host.setAttribute('data-full', d.url);
      }
    }
    /* a new item was added at the TOP of a list (file dropped on the section):
       clone the first tile as a stand-in preview and shift every stamp up one */
    if (d.jrd === 'item-add' && d.file && d.arr != null && d.url) {
      var pref2 = d.file + '#' + d.arr + '#';
      var editPref2 = d.file + '#' + d.arr + '.';
      var first = document.querySelector('[data-edit-item="' + pref2 + '0"]');
      var clone = first ? first.cloneNode(true) : null;
      document.querySelectorAll('[data-edit-item]').forEach(function (el2) {
        var v = el2.getAttribute('data-edit-item');
        if (v.indexOf(pref2) === 0) el2.setAttribute('data-edit-item', pref2 + (parseInt(v.slice(pref2.length), 10) + 1));
      });
      document.querySelectorAll('[data-edit]').forEach(function (el2) {
        var v = el2.getAttribute('data-edit');
        if (v.indexOf(editPref2) === 0) {
          var rest = v.slice(editPref2.length), m2 = rest.match(/^(\d+)(\..*)?$/);
          if (m2) el2.setAttribute('data-edit', editPref2 + (parseInt(m2[1], 10) + 1) + (m2[2] || ''));
        }
      });
      if (clone && first) {
        var cm = (clone.tagName === 'IMG' || clone.tagName === 'VIDEO') ? clone : clone.querySelector('img,video');
        if (cm) { cm.src = d.url; if (cm.tagName === 'VIDEO' && cm.load) cm.load(); }
        if (clone.hasAttribute('data-full')) clone.setAttribute('data-full', d.url);
        /* the clone inherited the donor tile's look — normalise it to the
           NEW item's actual field values (size, caption, ...) */
        if (d.item && typeof d.item === 'object') {
          Object.keys(d.item).forEach(function (k) { applyItemField(clone, d.file + '#' + d.arr, k, d.item[k]); });
        }
        first.parentNode.insertBefore(clone, first);
      }
      markDraggables();
    }
  });

  /* map an item's data fields onto its visible tile where that makes sense */
  function applyItemField(host, base, key, value) {
    if (!host) return;
    if (key === 'alt') { var im = host.querySelector('img'); if (im) im.alt = value || ''; }
    if (base === 'gallery.json#items' && key === 'span') {
      host.classList.remove('mtile--tall', 'mtile--wide');
      if (value === 'tall') host.classList.add('mtile--tall');
      else if (value === 'wide') host.classList.add('mtile--wide');
    }
  }

  /* ============================================================
     ON-PAGE MEDIA DROPS + DRAG-TO-REORDER (edit mode only)
     - drop an image file from your computer ONTO a tile  -> replace it
     - drop it into the open area of a list's section     -> add it
     - drag a tile onto a sibling                          -> reorder
     The upload itself happens in the /admin parent (it holds the auth);
     the page just reports what was dropped where.
     ============================================================ */
  function stampBase(v) { return v.slice(0, v.lastIndexOf('#')); }
  function stampIdx(v) { return parseInt(v.slice(v.lastIndexOf('#') + 1), 10); }

  function markDraggables() {
    var counts = {};
    document.querySelectorAll('[data-edit-item]').forEach(function (el) {
      var b = stampBase(el.getAttribute('data-edit-item'));
      counts[b] = (counts[b] || 0) + 1;
    });
    document.querySelectorAll('[data-edit-item]').forEach(function (el) {
      if (counts[stampBase(el.getAttribute('data-edit-item'))] > 1) el.setAttribute('draggable', 'true');
    });
  }

  /* remap stamps after moving index `from` -> `to` inside base (file#arr) */
  function remapMove(base, from, to) {
    var pref = base + '#';
    var editPref = base + '.';   /* leaf stamps: file#arr.idx.field */
    function newIdx(n) {
      if (n === from) return to;
      if (from < to && n > from && n <= to) return n - 1;
      if (to < from && n >= to && n < from) return n + 1;
      return n;
    }
    document.querySelectorAll('[data-edit-item]').forEach(function (el) {
      var v = el.getAttribute('data-edit-item');
      if (stampBase(v) === base) el.setAttribute('data-edit-item', pref + newIdx(stampIdx(v)));
    });
    document.querySelectorAll('[data-edit]').forEach(function (el) {
      var v = el.getAttribute('data-edit');
      if (v.indexOf(editPref) === 0) {
        var rest = v.slice(editPref.length), m = rest.match(/^(\d+)(\..*)?$/);
        if (m) el.setAttribute('data-edit', editPref + newIdx(parseInt(m[1], 10)) + (m[2] || ''));
      }
    });
  }

  function isFileDrag(e) {
    var t = e.dataTransfer && e.dataTransfer.types;
    return !!t && Array.prototype.indexOf.call(t, 'Files') >= 0;
  }
  /* walking up from `node`, find the nearest ancestor whose stamped items all
     belong to ONE list — that list is the add-target for a loose file drop */
  function arrTargetOf(node) {
    var el = node && node.nodeType === 1 ? node : (node && node.parentElement);
    while (el && el !== document.body) {
      var stamped = el.querySelectorAll('[data-edit-item]');
      if (stamped.length) {
        var base = null;
        for (var i = 0; i < stamped.length; i++) {
          var b = stampBase(stamped[i].getAttribute('data-edit-item'));
          if (base === null) base = b;
          else if (b !== base) return null;   /* mixed lists here — no clear target */
        }
        return { el: el, arr: base };
      }
      el = el.parentElement;
    }
    return null;
  }

  var dropEl = null;
  function clearDrop() { if (dropEl) { dropEl.classList.remove('jrd-drop', 'jrd-drop-add'); dropEl = null; } hideBadge(); }

  var drag = null;      /* {el, base, idx} while a tile is being dragged */
  function clearInd() { hideIns(); }
  function dropPos(over, e) {
    var r = over.getBoundingClientRect();
    var pw = (over.parentElement && over.parentElement.clientWidth) || r.width;
    var useY = r.width > pw * 0.8;   /* full-width rows stack vertically */
    var after = useY ? ((e.clientY - r.top) > r.height / 2) : ((e.clientX - r.left) > r.width / 2);
    return { useY: useY, after: after };
  }

  document.addEventListener('dragstart', function (e) {
    var el = e.target && e.target.closest && e.target.closest('[data-edit-item]');
    if (!el || !el.hasAttribute('draggable')) return;
    var v = el.getAttribute('data-edit-item');
    drag = { el: el, base: stampBase(v), idx: stampIdx(v) };
    el.classList.add('jrd-drag');
    try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', v); } catch (_) {}
  });
  document.addEventListener('dragend', function () {
    if (drag) drag.el.classList.remove('jrd-drag');
    drag = null; clearInd(); clearDrop();
  });
  /* the drag left the page entirely (OS files pulled back out) — clean up */
  document.addEventListener('dragleave', function (e) {
    if (!e.relatedTarget && (e.target === document.documentElement || e.target === document.body)) { clearDrop(); clearInd(); }
  });

  document.addEventListener('dragover', function (e) {
    if (isFileDrag(e)) {
      e.preventDefault();
      var t = e.target.closest && e.target.closest('[data-edit-item]');
      if (t) {
        if (t !== dropEl) { clearDrop(); dropEl = t; t.classList.add('jrd-drop'); }
        showBadge(t, 'Drop to replace this image');
      } else {
        var a = arrTargetOf(e.target);
        var el = a && a.el;
        if (el !== dropEl) { clearDrop(); if (el) { dropEl = el; el.classList.add('jrd-drop-add'); } }
        if (el) showBadge(el, 'Drop to add');
      }
      return;
    }
    if (!drag) return;
    var over = e.target.closest && e.target.closest('[data-edit-item]');
    if (!over || over === drag.el || stampBase(over.getAttribute('data-edit-item')) !== drag.base) { clearInd(); return; }
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
    var pos = dropPos(over, e);
    showIns(over, pos.useY, pos.after);   /* the gold divider marks the exact slot */
  });

  document.addEventListener('drop', function (e) {
    if (isFileDrag(e)) {
      e.preventDefault();
      var files = Array.prototype.slice.call(e.dataTransfer.files || []);
      var t = e.target.closest && e.target.closest('[data-edit-item]');
      var target = null;
      if (t) target = { item: t.getAttribute('data-edit-item') };
      else { var a = arrTargetOf(e.target); if (a) target = { arr: a.arr }; }
      clearDrop();
      if (!target || !files.length) return;
      /* Read the bytes HERE and transfer raw buffers to /admin. Passing the
         File objects themselves can fail later with "Failed to fetch" —
         Chromium sometimes can't re-read a cross-document cloned file handle
         at upload time. Buffers are copied up front, so they always work. */
      Promise.all(files.map(function (f) {
        return f.arrayBuffer().then(function (buf) {
          return { name: f.name, type: f.type, size: f.size, buf: buf };
        });
      })).then(function (payload) {
        var msg = { jrd: 'files-drop', item: target.item || null, arr: target.arr || null, files: payload };
        parent.postMessage(msg, '*', payload.map(function (p) { return p.buf; }));
      }).catch(function () { /* unreadable file — nothing to send */ });
      return;
    }
    if (!drag) return;
    var over = e.target.closest && e.target.closest('[data-edit-item]');
    clearInd();
    if (!over || over === drag.el || stampBase(over.getAttribute('data-edit-item')) !== drag.base) return;
    e.preventDefault();
    var overIdx = stampIdx(over.getAttribute('data-edit-item'));
    var pos = dropPos(over, e);
    var to = overIdx + (pos.after ? 1 : 0);
    if (drag.idx < to) to--;
    if (to === drag.idx) return;
    if (pos.after) over.parentNode.insertBefore(drag.el, over.nextSibling);
    else over.parentNode.insertBefore(drag.el, over);
    var fa = drag.base.split('#');
    remapMove(drag.base, drag.idx, to);
    parent.postMessage({ jrd: 'item-move', file: fa[0], arr: fa[1], from: drag.idx, to: to }, '*');
  });

  markDraggables();

  parent.postMessage({ jrd: 'ready', page: location.pathname }, '*');
})();
