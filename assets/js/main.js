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

    var gleam = $('[data-cz-gleam]', stage);
    var MAXBLUR = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cz-blur-max')) || 16;
    var PART = {
      knot: { a: '[data-cz-knot-a]', b: '[data-cz-knot-b]', filter: 'url(#czBlurKnot)', blur: stage.querySelector('[data-cz-blur="knot"]') },
      tie:  { a: '[data-cz-tie-a]',  b: '[data-cz-tie-b]',  filter: 'url(#czBlurTie)',  blur: stage.querySelector('[data-cz-blur="tie"]') }
    };

    function runGleam() {
      if (reduceMotion || !gleam) return;
      gleam.classList.remove('is-running');
      void gleam.offsetWidth;
      gleam.classList.add('is-running');
    }
    function setBlur(node, px) { if (node) node.setAttribute('stdDeviation', (px > 0 ? px.toFixed(2) : '0') + ' 0'); }
    function txOf(el) {
      var t = getComputedStyle(el).transform;
      if (!t || t === 'none') return 0;
      var m = t.match(/matrix\(([^)]+)\)/);
      if (m) { var p = m[1].split(','); return Math.abs(parseFloat(p[4]) || 0); }
      var m3 = t.match(/matrix3d\(([^)]+)\)/);
      if (m3) { var q = m3[1].split(','); return Math.abs(parseFloat(q[12]) || 0); }
      return 0;
    }
    function resetLayer(el) {
      el.classList.remove('is-on', 'is-anim');
      el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; el.style.filter = '';
    }

    /* the incoming layer slides in from the LEFT and settles pixel-exact; the
       outgoing layer slides out to the RIGHT and fades — same direction, like a
       card pushed from a slot. The incoming layer carries a horizontal motion
       blur that peaks at velocity and resolves to zero as it lands. */
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
          incoming.classList.remove('is-anim');
          incoming.style.transition = ''; incoming.style.transform = ''; incoming.style.opacity = ''; incoming.style.filter = '';
          incoming.classList.add('is-on');
          return;
        }

        incoming.classList.add('is-on'); incoming.classList.remove('is-anim');
        incoming.style.transition = 'none'; incoming.style.opacity = '1';
        incoming.style.transform = 'translateX(-100%)'; incoming.style.filter = P.filter;

        outgoing.classList.add('is-on'); outgoing.classList.remove('is-anim');
        outgoing.style.transition = 'none'; outgoing.style.opacity = '1'; outgoing.style.transform = 'translateX(0)'; outgoing.style.filter = '';

        void incoming.offsetWidth;
        setBlur(P.blur, MAXBLUR);

        requestAnimationFrame(function () {
          incoming.classList.add('is-anim'); incoming.style.transition = ''; incoming.style.transform = 'translateX(0)';
          outgoing.classList.add('is-anim'); outgoing.style.transition = ''; outgoing.style.transform = 'translateX(100%)'; outgoing.style.opacity = '0';

          var frameW = incoming.getBoundingClientRect().width || 1;
          var running = true;
          (function tick() {
            if (!running) return;
            setBlur(P.blur, (txOf(incoming) / frameW) * MAXBLUR);   /* blur tracks distance from rest */
            requestAnimationFrame(tick);
          })();

          var done = function (e) {
            if (e.propertyName !== 'transform') return;
            outgoing.removeEventListener('transitionend', done);
            running = false; setBlur(P.blur, 0);
            incoming.style.filter = ''; incoming.classList.remove('is-anim');
            resetLayer(outgoing);
          };
          outgoing.addEventListener('transitionend', done);
        });
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
      if (animate) runGleam();
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
    var layers = $all('[data-parallax] img:not([data-amb])');   /* photography + full-bleed — moves as a % of its own height */
    var motifs = $all('[data-amb]');            /* rooster marks + founder emblem — move in px, by data-speed */
    if (reduceMotion || (!layers.length && !motifs.length)) return;

    /* travel strengths are tokens on :root, so the CMS theme controls them */
    var cs = getComputedStyle(document.documentElement);
    var MEDIA = parseFloat(cs.getPropertyValue('--parallax-media')) || 18;   /* % of image height */
    var MOTIF = parseFloat(cs.getPropertyValue('--parallax-motif')) || 1.8;  /* multiplier */

    var ticking = false;
    function update() {
      var vh = window.innerHeight;

      layers.forEach(function (img) {
        var r = img.parentElement.getBoundingClientRect();
        if (r.bottom < -300 || r.top > vh + 300) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh;   /* -0.5 .. 0.5 across the viewport */
        if (p > 0.5) p = 0.5; else if (p < -0.5) p = -0.5;
        img.style.transform = 'translate3d(0,' + (p * -MEDIA).toFixed(2) + '%,0)';
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
    initGalleryStrip();
    initPDP();
    initFilm();
    initSubscribe();
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
