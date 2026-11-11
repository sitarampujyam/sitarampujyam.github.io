/*
 * Constellation: a map of posts and tags (like Obsidian's graph view).
 *
 *  - Tags are the bright stars, posts are the small ones.
 *  - A line joins a post to each tag it carries, so posts that share a tag
 *    settle close together.
 *  - The layout is computed once, deterministically (same map on every load),
 *    then left still. It only moves when you drag a star.
 *  - Colours are read from the site's CSS variables, so it follows all four
 *    looks (white, sepia, dim, lights out) and updates when you switch.
 */
(function () {
  'use strict';

  var root = document.getElementById('constellation');
  if (!root) return;

  var canvas = root.querySelector('canvas');
  var capEl = root.querySelector('.constellation-caption');
  var ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;

  var raw;
  try {
    raw = JSON.parse(document.getElementById('constellation-data').textContent);
  } catch (e) {
    return;
  }

  var html = document.documentElement;
  var reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  /* ---------------------------------------------------------------- data */

  // Until there are enough tagged posts, a small map looks awkward. So the
  // page shows a blurred sample sky instead, with a note over it.
  var UNLOCK_AT = 3;
  var realPosts = raw.posts.filter(function (p) {
    return p.g && p.g.length;
  }).length;
  var locked = realPosts < UNLOCK_AT;
  if (locked) raw = sampleData();

  function sampleData() {
    var names = [
      'physics',
      'mathematics',
      'books',
      'quantum',
      'notes',
      'ideas',
      'life',
      'code',
      'science'
    ];
    var rnd = mulberry32(11);
    var posts = [];
    var counts = {};
    for (var i = 0; i < 22; i++) {
      var g = [];
      var k = 1 + Math.floor(rnd() * 3);
      while (g.length < k) {
        var t = names[Math.floor(rnd() * names.length)];
        if (g.indexOf(t) === -1) g.push(t);
      }
      g.forEach(function (t) {
        counts[t] = (counts[t] || 0) + 1;
      });
      posts.push({ t: 'Sample ' + (i + 1), u: '#', d: '', g: g });
    }
    return {
      tags: Object.keys(counts)
        .sort()
        .map(function (n) {
          return { n: n, c: counts[n], u: '#' };
        }),
      posts: posts
    };
  }

  var nodes = [];
  var links = [];
  var tagByName = {};
  var MAX_LABEL = 26;
  var SHOW_POST_LABELS_UP_TO = 12;

  raw.tags.forEach(function (t) {
    var n = makeNode('tag', t.n, t.u);
    n.count = t.c;
    n.r = Math.min(10.5, 5 + 1.7 * Math.sqrt(t.c));
    n.q = 1;
    tagByName[t.n] = n;
    nodes.push(n);
  });

  raw.posts.forEach(function (p) {
    var tags = (p.g || []).filter(function (g) {
      return tagByName[g];
    });
    if (!tags.length) return;
    var n = makeNode('post', p.t, p.u);
    n.date = p.d;
    n.tags = tags;
    n.r = 3.4;
    n.q = 0.5;
    nodes.push(n);
    tags.forEach(function (g) {
      var tn = tagByName[g];
      links.push({ a: n, b: tn });
      n.nbrs.push(tn);
      tn.nbrs.push(n);
    });
  });

  if (!nodes.length) {
    root.hidden = true;
    return;
  }

  var postCount = nodes.filter(function (n) {
    return n.kind === 'post';
  }).length;
  var showPostLabels = postCount <= SHOW_POST_LABELS_UP_TO;

  function makeNode(kind, label, url) {
    return {
      kind: kind,
      label: label,
      url: url,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      r: 4,
      q: 1,
      nbrs: [],
      a: 1,
      ta: 1,
      pinned: false,
      w: 0,
      h: 0,
      off: 0 // vertical offset of the label box from the star's centre
    };
  }

  /* ------------------------------------------------------------- helpers */

  function hash01(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clip(s) {
    return s.length > MAX_LABEL ? s.slice(0, MAX_LABEL - 1).trimEnd() + '…' : s;
  }

  function isNbr(a, b) {
    return a.nbrs.indexOf(b) !== -1;
  }

  /* ---------------------------------------------------------------- size */

  var cssW = 0;
  var cssH = 0;
  var dpr = 1;
  var fontFamily = 'sans-serif';
  var LABEL_FONT = '13px ';
  var TAG_FONT = '600 13px ';

  function measure() {
    fontFamily = window.getComputedStyle(root).fontFamily || 'sans-serif';
    nodes.forEach(function (n) {
      n.text = n.kind === 'post' ? clip(n.label) : n.label;
      var hasLabel = n.kind === 'tag' || showPostLabels;
      if (hasLabel) {
        ctx.font = (n.kind === 'tag' ? TAG_FONT : LABEL_FONT) + fontFamily;
        n.w = Math.max(ctx.measureText(n.text).width + 16, n.r * 2 + 16);
        n.h = n.r * 2 + 32; // star above, label below
        n.off = 8;
      } else {
        n.w = n.r * 2 + 16;
        n.h = n.r * 2 + 16;
        n.off = 0;
      }
    });
  }

  /* -------------------------------------------------------------- layout */

  var REP = 330; // star-to-star repulsion
  var LINK = 0.1; // spring stiffness along a post-tag line
  var GRAVITY = 0.024; // pull towards the centre
  var DAMP = 0.78;
  var EDGE = 10; // keep this far from the panel edge
  var spread = 1; // how loosely to lay things out, from the panel size

  function restLength(l) {
    return (70 + 7 * Math.sqrt(l.b.count)) * spread;
  }

  function seedPositions() {
    var tags = nodes.filter(function (n) {
      return n.kind === 'tag';
    });
    var rx = Math.max(60, cssW * 0.3);
    var ry = Math.max(60, cssH * 0.3);
    tags.forEach(function (n, i) {
      var ang = (i / tags.length) * Math.PI * 2 + hash01('a' + n.label) * 0.6;
      n.x = Math.cos(ang) * rx;
      n.y = Math.sin(ang) * ry;
      n.vx = n.vy = 0;
      n.pinned = false;
    });
    nodes.forEach(function (n) {
      if (n.kind !== 'post') return;
      var cx = 0;
      var cy = 0;
      n.nbrs.forEach(function (t) {
        cx += t.x;
        cy += t.y;
      });
      cx /= n.nbrs.length;
      cy /= n.nbrs.length;
      n.x = cx + (hash01('x' + n.label) - 0.5) * 50;
      n.y = cy + (hash01('y' + n.label) - 0.5) * 50;
      n.vx = n.vy = 0;
      n.pinned = false;
    });
  }

  // Keep every star, and its label, inside the panel.
  function clampAll() {
    nodes.forEach(function (n) {
      if (n.pinned) return;
      var hw = n.w / 2 + EDGE;
      var up = n.h / 2 - n.off + EDGE;
      var down = n.h / 2 + n.off + EDGE;
      n.x = Math.min(Math.max(n.x, -cssW / 2 + hw), cssW / 2 - hw);
      n.y = Math.min(Math.max(n.y, -cssH / 2 + up), cssH / 2 - down);
    });
  }

  function tick(alpha) {
    var i;
    var j;
    var a;
    var b;
    var dx;
    var dy;
    var d;
    var f;
    var n = nodes.length;

    for (i = 0; i < n; i++) {
      nodes[i].fx = 0;
      nodes[i].fy = 0;
    }
    for (i = 0; i < n; i++) {
      a = nodes[i];
      for (j = i + 1; j < n; j++) {
        b = nodes[j];
        dx = b.x - a.x;
        dy = b.y - a.y;
        d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.5) {
          dx = hash01(a.label + b.label) - 0.5;
          dy = hash01(b.label + a.label) - 0.5;
          d = 0.5;
        }
        if (d > 460) continue;
        f = (REP * a.q * b.q) / d;
        dx /= d;
        dy /= d;
        a.fx -= f * dx;
        a.fy -= f * dy;
        b.fx += f * dx;
        b.fy += f * dy;
      }
    }
    links.forEach(function (l) {
      dx = l.b.x - l.a.x;
      dy = l.b.y - l.a.y;
      d = Math.sqrt(dx * dx + dy * dy) || 0.5;
      f = (d - restLength(l)) * LINK;
      dx /= d;
      dy /= d;
      l.a.fx += f * dx;
      l.a.fy += f * dy;
      l.b.fx -= f * dx;
      l.b.fy -= f * dy;
    });
    for (i = 0; i < n; i++) {
      a = nodes[i];
      a.fx -= a.x * GRAVITY;
      a.fy -= a.y * GRAVITY * 1.25;
      if (a.pinned) {
        a.vx = a.vy = 0;
        continue;
      }
      a.vx = (a.vx + a.fx * alpha) * DAMP;
      a.vy = (a.vy + a.fy * alpha) * DAMP;
      a.x += a.vx;
      a.y += a.vy;
    }
    separate();
  }

  // Keep every star and its label clear of its neighbours.
  function separate() {
    var i;
    var j;
    var a;
    var b;
    var ox;
    var oy;
    var dx;
    var dy;
    var s;
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j];
        dx = b.x - a.x;
        dy = b.y + b.off - (a.y + a.off);
        ox = (a.w + b.w) / 2 - Math.abs(dx);
        oy = (a.h + b.h) / 2 - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        if (ox < oy) {
          s = (dx < 0 ? -1 : 1) * ox * 0.5;
          if (!a.pinned) a.x -= s;
          if (!b.pinned) b.x += s;
        } else {
          s = (dy < 0 ? -1 : 1) * oy * 0.5;
          if (!a.pinned) a.y -= s;
          if (!b.pinned) b.y += s;
        }
      }
    }
    clampAll();
  }

  function settle() {
    var steps = Math.min(700, 260 + nodes.length * 4);
    for (var i = 0; i < steps; i++) {
      tick(Math.max(0.02, 1 - i / steps));
    }
    // final pass: nothing but untangling, so no label sits on another star
    for (var k = 0; k < 60; k++) separate();
    nodes.forEach(function (n) {
      n.vx = n.vy = 0;
    });
  }

  /* ---------------------------------------------------------------- view */

  var view = { k: 1, x: 0, y: 0 };
  var viewTarget = { k: 1, x: 0, y: 0 };

  // Nothing is scaled: the map is laid out in real pixels. We only centre it.
  function computeFit() {
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    nodes.forEach(function (n) {
      minX = Math.min(minX, n.x - n.w / 2);
      maxX = Math.max(maxX, n.x + n.w / 2);
      minY = Math.min(minY, n.y + n.off - n.h / 2);
      maxY = Math.max(maxY, n.y + n.off + n.h / 2);
    });
    return {
      k: 1,
      x: cssW / 2 - (minX + maxX) / 2,
      y: cssH / 2 - (minY + maxY) / 2
    };
  }

  function refit(instant) {
    var t = computeFit();
    viewTarget.k = t.k;
    viewTarget.x = t.x;
    viewTarget.y = t.y;
    if (instant || reduceMotion) {
      view.k = t.k;
      view.x = t.x;
      view.y = t.y;
    }
    requestDraw();
  }

  function sx(x) {
    return x * view.k + view.x;
  }
  function sy(y) {
    return y * view.k + view.y;
  }

  function sizeK() {
    return 1;
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(240, Math.round(rect.width));
    var h = Math.max(260, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (w === cssW && h === cssH && canvas.width === Math.round(w * dpr)) return;
    cssW = w;
    cssH = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    buildDust();
    if (!measured) return;
    layoutAll();
    refit(true);
  }

  var measured = false;

  // Looser for a roomy panel, tighter for a phone.
  function layoutAll() {
    var room = Math.min(cssW / 1.8, cssH) / 520;
    var sparse = nodes.length <= 6 ? 1.7 : nodes.length <= 18 ? 1.2 : 1;
    spread = Math.min(1.5, Math.max(0.62, room * sparse));
    simAlpha = 0;
    seedPositions();
    settle();
  }

  /* --------------------------------------------------------------- theme */

  var pal = null;

  function toRGB(str, fallback) {
    var c = document.createElement('canvas').getContext('2d');
    c.fillStyle = fallback;
    c.fillStyle = str || fallback;
    var s = c.fillStyle;
    var m;
    if (s.charAt(0) === '#') {
      var v = parseInt(s.slice(1), 16);
      return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    }
    m = s.match(/[\d.]+/g);
    return m ? [+m[0], +m[1], +m[2]] : [128, 128, 128];
  }

  function rgba(c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  function readPalette() {
    var cs = window.getComputedStyle(html);
    var get = function (n) {
      return cs.getPropertyValue(n).trim();
    };
    var theme = html.getAttribute('data-bs-theme');
    var dark =
      theme === 'dark' ||
      (theme !== 'light' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    pal = {
      dark: dark,
      bg: toRGB(get('--main-bg'), dark ? '#000' : '#fff'),
      text: toRGB(get('--text-color'), dark ? '#e6edf3' : '#222'),
      muted: toRGB(get('--text-muted-color'), '#888'),
      accent: toRGB(get('--link-color'), '#3b82f6')
    };
  }

  /* ---------------------------------------------------------------- dust */

  var dust = [];

  function buildDust() {
    var rnd = mulberry32(20260729);
    var count = Math.round((cssW * cssH) / 5200);
    dust = [];
    for (var i = 0; i < count; i++) {
      dust.push({
        x: rnd(),
        y: rnd(),
        r: 0.35 + rnd() * 0.75,
        a: 0.05 + rnd() * 0.17
      });
    }
  }

  /* --------------------------------------------------------------- noise */

  // A faint, evenly random grain laid over the sky glow. Soft gradients on a
  // flat colour show visible bands; the grain dithers them away.
  var noise = null;

  function buildNoise() {
    var size = 128;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var nctx = c.getContext('2d');
    var img = nctx.createImageData(size, size);
    var rnd = mulberry32(7);
    for (var i = 0; i < size * size; i++) {
      var v = rnd() < 0.5 ? 0 : 255;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 5;
    }
    nctx.putImageData(img, 0, 0);
    noise = ctx.createPattern(c, 'repeat');
  }

  /* ---------------------------------------------------------------- draw */

  var focus = null; // hovered (mouse) or selected (touch) star
  var dirty = true;
  var rafId = 0;
  var simAlpha = 0;
  var dragging = null;

  function requestDraw() {
    dirty = true;
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  function frame() {
    rafId = 0;
    var busy = false;
    var i;

    if (simAlpha > 0.012) {
      for (i = 0; i < 2; i++) tick(simAlpha);
      simAlpha *= 0.972;
      busy = true;
    } else if (simAlpha > 0) {
      simAlpha = 0;
      if (!dragging) refit(false);
    }

    nodes.forEach(function (n) {
      var diff = n.ta - n.a;
      if (Math.abs(diff) > 0.004) {
        n.a = reduceMotion ? n.ta : n.a + diff * 0.2;
        busy = true;
      } else {
        n.a = n.ta;
      }
    });

    ['k', 'x', 'y'].forEach(function (key) {
      var diff = viewTarget[key] - view[key];
      var eps = key === 'k' ? 0.0005 : 0.05;
      if (Math.abs(diff) > eps) {
        view[key] = reduceMotion ? viewTarget[key] : view[key] + diff * 0.16;
        busy = true;
      } else {
        view[key] = viewTarget[key];
      }
    });

    draw();
    dirty = false;
    if (busy || dirty) rafId = requestAnimationFrame(frame);
  }

  function draw() {
    if (!pal) readPalette();
    var W = cssW;
    var H = cssH;
    var sk = sizeK();
    var dark = pal.dark;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // sky glow, tinted by the site's accent, with grain to stop banding
    var gw = ctx.createRadialGradient(W / 2, H * 0.44, 0, W / 2, H * 0.44, Math.max(W, H) * 0.62);
    var gk = dark ? 0.1 : 0.075;
    gw.addColorStop(0, rgba(pal.accent, gk));
    gw.addColorStop(0.45, rgba(pal.accent, gk * 0.45));
    gw.addColorStop(1, rgba(pal.accent, 0));
    ctx.fillStyle = gw;
    ctx.fillRect(0, 0, W, H);
    if (!noise) buildNoise();
    ctx.fillStyle = noise;
    ctx.fillRect(0, 0, W, H);

    // dust: the faintest background stars
    var dustCol = dark ? [255, 255, 255] : pal.text;
    var dustK = dark ? 1 : 0.7;
    for (var i = 0; i < dust.length; i++) {
      var s = dust[i];
      ctx.fillStyle = rgba(dustCol, (s.a * dustK).toFixed(3));
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, 6.2832);
      ctx.fill();
    }

    // lines
    ctx.lineCap = 'round';
    links.forEach(function (l) {
      var on = focus && (l.a === focus || l.b === focus);
      var vis = Math.min(l.a.a, l.b.a);
      var alpha;
      if (on) alpha = 0.85;
      else alpha = (dark ? 0.26 : 0.34) * vis + (focus ? 0 : 0);
      ctx.strokeStyle = on ? rgba(pal.accent, alpha) : rgba(pal.muted, alpha.toFixed(3));
      ctx.lineWidth = on ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(sx(l.a.x), sy(l.a.y));
      ctx.lineTo(sx(l.b.x), sy(l.b.y));
      ctx.stroke();
    });

    // stars (posts first so the bright tag stars sit on top)
    var order = nodes.slice().sort(function (p, q) {
      return (p.kind === 'tag') - (q.kind === 'tag');
    });
    order.forEach(function (n) {
      var x = sx(n.x);
      var y = sy(n.y);
      var r = n.r * sk;
      var al = n.a;
      var g;
      if (n.kind === 'tag') {
        var halo = r * 4.2;
        g = ctx.createRadialGradient(x, y, 0, x, y, halo);
        g.addColorStop(0, rgba(pal.accent, (dark ? 0.42 : 0.24) * al));
        g.addColorStop(1, rgba(pal.accent, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, halo, 0, 6.2832);
        ctx.fill();

        // a faint four-point glint
        var arm = r * 2.6;
        ctx.lineWidth = 1;
        [
          [1, 0],
          [0, 1]
        ].forEach(function (v) {
          var lg = ctx.createLinearGradient(
            x - v[0] * arm,
            y - v[1] * arm,
            x + v[0] * arm,
            y + v[1] * arm
          );
          lg.addColorStop(0, rgba(pal.accent, 0));
          lg.addColorStop(0.5, rgba(pal.accent, 0.55 * al));
          lg.addColorStop(1, rgba(pal.accent, 0));
          ctx.strokeStyle = lg;
          ctx.beginPath();
          ctx.moveTo(x - v[0] * arm, y - v[1] * arm);
          ctx.lineTo(x + v[0] * arm, y + v[1] * arm);
          ctx.stroke();
        });

        ctx.fillStyle = rgba(pal.accent, al);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = dark ? 'rgba(255,255,255,' + 0.85 * al + ')' : rgba(pal.bg, 0.8 * al);
        ctx.beginPath();
        ctx.arc(x, y, r * 0.38, 0, 6.2832);
        ctx.fill();
      } else {
        var h2 = r * 3.4;
        g = ctx.createRadialGradient(x, y, 0, x, y, h2);
        g.addColorStop(0, rgba(dark ? [255, 255, 255] : pal.text, (dark ? 0.22 : 0.12) * al));
        g.addColorStop(1, rgba(dark ? [255, 255, 255] : pal.text, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, h2, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = rgba(dark ? [255, 255, 255] : pal.text, 0.9 * al);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 6.2832);
        ctx.fill();
      }

      if (n === focus) {
        ctx.strokeStyle = rgba(pal.accent, 0.9);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r + 5, 0, 6.2832);
        ctx.stroke();
      }
    });

    // labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    nodes.forEach(function (n) {
      var tag = n.kind === 'tag';
      var show = tag || showPostLabels || n === focus || (focus && isNbr(focus, n));
      if (!show) return;
      var al = n.a;
      var r = n.r * sk;
      ctx.font = (tag ? TAG_FONT : LABEL_FONT) + fontFamily;
      var tw = ctx.measureText(n.text).width;
      var x = Math.min(Math.max(sx(n.x), tw / 2 + 6), W - tw / 2 - 6);
      var y = sy(n.y) + r + (tag ? 18 : 16);
      ctx.lineWidth = 4;
      ctx.strokeStyle = rgba(pal.bg, (0.9 * al).toFixed(3));
      ctx.strokeText(n.text, x, y);
      ctx.fillStyle = tag ? rgba(pal.text, al) : rgba(pal.text, (0.74 * al).toFixed(3));
      ctx.fillText(n.text, x, y);
    });
  }

  /* --------------------------------------------------------- interaction */

  var selected = null; // touch selection
  var down = null;

  function setFocus(n) {
    if (n === focus) return;
    focus = n;
    nodes.forEach(function (m) {
      m.ta = !focus || m === focus || isNbr(focus, m) ? 1 : 0.16;
    });
    updateCaption();
    requestDraw();
  }

  function pointerPos(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function hit(p, touch) {
    var best = null;
    var bestD = Infinity;
    var pad = touch ? 14 : 7;
    var sk = sizeK();
    nodes.forEach(function (n) {
      var d = Math.hypot(sx(n.x) - p.x, sy(n.y) - p.y);
      if (d <= n.r * sk + pad && d < bestD) {
        best = n;
        bestD = d;
      }
    });
    return best;
  }

  var HINT = locked
    ? 'A preview. ' + realPosts + ' of ' + UNLOCK_AT + ' tagged posts so far.'
    : coarse
    ? 'Tap a star to see what it is.'
    : 'Hover a star to light its lines. Click to open. Drag to move.';

  function updateCaption() {
    capEl.textContent = '';
    if (!focus) {
      var hint = document.createElement('span');
      hint.className = 'cc-hint';
      hint.textContent = HINT;
      capEl.appendChild(hint);
      return;
    }
    var title = document.createElement('strong');
    title.textContent = focus.label;
    var meta = document.createElement('span');
    meta.className = 'cc-meta';
    var link = document.createElement('a');
    link.href = focus.url;
    if (focus.kind === 'tag') {
      meta.textContent = focus.count + (focus.count === 1 ? ' post' : ' posts');
      link.textContent = 'See posts →';
    } else {
      meta.textContent = focus.date + ' · ' + focus.tags.join(', ');
      link.textContent = 'Read →';
    }
    capEl.appendChild(title);
    capEl.appendChild(meta);
    capEl.appendChild(link);
  }

  canvas.addEventListener('pointermove', function (e) {
    var p = pointerPos(e);
    if (down && down.node && e.pointerType === 'mouse') {
      if (!down.moved && Math.hypot(p.x - down.x, p.y - down.y) > 4) {
        down.moved = true;
        dragging = down.node;
        dragging.pinned = true;
        canvas.style.cursor = 'grabbing';
      }
      if (down.moved) {
        var k = view.k || 1;
        dragging.x = (Math.min(Math.max(p.x, 14), cssW - 14) - view.x) / k;
        dragging.y = (Math.min(Math.max(p.y, 14), cssH - 14) - view.y) / k;
        simAlpha = Math.max(simAlpha, 0.35);
        requestDraw();
      }
      return;
    }
    if (e.pointerType === 'touch') return;
    var n = hit(p, false);
    canvas.style.cursor = n ? 'pointer' : 'default';
    setFocus(n);
  });

  canvas.addEventListener('pointerdown', function (e) {
    var p = pointerPos(e);
    var n = hit(p, e.pointerType === 'touch');
    down = { x: p.x, y: p.y, node: n, moved: false, type: e.pointerType };
    if (n && e.pointerType === 'mouse') {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
    }
  });

  function release(e) {
    if (!down) return;
    var d = down;
    down = null;
    if (dragging) {
      // the star stays where it was dropped; the others settle around it
      dragging = null;
      canvas.style.cursor = 'default';
      simAlpha = Math.max(simAlpha, 0.2);
      requestDraw();
      return;
    }
    if (e.type === 'pointercancel') return;
    var n = d.node;
    if (d.type === 'touch') {
      if (n && n === selected) {
        window.location.href = n.url;
      } else {
        selected = n;
        setFocus(n);
      }
    } else if (n) {
      window.location.href = n.url;
    }
  }

  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'touch' || down) return;
    setFocus(selected);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (selected || focus)) {
      selected = null;
      setFocus(null);
    }
  });

  /* ---------------------------------------------------------------- boot */

  // follow the site's look when it is switched
  new MutationObserver(function () {
    readPalette();
    requestDraw();
  }).observe(html, {
    attributes: true,
    attributeFilter: ['data-bs-theme', 'data-light-scheme', 'data-dark-scheme']
  });

  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener('resize', resize);
  }

  function boot() {
    readPalette();
    measure();
    measured = true;
    cssW = 0; // force resize() to lay the map out for the real panel size
    resize();
    updateCaption();
    refit(true);
    if (locked) {
      root.classList.add('is-locked');
      canvas.removeAttribute('role');
      canvas.setAttribute('aria-hidden', 'true');
      var note = document.createElement('div');
      note.className = 'constellation-lock';
      var h = document.createElement('strong');
      h.textContent = 'Work in progress';
      note.appendChild(h);
      root.insertBefore(note, root.querySelector('.constellation-bar'));
    }
    root.classList.add('is-ready');
    var list = document.querySelector('.constellation-list');
    if (list) list.open = false; // the map takes over; the list stays one click away
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot);
  } else {
    boot();
  }
})();
