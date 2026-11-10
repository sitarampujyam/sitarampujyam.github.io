/**
 * Rocky, the Eridian engineer from Project Hail Mary.
 *
 * Behaviour
 *  - Waves when the page loads.
 *  - While awake he wanders along the bottom of the screen.
 *  - Only loaded on the home page.
 *  - First click: "Fist my bump!" with a fist bump. Later clicks: his thumbs up,
 *    which is a thumbs down (one claw pointing down, as in the film).
 *  - Hover: "Talk to Rocky" opens a small chat. With `rocky_ai_url` set it talks
 *    through the AI proxy in rocky-worker/; otherwise (or on error) it falls back
 *    to simple phrase matching.
 *  - Keep playing with him: "AMAZE! AMAZE! AMAZE!".
 *  - Now and then: "Grace Rocky save stars." (the translator-screen line).
 *  - Ignored for 15 s: he settles down and sleeps. Click to wake him.
 */
(function () {
  'use strict';

  if (window.__rockyLoaded) return;
  window.__rockyLoaded = true;

  // Optional AI chat endpoint (the Cloudflare Worker in rocky-worker/), set via
  // `rocky_ai_url` in _config.yml. Empty = phrase matching only.
  var AI_URL = (document.currentScript && document.currentScript.getAttribute('data-ai-url')) || '';
  var AI_TIMEOUT_MS = 12000;

  var SLEEP_AFTER_MS = 15000;
  var COMBO_WINDOW_MS = 3000;
  var COMBO_CLICKS = 5;
  var STARS_COOLDOWN_MS = 45000;
  var STARS_LINE = 'Grace Rocky save stars.';
  var AMAZE_LINE = 'AMAZE! AMAZE! AMAZE!';
  var BUMP_LINE = 'Fist my bump!';
  var WALK_SPEED = 34; // px per second

  var reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ */
  /* Artwork: low-poly carved stone, lit from the top left               */
  /* ------------------------------------------------------------------ */

  var INK = '#33261a';
  var STONE = { hi: '#d6b97f', mid: '#b4925a', lo: '#7f6239', deep: '#5a4428' };
  var STONE_BACK = { hi: '#ac8d58', mid: '#8f7246', lo: '#634b2b', deep: '#47351f' };
  var TEAL = '#4d9c84';
  var TEAL_HI = '#6cc3ab';

  function f(n) { return Math.round(n * 10) / 10; }
  function pts(list) {
    return list.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' ');
  }
  function poly(list, fill, extra) {
    return '<polygon points="' + pts(list) + '" fill="' + fill + '"' + (extra || '') + '/>';
  }
  function outline(list, w) {
    return '<polygon points="' + pts(list) + '" fill="none" stroke="' + INK + '" stroke-width="' +
      (w || 1.8) + '" stroke-linejoin="round"/>';
  }

  // A tapered stone slab from p1 to p2, split into a lit face and a shadow face.
  function slab(p1, p2, w1, w2, pal, grooves) {
    var dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len;
    if (nx + ny > 0) { nx = -nx; ny = -ny; } // n points towards the light (top left)
    function off(p, k) { return [p[0] + nx * k, p[1] + ny * k]; }
    var a1 = off(p1, w1 / 2), a2 = off(p2, w2 / 2);
    var b1 = off(p1, -w1 / 2), b2 = off(p2, -w2 / 2);
    var r1 = off(p1, w1 * 0.08), r2 = off(p2, w2 * 0.08);
    var out =
      poly([a1, a2, r2, r1], pal.hi) +
      poly([r1, r2, b2, b1], pal.lo) +
      outline([a1, a2, b2, b1]);
    // carved markings across the slab
    for (var i = 0; i < (grooves || 0); i++) {
      var t = 0.38 + i * 0.13;
      var c = [p1[0] + dx * t, p1[1] + dy * t];
      var w = w1 + (w2 - w1) * t;
      var g1 = off(c, w * 0.36), g2 = off(c, -w * 0.12);
      out += '<line x1="' + f(g1[0]) + '" y1="' + f(g1[1]) + '" x2="' + f(g2[0]) + '" y2="' + f(g2[1]) +
        '" stroke="' + INK + '" stroke-width="1" stroke-linecap="round" opacity=".55"/>';
    }
    return out;
  }

  // Chunky knuckle at a knee.
  function knuckle(p, r, pal) {
    var h = [];
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 3) * i + Math.PI / 6;
      h.push([p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r * 0.92]);
    }
    // h: 0 lower-right, 1 bottom, 2 lower-left, 3 upper-left, 4 top, 5 upper-right
    return (
      poly([h[2], h[3], h[4], h[5], p], pal.mid) +
      poly([h[5], h[0], h[1], h[2], p], pal.lo) +
      poly([h[3], h[4], p], pal.hi) +
      outline(h)
    );
  }

  // Blunt three-fingered hand, the fingers resting on the ground.
  function hand(p, pal) {
    var x = p[0], y = p[1];
    return (
      slab([x - 3.6, y - 1.5], [x - 6.4, y + 4.6], 4.8, 4.2, pal) +
      slab([x + 3.6, y - 1.5], [x + 6.4, y + 4.6], 4.8, 4.2, pal) +
      slab([x, y - 1], [x, y + 5.4], 5, 4.4, pal)
    );
  }

  function leg(cls, shoulder, knee, foot, pal, patch) {
    var straight = knee[0] === shoulder[0] && knee[1] === shoulder[1];
    return (
      '<g class="rk-leg ' + cls + '">' +
      (straight ? '' : slab(shoulder, knee, 14.5, 13, pal, 0)) +
      slab(knee, foot, 16, 11.5, pal, 3) +
      hand(foot, pal) +
      (straight ? '' : knuckle(knee, 8.6, pal)) +
      (patch ? poly(patch, TEAL, ' opacity=".7"') : '') +
      '</g>'
    );
  }

  // Carapace: a five-sided, faceted stone block.
  var shellOutline = [[55, 31], [67, 19], [81, 17.5], [93, 19.5], [105, 31], [109, 50], [98, 67], [62, 67], [51, 50]];
  var shell =
    '<g class="rk-shell">' +
    poly([[55, 31], [67, 19], [81, 17.5], [93, 19.5], [105, 31], [93, 37], [67, 37]], STONE.hi) +
    poly([[55, 31], [67, 37], [65, 59], [51, 50]], STONE.mid) +
    poly([[67, 37], [93, 37], [95, 59], [65, 59]], '#c3a167') +
    poly([[93, 37], [105, 31], [109, 50], [95, 59]], STONE.lo) +
    poly([[51, 50], [65, 59], [95, 59], [109, 50], [98, 67], [62, 67]], STONE.deep) +
    // facet edges
    '<g fill="none" stroke="' + INK + '" stroke-width="1.1" stroke-linejoin="round" opacity=".7">' +
    '<polyline points="55,31 67,37 93,37 105,31"/>' +
    '<polyline points="67,37 65,59"/><polyline points="93,37 95,59"/>' +
    '<polyline points="51,50 65,59 95,59 109,50"/>' +
    '</g>' +
    // cracks
    '<g fill="none" stroke="' + INK + '" stroke-width=".9" stroke-linecap="round" opacity=".55">' +
    '<polyline points="74,21 77,27 75,33"/><polyline points="86,43 83,49 85,54"/>' +
    '<polyline points="58,40 61,46"/><polyline points="100,40 98,47"/>' +
    '</g>' +
    // teal mineral patches
    poly([[71, 42], [79, 40], [82, 46], [76, 50], [70, 48]], TEAL) +
    poly([[73, 42], [78, 41], [77, 44]], TEAL_HI, ' opacity=".8"') +
    poly([[86, 23], [92, 25], [89, 29], [84, 27]], TEAL, ' opacity=".9"') +
    poly([[54, 44], [59, 42], [60, 49], [55, 50]], TEAL, ' opacity=".75"') +
    poly([[99, 52], [104, 49], [102, 56]], TEAL, ' opacity=".7"') +
    // sun-bleached top edge
    poly([[67, 21], [81, 19.5], [83, 22], [69, 24]], '#e8d3a2', ' opacity=".6"') +
    outline(shellOutline, 2.2) +
    '</g>';

  // Raised limb for waving, thumbs-up and fist bumps (replaces the back-right leg).
  var SH = [101, 41], KN = [124, 25], TIP = [128, 3];

  // A chunky stone fist: lit top band, shaded body, chamfered corners.
  function fistBlock(b) {
    return (
      poly(b.body, STONE.mid) +
      poly(b.top, STONE.hi) +
      poly(b.side, STONE.lo) +
      outline(b.body)
    );
  }
  var sideFist = {
    body: [[120, -2], [133, -3], [138.5, 1], [138, 10], [133.5, 13], [121, 13], [118, 9], [118, 1]],
    top: [[120, -2], [133, -3], [138.5, 1], [126, 1.6], [118, 1]],
    side: [[121, 13], [133.5, 13], [138, 10], [126, 10.5], [118, 9]]
  };
  var frontFist = {
    body: [[119, -7], [138, -7], [141, -3], [141, 9], [137, 13], [120, 13], [116, 9], [116, -3]],
    top: [[119, -7], [138, -7], [141, -3], [116, -3]],
    side: [[120, 13], [137, 13], [141, 9], [116, 9]]
  };
  var arm =
    '<g class="rk-arm">' +
    slab(SH, KN, 14.5, 13, STONE, 0) +
    '<g class="rk-fore">' +
    slab(KN, TIP, 15, 11, STONE, 3) +
    '<g class="rk-hand-wave">' +
    slab([TIP[0] - 3.5, TIP[1] + 1], [TIP[0] - 8.5, TIP[1] - 5.5], 4.8, 4.2, STONE) +
    slab([TIP[0], TIP[1]], [TIP[0] + 1, TIP[1] - 7.5], 5, 4.4, STONE) +
    slab([TIP[0] + 4, TIP[1] + 1], [TIP[0] + 9.5, TIP[1] - 4], 4.8, 4.2, STONE) +
    '</g>' +
    // Rocky's "thumbs up, baby": two claws curled into a fist and the
    // third pointing DOWN (he got the human gesture upside down).
    '<g class="rk-hand-thumb">' +
    slab([135.5, 9], [139, 25], 7, 5.6, STONE) +
    poly([[136.4, 25.6], [141.6, 24.4], [140.6, 28.8], [137.6, 29.4]], STONE.lo) +
    outline([[136.4, 25.6], [141.6, 24.4], [140.6, 28.8], [137.6, 29.4]], 1.4) +
    fistBlock(sideFist) +
    '<g fill="none" stroke="' + INK + '" stroke-width="1.2" stroke-linecap="round" opacity=".7">' +
    '<polyline points="127,3.4 133,3 137.5,4.6"/><polyline points="127,8.4 133,8 137,9.6"/>' +
    '</g>' +
    '</g>' +
    // Fist bump: a closed fist, three knuckles towards you.
    '<g class="rk-hand-fist">' +
    fistBlock(frontFist) +
    '<g fill="none" stroke="' + INK + '" stroke-width="1.2" stroke-linecap="round" opacity=".7">' +
    '<line x1="123.5" y1="-4" x2="123.5" y2="3"/><line x1="128.5" y1="-4.5" x2="128.5" y2="3"/>' +
    '<line x1="133.5" y1="-4" x2="133.5" y2="3"/>' +
    '</g>' +
    '</g>' +
    knuckle(KN, 8.6, STONE) +
    poly([[KN[0] + 1, KN[1] + 7], [KN[0] + 5, KN[1] + 9], [KN[0] + 3, KN[1] + 13]], TEAL) +
    '</g>' +
    '</g>';

  var svg =
    '<svg viewBox="0 0 160 120" aria-hidden="true" focusable="false">' +
    '<ellipse class="rk-ground" cx="80" cy="113" rx="62" ry="4" fill="#000" opacity=".16"/>' +
    '<g class="rk-legs">' +
    leg('rk-a rk-leg-l1', [58, 42], [30, 24], [22, 103], STONE_BACK, [[24, 56], [29, 54], [28, 62]]) +
    leg('rk-b rk-leg-r1', [102, 42], [130, 24], [138, 103], STONE_BACK, null) +
    '</g>' +
    '<g class="rk-pose"><g class="rk-breathe">' + arm +
    '<g transform="translate(80 44) scale(1.16) translate(-80 -44)">' + shell + '</g></g></g>' +
    '<g class="rk-legs">' +
    leg('rk-b rk-leg-l2', [63, 60], [38, 47], [43, 104], STONE, [[35, 66], [40, 64], [41, 71], [36, 73]]) +
    leg('rk-a rk-leg-r2', [97, 60], [122, 47], [117, 104], STONE, [[121, 82], [124, 80], [124, 86]]) +
    leg('rk-a rk-leg-c', [80, 66], [80, 66], [80, 104], STONE, [[77, 84], [82, 82], [81, 89], [77, 90]]) +
    '</g>' +
    '</svg>';

  /* ------------------------------------------------------------------ */
  /* Styles                                                              */
  /* ------------------------------------------------------------------ */

  var css = [
    '#rocky{--rk-bubble-bg:#fffdf8;--rk-bubble-fg:#33261a;--rk-bubble-bd:rgba(51,38,26,.15);',
    '--rk-tag-bg:#33261a;--rk-tag-fg:#fff8ee;--rk-z:#8a7a66;--rk-x:0px;',
    'position:fixed;right:72px;bottom:calc(4px + var(--rk-lift,0px));width:112px;height:84px;z-index:1025;',
    'transform:translateX(var(--rk-x));user-select:none;-webkit-user-select:none;',
    '-webkit-tap-highlight-color:transparent;pointer-events:none}',
    'html[data-bs-theme=dark] #rocky{--rk-bubble-bg:#2a2520;--rk-bubble-fg:#f3e9dc;',
    '--rk-bubble-bd:rgba(255,240,220,.15);--rk-tag-bg:#f3e9dc;--rk-tag-fg:#2a2520;--rk-z:#a89b88}',
    '@media (prefers-color-scheme:dark){html:not([data-bs-theme=light]) #rocky{--rk-bubble-bg:#2a2520;',
    '--rk-bubble-fg:#f3e9dc;--rk-bubble-bd:rgba(255,240,220,.15);--rk-tag-bg:#f3e9dc;--rk-tag-fg:#2a2520;--rk-z:#a89b88}}',

    '#rocky .rk-btn{all:unset;display:block;width:100%;height:100%;cursor:pointer;pointer-events:auto;position:relative}',
    '#rocky .rk-btn:focus-visible{outline:2px dashed #3f9c86;outline-offset:2px;border-radius:12px}',
    '#rocky svg{display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.22))}',
    '#rocky svg *{transform-box:view-box}',

    /* "Talk to Rocky" pill (on hover) */
    '#rocky .rk-talk{all:unset;position:absolute;left:50%;bottom:calc(100% - 6px);transform:translate(-50%,4px);',
    'background:var(--rk-tag-bg);color:var(--rk-tag-fg);font-size:11.5px;font-weight:600;letter-spacing:.02em;',
    'padding:3px 10px;border-radius:999px;white-space:nowrap;cursor:pointer;opacity:0;pointer-events:none;',
    'transition:opacity .18s ease,transform .18s ease}',
    '#rocky:hover .rk-talk,#rocky .rk-talk:focus-visible,#rocky .rk-btn:focus-visible~.rk-talk{opacity:1;',
    'transform:translate(-50%,-6px);pointer-events:auto}',
    '#rocky .rk-talk:focus-visible{outline:2px solid #3f9c86;outline-offset:2px}',
    '#rocky.rocky--bubble .rk-talk,#rocky.rocky--chat .rk-talk{opacity:0!important;pointer-events:none!important}',

    /* chat box: a thought above Rocky, styled like the site\'s glass cards */
    '#rocky .rk-chat{position:absolute;right:calc(-28px - var(--rk-shift,0px));bottom:calc(100% + 36px);width:min(272px,calc(100vw - 32px));',
    'box-sizing:border-box;padding:10px 10px 10px 12px;pointer-events:auto;',
    'background:var(--glass-surface,rgba(255,255,255,.85));border:1px solid var(--glass-edge,rgba(0,0,0,.1));',
    'border-radius:1.25rem;color:var(--text-color,#333);font-size:13.5px;line-height:1.4;',
    'box-shadow:0 .8rem 1.8rem var(--glass-shadow,rgba(0,0,0,.15)),inset 0 1px 0 var(--glass-highlight,rgba(255,255,255,.7));',
    '-webkit-backdrop-filter:blur(20px) saturate(160%);backdrop-filter:blur(20px) saturate(160%);',
    'opacity:0;visibility:hidden;transform:translateY(8px) scale(.96);transform-origin:75% 100%;',
    'transition:opacity .2s ease,transform .25s cubic-bezier(.3,1.4,.5,1),visibility 0s .25s}',
    '#rocky.rocky--chat .rk-chat{opacity:1;visibility:visible;transform:none;transition-delay:0s}',
    '#rocky .rk-chat-head{display:flex;align-items:center;justify-content:space-between;font-size:11.5px;',
    'font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted-color,#777);margin-bottom:4px}',
    '#rocky .rk-close{all:unset;cursor:pointer;font-size:17px;line-height:1;padding:0 4px;border-radius:6px;color:inherit}',
    '#rocky .rk-close:hover{color:var(--text-color,#333)}',
    '#rocky .rk-log{max-height:150px;overflow-y:auto;margin:0 0 8px;padding-right:2px}',
    '#rocky .rk-msg{margin:5px 0;padding:0;word-wrap:break-word}',
    '#rocky .rk-me{margin-left:28px;text-align:right;color:var(--text-muted-color,#777)}',
    '#rocky .rk-rocky{margin-right:12px;font-weight:600}',
    '#rocky .rk-act{font-weight:500;font-style:italic;color:#3f9c86}',
    '#rocky .rk-thinking i{display:inline-block;width:5px;height:5px;margin-right:4px;border-radius:50%;',
    'background:currentColor;opacity:.35;animation:rk-think 1s ease-in-out infinite}',
    '#rocky .rk-thinking i:nth-child(2){animation-delay:.15s}#rocky .rk-thinking i:nth-child(3){animation-delay:.3s}',
    '@keyframes rk-think{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:.8;transform:translateY(-2px)}}',
    '#rocky .rk-form{display:flex;gap:6px;margin:0}',
    '#rocky .rk-input{flex:1;min-width:0;font:inherit;font-size:13px;color:inherit;padding:6px 12px;',
    'border:1px solid var(--glass-edge,rgba(0,0,0,.12));border-radius:999px;background:var(--glass-card,rgba(255,255,255,.5));',
    'outline:none;box-shadow:inset 0 1px 2px rgba(0,0,0,.06)}',
    '#rocky .rk-input:focus{border-color:#3f9c86}',
    '#rocky .rk-send{all:unset;flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;',
    'cursor:pointer;background:var(--rk-tag-bg);color:var(--rk-tag-fg)}',
    '#rocky .rk-send:focus-visible{outline:2px solid #3f9c86;outline-offset:2px}',

    /* thought dots linking the box to Rocky */
    '#rocky .rk-dots{position:absolute;left:52%;bottom:calc(100% - 4px);width:34px;height:40px;pointer-events:none;',
    'opacity:0;transition:opacity .2s}',
    '#rocky.rocky--chat .rk-dots{opacity:1}',
    '#rocky .rk-dots i{position:absolute;border-radius:50%;background:var(--glass-surface,rgba(255,255,255,.85));',
    'border:1px solid var(--glass-edge,rgba(0,0,0,.1));box-shadow:0 2px 6px var(--glass-shadow,rgba(0,0,0,.12));',
    '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}',
    '#rocky .rk-dots i:nth-child(1){width:6px;height:6px;left:0;bottom:2px}',
    '#rocky .rk-dots i:nth-child(2){width:9px;height:9px;left:7px;bottom:13px}',
    '#rocky .rk-dots i:nth-child(3){width:12px;height:12px;left:16px;bottom:26px}',

    /* speech bubble */
    '#rocky .rk-bubble{position:absolute;right:34%;bottom:calc(100% + 4px);width:max-content;max-width:210px;',
    'background:var(--rk-bubble-bg);color:var(--rk-bubble-fg);border:1px solid var(--rk-bubble-bd);',
    'font-size:13px;line-height:1.35;font-weight:700;padding:7px 11px;border-radius:12px 12px 3px 12px;',
    'box-shadow:0 4px 14px rgba(0,0,0,.12);opacity:0;transform:translateY(6px) scale(.94);',
    'transform-origin:90% 100%;transition:opacity .2s ease,transform .25s cubic-bezier(.3,1.5,.5,1);pointer-events:none}',
    '#rocky.rocky--bubble .rk-bubble{opacity:1;transform:none}',
    '#rocky.rocky--chat .rk-bubble{opacity:0!important}',

    /* sleep marker */
    '#rocky .rk-zzz{position:absolute;left:56%;top:8%;color:var(--rk-z);font-weight:700;font-size:11px;',
    'opacity:0;pointer-events:none;transition:opacity .6s}',
    '#rocky .rk-zzz span{position:absolute}',
    '#rocky.rocky--sleep .rk-zzz{opacity:1}',
    '#rocky.rocky--sleep .rk-zzz span{animation:rk-z 4s ease-in-out infinite;opacity:0}',
    '#rocky .rk-zzz span:nth-child(2){animation-delay:1.3s!important;font-size:13px}',
    '#rocky .rk-zzz span:nth-child(3){animation-delay:2.6s!important;font-size:15px}',
    '@keyframes rk-z{0%{opacity:0;transform:translate(0,4px)}25%{opacity:.85}100%{opacity:0;transform:translate(16px,-22px)}}',

    /* body */
    '#rocky .rk-pose{transition:transform .8s cubic-bezier(.4,0,.2,1)}',
    '#rocky .rk-legs{transform-origin:80px 112px;transition:transform .8s cubic-bezier(.4,0,.2,1)}',
    '#rocky .rk-breathe{animation:rk-breathe 4s ease-in-out infinite}',
    '@keyframes rk-breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-1px)}}',
    '#rocky .rk-leg-l1{transform-origin:58px 42px}#rocky .rk-leg-r1{transform-origin:102px 42px}',
    '#rocky .rk-leg-l2{transform-origin:63px 58px}#rocky .rk-leg-r2{transform-origin:97px 58px}',
    '#rocky .rk-leg-c{transform-origin:80px 63px}',
    '#rocky .rk-arm{display:none;transform-origin:101px 41px}',
    '#rocky .rk-fore{transform-origin:124px 25px}',
    '#rocky .rk-hand-thumb,#rocky .rk-hand-fist{display:none}',

    /* walking: alternating leg sets, body bob */
    '#rocky.rocky--walk .rk-a{animation:rk-step .52s ease-in-out infinite}',
    '#rocky.rocky--walk .rk-b{animation:rk-step .52s ease-in-out -.26s infinite}',
    '#rocky.rocky--walk.rocky--left .rk-a,#rocky.rocky--walk.rocky--left .rk-b{animation-direction:reverse}',
    '@keyframes rk-step{0%,100%{transform:rotate(0) translateY(0)}25%{transform:rotate(-6deg) translateY(-3px)}',
    '50%{transform:rotate(0) translateY(0)}75%{transform:rotate(4deg) translateY(0)}}',
    '#rocky.rocky--walk .rk-breathe{animation:rk-bob .26s ease-in-out infinite alternate}',
    '@keyframes rk-bob{from{transform:translateY(0)}to{transform:translateY(-1.6px)}}',

    /* sleep: settles low, limbs splayed and still */
    '#rocky.rocky--sleep .rk-pose{transform:translateY(12px)}',
    '#rocky.rocky--sleep .rk-legs{transform:scale(1.07,.72)}',
    '#rocky.rocky--sleep .rk-breathe{animation:rk-breathe 6s ease-in-out infinite}',
    '#rocky.rocky--sleep svg{filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.22)) saturate(.8) brightness(.93)}',

    /* raised limb */
    '#rocky.rocky--wave .rk-arm,#rocky.rocky--thumbs .rk-arm,#rocky.rocky--bump .rk-arm{display:inline;',
    'animation:rk-raise .34s cubic-bezier(.3,1.4,.5,1) both}',
    '#rocky.rocky--wave .rk-leg-r1,#rocky.rocky--thumbs .rk-leg-r1,#rocky.rocky--bump .rk-leg-r1{display:none}',
    '@keyframes rk-raise{from{transform:rotate(95deg)}to{transform:rotate(0)}}',
    '#rocky.rocky--wave .rk-fore{animation:rk-wave .4s ease-in-out .32s 6 alternate both}',
    '@keyframes rk-wave{from{transform:rotate(-20deg)}to{transform:rotate(14deg)}}',
    '#rocky.rocky--thumbs .rk-hand-wave,#rocky.rocky--bump .rk-hand-wave{display:none}',
    '#rocky.rocky--bump .rk-hand-fist{display:inline;transform-origin:128.5px 3px;',
    'animation:rk-bump .9s cubic-bezier(.3,1.4,.5,1) .3s both}',
    '@keyframes rk-bump{0%{transform:scale(1)}35%{transform:scale(1.55)}55%{transform:scale(1.38)}100%{transform:scale(1.4)}}',
    '#rocky.rocky--thumbs .rk-hand-thumb{display:inline}',
    '#rocky.rocky--thumbs .rk-fore{animation:rk-thumb .5s cubic-bezier(.3,1.7,.5,1) .15s both}',
    '#rocky.rocky--thumbs .rk-hand-thumb{transform-origin:128px 5px;animation:rk-jab .45s ease-out .45s both}',
    '@keyframes rk-jab{0%{transform:translateY(0)}45%{transform:translateY(3px)}100%{transform:translateY(0)}}',
    '@keyframes rk-thumb{from{transform:rotate(-28deg)}to{transform:rotate(0)}}',
    '#rocky.rocky--thumbs svg{animation:rk-nod .5s ease-out}',
    '@keyframes rk-nod{0%,100%{transform:translateY(0)}40%{transform:translateY(-3px)}}',

    /* excited bounce */
    '#rocky.rocky--amaze svg{animation:rk-amaze .4s cubic-bezier(.3,0,.6,1) 3}',
    '@keyframes rk-amaze{0%,100%{transform:translateY(0) rotate(0)}30%{transform:translateY(-10px) rotate(-4deg)}',
    '60%{transform:translateY(-3px) rotate(3deg)}}',

    /* wake */
    '#rocky.rocky--hop svg{animation:rk-hop .6s cubic-bezier(.3,0,.5,1)}',
    '@keyframes rk-hop{0%,100%{transform:translateY(0) scale(1)}25%{transform:translateY(2px) scale(1.05,.93)}',
    '55%{transform:translateY(-7px) scale(.98,1.03)}}',

    /* entrance */
    '#rocky.rocky--enter svg{animation:rk-enter .7s cubic-bezier(.3,1.3,.5,1) both}',
    '@keyframes rk-enter{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}',

    '@media (max-width:575.98px){#rocky{right:60px;width:90px;height:68px}#rocky .rk-bubble{font-size:12px}}',
    '@media print{#rocky{display:none!important}}',
    '@media (prefers-reduced-motion:reduce){#rocky *,#rocky svg{animation-duration:.01ms!important;',
    'animation-iteration-count:1!important;transition-duration:.01ms!important}}'
  ].join('');

  /* ------------------------------------------------------------------ */
  /* DOM                                                                 */
  /* ------------------------------------------------------------------ */

  var style = document.createElement('style');
  style.id = 'rocky-style';
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.id = 'rocky';
  root.innerHTML =
    '<div class="rk-chat" role="dialog" aria-label="Talk to Rocky">' +
    '<div class="rk-chat-head"><span>Rocky</span>' +
    '<button type="button" class="rk-close" aria-label="Close chat">×</button></div>' +
    '<div class="rk-log" aria-live="polite"></div>' +
    '<form class="rk-form" autocomplete="off">' +
    '<input class="rk-input" type="text" maxlength="140" placeholder="Say something to Rocky…" aria-label="Message to Rocky">' +
    '<button type="submit" class="rk-send" aria-label="Send">' +
    '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" ' +
    'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '</button></form>' +
    '</div>' +
    '<span class="rk-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
    '<button type="button" class="rk-btn" aria-label="Rocky">' +
    '<span class="rk-bubble" role="status" aria-live="polite"></span>' +
    svg +
    '<span class="rk-zzz" aria-hidden="true"><span>z</span><span>z</span><span>z</span></span>' +
    '</button>' +
    '<button type="button" class="rk-talk">Talk to Rocky</button>';
  document.body.appendChild(root);

  var btn = root.querySelector('.rk-btn');
  var bubble = root.querySelector('.rk-bubble');
  var talkBtn = root.querySelector('.rk-talk');
  var chatLog = root.querySelector('.rk-log');
  var chatForm = root.querySelector('.rk-form');
  var chatInput = root.querySelector('.rk-input');
  var closeBtn = root.querySelector('.rk-close');
  var chatBox = root.querySelector('.rk-chat');

  /* ------------------------------------------------------------------ */
  /* Behaviour                                                           */
  /* ------------------------------------------------------------------ */

  var ACTIONS = ['wave', 'thumbs', 'bump', 'amaze', 'hop', 'enter'];
  var asleep = false;
  var chatting = false;
  var busyUntil = 0;
  var sleepTimer = null;
  var idleChatTimer = null;
  var actionTimer = null;
  var bubbleTimer = null;
  var wanderTimer = null;
  var clicks = [];
  var lastStars = 0;
  var poked = false;

  // Walking state: x is the offset (px, <= 0) from his home spot.
  var x = 0, targetX = 0, walking = false, lastFrame = 0;

  function play(name, ms) {
    clearTimeout(actionTimer);
    ACTIONS.forEach(function (a) { root.classList.remove('rocky--' + a); });
    void root.offsetWidth; // restart CSS animations
    root.classList.add('rocky--' + name);
    busyUntil = Date.now() + ms;
    actionTimer = setTimeout(function () { root.classList.remove('rocky--' + name); }, ms);
  }

  // Rocky speaks: into the chat box when it is open, otherwise a speech bubble.
  function say(text, ms) {
    if (chatting) { addMsg('rocky', text); return; }
    clearTimeout(bubbleTimer);
    bubble.textContent = text;
    root.classList.add('rocky--bubble');
    bubbleTimer = setTimeout(hush, ms);
  }

  function hush() {
    clearTimeout(bubbleTimer);
    root.classList.remove('rocky--bubble');
  }

  function maybeStars(chance) {
    var now = Date.now();
    if (now - lastStars < STARS_COOLDOWN_MS || Math.random() > chance) return;
    lastStars = now;
    say(STARS_LINE, 3600);
  }

  /* --- wandering --- */

  function walkRange() {
    var w = window.innerWidth;
    var sidebar = w >= 850 ? 290 : 24; // keep clear of the sidebar on desktop
    return Math.max(0, Math.min(w >= 576 ? 420 : 170, w - 72 - root.offsetWidth - sidebar));
  }

  function stopWalking() {
    walking = false;
    root.classList.remove('rocky--walk', 'rocky--left');
  }

  function frame(t) {
    if (!walking) return;
    var dt = Math.min(0.05, (t - (lastFrame || t)) / 1000);
    lastFrame = t;
    var step = WALK_SPEED * dt;
    if (Math.abs(targetX - x) <= step) {
      x = targetX;
      root.style.setProperty('--rk-x', x + 'px');
      stopWalking();
      scheduleWander(1800 + Math.random() * 2600);
      return;
    }
    x += targetX > x ? step : -step;
    root.style.setProperty('--rk-x', x.toFixed(1) + 'px');
    requestAnimationFrame(frame);
  }

  function wander() {
    if (asleep || chatting || reduceMotion) return;
    if (Date.now() < busyUntil) { scheduleWander(busyUntil - Date.now() + 400); return; }
    var range = walkRange();
    if (range < 30) return;
    var next = -Math.round(Math.random() * range);
    if (Math.abs(next - x) < 40) next = x > -range / 2 ? x - 60 : x + 60;
    targetX = Math.max(-range, Math.min(0, next));
    walking = true;
    lastFrame = 0;
    root.classList.add('rocky--walk');
    root.classList.toggle('rocky--left', targetX < x);
    requestAnimationFrame(frame);
  }

  function scheduleWander(ms) {
    clearTimeout(wanderTimer);
    wanderTimer = setTimeout(wander, ms);
  }

  /* --- sleep / wake --- */

  function scheduleSleep() {
    clearTimeout(sleepTimer);
    clearTimeout(idleChatTimer);
    if (chatting) return; // he stays awake while you talk to him
    sleepTimer = setTimeout(sleep, SLEEP_AFTER_MS);
    idleChatTimer = setTimeout(function () {
      if (!asleep && !root.classList.contains('rocky--bubble')) maybeStars(0.15);
    }, 8000);
  }

  function sleep() {
    asleep = true;
    clearTimeout(wanderTimer);
    stopWalking();
    hush();
    clicks = [];
    root.classList.add('rocky--sleep');
    btn.setAttribute('aria-label', 'Rocky, sleeping');
  }

  function wake() {
    asleep = false;
    root.classList.remove('rocky--sleep');
    btn.setAttribute('aria-label', 'Rocky');
    play('hop', 700);
    scheduleSleep();
    scheduleWander(1800);
  }

  /* --- play --- */

  function onPoke() {
    if (asleep) { wake(); return; }

    stopWalking();
    var now = Date.now();
    clicks = clicks.filter(function (t) { return now - t < COMBO_WINDOW_MS; });
    clicks.push(now);

    if (clicks.length >= COMBO_CLICKS) {
      play('amaze', 1250);
      say(AMAZE_LINE, 2400);
    } else if (!poked || Math.random() < 0.2) {
      poked = true;
      play('bump', 1700);
      say(BUMP_LINE, 2000);
    } else {
      play('thumbs', 1500);
      maybeStars(0.12);
    }
    scheduleSleep();
    if (!chatting) scheduleWander(2600);
  }

  /* --- chat --- */

  // Simple phrase matching, checked top to bottom; the first match wins.
  var RULES = [
    // Any question (ends with "?" or uses a wh-/how word) beats every other rule.
    { re: /\?\s*$|\b(what|why|when|where|who|whom|whose|which|how)\b/, say: 'Question is dumb.' },
    { re: /\b(website|web ?site|site|web ?page|home ?page|blog|layout|this page)\b/,
      say: 'Dirty, dirty, dirty. This room for garbage?' },
    { re: /\b(hi+|hello+|hey+|heya|hiya|yo|sup|howdy|hola|namaste|greetings|good (morning|afternoon|evening))\b/,
      say: 'Fist my bump, fist my bump!', act: 'bump' },
    { re: /\bmark\b/, say: 'Rocky hate Mark.' },
    { re: /\bhug(s|ging|gy)?\b/, say: 'How do you know when the hug is done?' },
    { re: /\b(laptop|computer|pc|macbook|notebook)\b/, say: 'Portable Earth thinking machine!' },
    { re: /\b(stars?|sun|astrophage|hail mary|mission|save (the )?(world|earth|planet))\b/, say: STARS_LINE },
    { re: /\b(alone|lonely|by myself|no ?one|nobody)\b/, say: 'Only us.' },
    { re: /\b(lol|lmao|rofl|ha(ha)+|he(he)+|joke|joking|kidding|jk|funny)\b/, say: 'Oh, humor. Confusing.' },
    { re: /\b(wow+|whoa+|amazing|incredible|unbelievable|science|physics|experiment|discovery)\b/,
      say: AMAZE_LINE, act: 'amaze' },
    { re: /\b(good|great|nice|cool|awesome|cute|adorable|love|like you|beautiful|handsome|smart|clever|best|brilliant|genius|well done|thanks?|thx|ty|sweet|lovely|you look|you are|you're)\b/,
      action: 'thumbs down', act: 'thumbs' },
    { re: /\b(bye|goodbye|see (you|ya)|later|cya|good ?night|gn)\b/, action: 'waves', act: 'wave' },
    { re: /\b(ok|okay|sure|yes|yeah|yep|done|ready|fixed|it works)\b/, say: 'Good, good.' }
  ];
  var FALLBACK = 'Rocky not understand. Say again, question?';

  function reply(text) {
    var t = ' ' + text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ') + ' ';
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i].re.test(t)) return RULES[i];
    }
    return { say: FALLBACK };
  }

  function addMsg(who, text, isAction) {
    var p = document.createElement('p');
    p.className = 'rk-msg rk-' + who + (isAction ? ' rk-act' : '');
    p.textContent = isAction ? '*' + text + '*' : text;
    chatLog.appendChild(p);
    while (chatLog.children.length > 8) chatLog.removeChild(chatLog.firstChild);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  var ACT_MS = { bump: 1700, thumbs: 1500, amaze: 1250, wave: 2200 };

  function openChat() {
    if (chatting) { chatInput.focus(); return; }
    chatting = true;
    if (asleep) wake();
    clearTimeout(wanderTimer);
    stopWalking();
    hush();
    scheduleSleep();
    root.classList.add('rocky--chat');
    fitChat();
    if (!chatLog.children.length) addMsg('rocky', 'Hello. Rocky listen.');
    setTimeout(function () { chatInput.focus(); }, 60);
  }

  function closeChat() {
    if (!chatting) return;
    chatting = false;
    root.classList.remove('rocky--chat');
    root.style.removeProperty('--rk-lift');
    if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
    scheduleSleep();
    scheduleWander(2500);
  }

  // Keep the chat box fully on screen: Rocky may have walked near an edge, and
  // on phones the box is nearly as wide as the screen.
  var EDGE = 12;
  function fitChat() {
    if (!chatting) return;
    chatBox.style.setProperty('--rk-shift', '0px');
    var r = root.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var right = r.right + 28; // the box's default right edge
    var left = right - chatBox.offsetWidth;
    var shift = 0;
    if (left < EDGE) shift = EDGE - left; // slide right
    else if (right > vw - EDGE) shift = vw - EDGE - right; // slide left
    chatBox.style.setProperty('--rk-shift', shift + 'px'); // CSS: right = -28px - shift
    liftAboveKeyboard();
  }

  // On phones the on-screen keyboard covers the bottom of the page; lift Rocky
  // (and his chat box) above it while chatting.
  function liftAboveKeyboard() {
    var vv = window.visualViewport;
    if (!vv || !chatting) return;
    var covered = window.innerHeight - (vv.height + vv.offsetTop);
    root.style.setProperty('--rk-lift', Math.max(0, Math.round(covered)) + 'px');
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', liftAboveKeyboard);
    window.visualViewport.addEventListener('scroll', liftAboveKeyboard);
  }

  chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    addMsg('me', text);
    history.push({ role: 'user', content: text });
    if (AI_URL) askAI(); else setTimeout(function () { respondLocally(text); }, 380);
  });

  // Phrase-matching reply (used offline or if the AI endpoint fails).
  function respondLocally(text) {
    var r = reply(text);
    if (r.act) play(r.act, ACT_MS[r.act] || 1400);
    if (r.say) addMsg('rocky', r.say);
    if (r.action) addMsg('rocky', r.action, true);
    history.push({ role: 'assistant', content: r.say || '(' + r.action + ')' });
  }

  var history = [];
  var thinking = null;
  var pending = 0;

  function showThinking() {
    if (thinking) return;
    thinking = document.createElement('p');
    thinking.className = 'rk-msg rk-rocky rk-thinking';
    thinking.setAttribute('aria-label', 'Rocky is thinking');
    thinking.innerHTML = '<i></i><i></i><i></i>';
    chatLog.appendChild(thinking);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function hideThinking() {
    if (thinking) { thinking.remove(); thinking = null; }
  }

  function askAI() {
    var text = history[history.length - 1].content;
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, AI_TIMEOUT_MS);
    pending++;
    showThinking();
    fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-12) }),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (data) {
        if (!data || typeof data.reply !== 'string' || !data.reply) throw new Error('empty');
        if (--pending === 0) hideThinking();
        if (data.gesture && ACT_MS[data.gesture]) play(data.gesture, ACT_MS[data.gesture]);
        addMsg('rocky', data.reply);
        history.push({ role: 'assistant', content: data.reply });
      })
      .catch(function () {
        if (--pending === 0) hideThinking();
        respondLocally(text);
      })
      .then(function () {
        clearTimeout(timer);
        while (history.length > 24) history.shift();
      });
  }

  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeChat();
  });
  talkBtn.addEventListener('click', openChat);
  closeBtn.addEventListener('click', closeChat);
  document.addEventListener('pointerdown', function (e) {
    if (chatting && !root.contains(e.target)) closeChat();
  });

  btn.addEventListener('click', onPoke);

  window.addEventListener('resize', function () {
    var range = walkRange();
    if (x < -range) {
      x = -range;
      targetX = Math.max(targetX, x);
      root.style.setProperty('--rk-x', x + 'px');
    }
    fitChat();
  });

  // Arrival: step in, wave, then go exploring.
  play('enter', 700);
  setTimeout(function () { play('wave', 3000); }, 700);
  scheduleSleep();
  scheduleWander(4200);
})();
