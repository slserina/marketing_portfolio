(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function $$(sel) { return Array.from(document.querySelectorAll(sel)); }

  var state = {
    menuOpen: false,
    hover: -1,
    mx: 890,
    my: 62,
    fill: ['translateY(-101%)', 'translateY(-101%)', 'translateY(-101%)', 'translateY(-101%)'],
    snap: ['', '', '', ''],
    cartArm: false,
    cartIn: false,
    bnx: 0,
    bny: 0
  };
  var tf = [null, null, null, null]; // frozen thumbnail transform per row, like this._tf

  var rowEls = $$('a[data-row]');
  var fillEls = $$('.workfill[data-row]');
  var shiftEls = $$('div[data-row]').filter(function (e) { return !e.classList.contains('workfill'); });
  var thumbEls = [$('thumb0'), $('thumb1'), $('thumb2'), $('thumb3')];
  var worklist = $('worklist');
  var cart = $('cart');
  var bunnyWrap = $('bunnyWrap');
  var bunnyCanvas = $('bunnycv');
  var menuOverlay = $('menuOverlay');
  var menuPanel = $('menuPanel');
  var menuButton = $('menuButton');
  var menuLine1 = $('menuLine1');
  var menuLine2 = $('menuLine2');
  var footer = $('contact');

  // Desktop-only hover effects (project-list preview thumbnails + fill).
  // On touch devices and narrow screens the rows are plain links.
  var hoverMQ = window.matchMedia ? window.matchMedia('(hover: hover) and (min-width: 1024px)') : null;
  function hoverOK() { return hoverMQ ? hoverMQ.matches : true; }
  function rowH() { return (rowEls[0] && rowEls[0].offsetHeight) || 124; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function updateMenu() {
    var open = state.menuOpen;
    if (menuOverlay) {
      menuOverlay.style.opacity = open ? '0.5' : '0';
      menuOverlay.style.visibility = open ? 'visible' : 'hidden';
      menuOverlay.style.transitionDelay = open ? '0s' : '0.3s';
    }
    if (menuPanel) {
      menuPanel.style.transform = open ? 'translateX(0)' : 'translateX(100%)';
      menuPanel.style.visibility = open ? 'visible' : 'hidden';
      menuPanel.style.transitionDelay = open ? '0s' : '0.3s';
    }
    if (menuButton) menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (menuLine1) menuLine1.style.transform = open ? 'translateY(0px) rotate(45deg)' : 'translateY(-6px)';
    if (menuLine2) menuLine2.style.transform = open ? 'translateY(0px) rotate(-45deg)' : 'translateY(6px)';
  }
  function setMenuOpen(v) { state.menuOpen = v; updateMenu(); }
  if (menuButton) menuButton.addEventListener('click', function () { setMenuOpen(!state.menuOpen); });
  if (menuOverlay) menuOverlay.addEventListener('click', function () { setMenuOpen(false); });
  $$('.menulink').forEach(function (a) { a.addEventListener('click', function () { setMenuOpen(false); }); });

  function updateRows() {
    for (var i = 0; i < 4; i++) {
      if (fillEls[i]) {
        fillEls[i].style.transform = state.fill[i];
        fillEls[i].className = 'workfill' + (state.snap[i] ? ' snap' : '');
      }
      if (shiftEls[i]) {
        if (state.hover === i) {
          var mid = i * rowH() + rowH() / 2;
          var dx = clamp((state.mx - 890) * 0.08, -30, 30);
          var dy = clamp((state.my - mid) * 0.3, -24, 24);
          tf[i] = 'translate(' + dx + 'px, ' + dy + 'px)';
          shiftEls[i].style.transform = 'translateX(24px)';
        } else {
          shiftEls[i].style.transform = 'translateX(0px)';
        }
      }
      if (thumbEls[i]) {
        thumbEls[i].style.opacity = state.hover === i ? '1' : '0';
        thumbEls[i].style.transform = tf[i] || 'translate(0px, 0px)';
      }
    }
  }

  var t = {}, exitAt = {};
  function doEnter(i, fromTop) {
    if (state.hover === i) return;
    clearTimeout(t[i]);
    var recentlyLeft = Date.now() - (exitAt[i] || 0) < 450;
    if (recentlyLeft) {
      state.hover = i; state.fill[i] = 'translateY(0)'; state.snap[i] = '';
      updateRows();
      return;
    }
    state.hover = i;
    state.fill[i] = fromTop ? 'translateY(-101%)' : 'translateY(101%)';
    state.snap[i] = 'snap';
    updateRows();
    t[i] = setTimeout(function () {
      state.fill[i] = 'translateY(0)'; state.snap[i] = ''; updateRows();
    }, 30);
  }
  function doExit(i, toBottom) {
    clearTimeout(t[i]);
    exitAt[i] = Date.now();
    state.fill[i] = toBottom ? 'translateY(101%)' : 'translateY(-101%)';
    state.snap[i] = '';
    updateRows();
  }
  rowEls.forEach(function (a, i) {
    a.addEventListener('mouseenter', function (e) {
      if (!hoverOK()) return;
      var r = a.getBoundingClientRect();
      doEnter(i, e.clientY < r.top + r.height / 2);
    });
    a.addEventListener('mouseleave', function (e) {
      if (!hoverOK()) return;
      var r = a.getBoundingClientRect();
      doExit(i, e.clientY > r.top + r.height / 2);
    });
  });

  var moveRaf = 0;
  if (worklist) {
    worklist.addEventListener('mousemove', function (e) {
      if (!hoverOK()) return;
      var r = worklist.getBoundingClientRect();
      var mx = e.clientX - r.left, my = e.clientY - r.top;
      if (!moveRaf) {
        moveRaf = requestAnimationFrame(function () {
          moveRaf = 0;
          state.mx = mx; state.my = my;
          updateRows();
        });
      }
    });
    worklist.addEventListener('mouseleave', function () {
      state.hover = -1;
      updateRows();
    });
  }

  // Re-sync the hover highlight against the last known pointer position when
  // the page scrolls under a stationary mouse (mirrors the original _syncHover).
  var px = null, py = null;
  document.addEventListener('mousemove', function (e) { px = e.clientX; py = e.clientY; }, true);
  var scrollRaf = 0;
  document.addEventListener('scroll', function () {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(function () {
      scrollRaf = 0;
      if (px == null || !worklist || !hoverOK()) return;
      var r = worklist.getBoundingClientRect();
      var cur = state.hover;
      var inside = px >= r.left && px <= r.right && py >= r.top && py < r.bottom - 1;
      if (inside) {
        var RH = rowH();
        var idx = Math.floor((py - r.top) / RH);
        idx = Math.max(0, Math.min(3, idx));
        if (idx === cur) return;
        var fromTop = cur >= 0 ? idx > cur : ((py - r.top) - idx * RH) < RH / 2;
        if (cur >= 0) doExit(cur, idx > cur);
        doEnter(idx, fromTop);
        state.mx = px - r.left; state.my = py - r.top;
        updateRows();
      } else if (cur >= 0) {
        doExit(cur, py >= r.bottom - 1);
        state.hover = -1;
        updateRows();
      }
    });
  }, true);

  // ---- cart reveal ----
  function updateCart() {
    if (!cart) return;
    cart.className = (state.cartArm ? 'cartarm' : '') + (state.cartIn ? ' cartin' : '');
  }
  if (cart && 'IntersectionObserver' in window) {
    state.cartArm = true;
    updateCart();
    setTimeout(function () {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting && e.intersectionRatio >= 0.3; })) {
          state.cartIn = true;
          updateCart();
          io.disconnect();
        }
      }, { threshold: [0, 0.3, 0.6] });
      io.observe(cart);
    }, 120);
  }

  // ---- reveal-on-scroll ----
  if ('IntersectionObserver' in window) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('revealed');
          revealIO.unobserve(en.target);
        }
      });
    }, { threshold: 0.18 });
    $$('.reveal').forEach(function (e) { revealIO.observe(e); });
  }

  // ---- footer bunny mascot ----
  var ear = { L: { d: 0, v: 0 }, R: { d: 0, v: 0 } };
  var bx = 0, by = 0, pbx = 0, bimg = null, bloop = 0, bl = 0;

  function updateBunnyWrap() {
    if (!bunnyWrap) return;
    bunnyWrap.style.transform = 'translate(' + (bx * 12).toFixed(1) + 'px, ' + (by * 8).toFixed(1) + 'px) rotate(' + (bx * 1.5).toFixed(2) + 'deg)';
  }

  function drawBunny() {
    if (!bimg || !bunnyCanvas) return;
    var ctx = bunnyCanvas.getContext('2d');
    ctx.clearRect(0, 0, bunnyCanvas.width, bunnyCanvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    var W = bimg.naturalWidth, H = bimg.naturalHeight;
    var k = bunnyCanvas.width / W;
    var BASE = 292, SPLIT = 188;
    var dL = ear.L.d, dR = ear.R.d, vL = ear.L.v, vR = ear.R.v;
    for (var y = 0; y < H; y++) {
      var l = 0, r = 0;
      if (y < BASE) {
        var tt = (BASE - y) / BASE;
        var bend = tt * tt;
        var curl = tt * tt * tt;
        l = dL * bend + vL * 0.012 * curl;
        r = dR * bend + vR * 0.012 * curl;
      }
      if (l === 0 && r === 0) {
        ctx.drawImage(bimg, 0, y, W, 1, 0, y * k, W * k, k);
      } else {
        ctx.drawImage(bimg, 0, y, SPLIT + 1, 1, l * k, y * k, (SPLIT + 1) * k, k);
        ctx.drawImage(bimg, SPLIT, y, W - SPLIT, 1, (SPLIT + r) * k, y * k, (W - SPLIT) * k, k);
      }
    }
  }

  function tick(now) {
    var dt = Math.min(0.033, Math.max(0.004, (now - bl) / 1000));
    bl = now;
    var dbx = bx - pbx;
    pbx = bx;
    var P = { L: { k: 78, c: 4.4, g: 120, lean: 5 }, R: { k: 66, c: 4.0, g: 135, lean: 5 } };
    var energy = Math.abs(dbx) * 100;
    ['L', 'R'].forEach(function (n) {
      var e = ear[n], p = P[n];
      e.v += -dbx * p.g * 0.8;
      var target = bx * p.lean;
      e.v += (-p.k * (e.d - target) - p.c * e.v) * dt;
      e.d += e.v * dt;
      e.d = Math.max(-36, Math.min(36, e.d));
      energy += Math.abs(e.d - target) + Math.abs(e.v) * 0.05;
    });
    drawBunny();
    if (energy > 0.02) bloop = requestAnimationFrame(tick);
    else { bloop = 0; ear.L.v = 0; ear.R.v = 0; drawBunny(); }
  }
  function kick() { if (!bloop) { bl = performance.now(); bloop = requestAnimationFrame(tick); } }

  if (footer) {
    var fraf = 0;
    footer.addEventListener('mousemove', function (e) {
      var r = footer.getBoundingClientRect();
      bx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      by = ((e.clientY - r.top) / r.height - 0.5) * 2;
      kick();
      if (!fraf) {
        fraf = requestAnimationFrame(function () { fraf = 0; updateBunnyWrap(); });
      }
    });
    footer.addEventListener('mouseleave', function () {
      bx = 0; by = 0; kick(); updateBunnyWrap();
    });
  }

  var im = new Image();
  im.onload = function () {
    bimg = im;
    drawBunny();
    [400, 1500, 4000].forEach(function (ms) { setTimeout(drawBunny, ms); });
  };
  im.src = 'assets/838f84b707a5a9f895f2e505fb25f0b1.png';

  updateMenu();
  updateRows();
})();
