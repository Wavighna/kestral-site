/* Kestral hero: a life painted in oil strokes, one stage at a time.
   Every stage shares ONE layout (horizon, tree spot, kid spot, sun spot), so
   the stages line up like sheets of the same painting. Only the figure's
   height, the tree's size and the number of paint colors change. */
(() => {
  const hero = document.querySelector('.hero');
  const stageCv = document.getElementById('stage');
  const wordCv = document.getElementById('word');
  const ageEl = document.getElementById('age');
  const sctx = stageCv.getContext('2d');
  // two stacked wordmark canvases: each stage paints on a fresh one while the old fades away
  const wordCv2 = wordCv.cloneNode(false); wordCv2.removeAttribute('id');
  wordCv.after(wordCv2);
  const wordCvs = [wordCv, wordCv2];
  const wordCtxs = wordCvs.map(c => c.getContext('2d'));
  let wi = 0, wctx = wordCtxs[0], oldWord = null, oldFaded = true, zTop = 2;

  const HAND = (window.KESTRAL_FRAMES || []).slice();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- paint ---------------------------------------------------------
  const C = {
    blue: [31, 79, 191], sky: [98, 152, 232], yellow: [245, 196, 40], lemon: [250, 228, 120],
    red: [214, 48, 31], crimson: [160, 28, 56], green: [52, 140, 76], orange: [236, 122, 30],
    violet: [112, 66, 162], teal: [30, 140, 150], skin: [232, 168, 118], ink: [26, 26, 46],
    paper: [244, 236, 216]
  };

  // Each stage: how old, kid height (fraction of B), head ratio, tree growth 0..1,
  // which paint colors are on the palette, and the wordmark color.
  const STAGES = [
    { age: 'age 0',  kid: 0.13, head: 0.26, tree: 0.00, pal: ['blue', 'sky', 'yellow'],                                            word: 'blue' },
    { age: 'age 3',  kid: 0.21, head: 0.21, tree: 0.15, pal: ['blue', 'sky', 'yellow', 'lemon'],                                   word: 'red' },
    { age: 'age 8',  kid: 0.31, head: 0.17, tree: 0.35, pal: ['blue', 'sky', 'yellow', 'lemon', 'red'],                            word: 'yellow' },
    { age: 'age 14', kid: 0.43, head: 0.145, tree: 0.58, pal: ['blue', 'sky', 'yellow', 'lemon', 'red', 'green'],                  word: 'blue' },
    { age: 'age 22', kid: 0.54, head: 0.13, tree: 0.80, pal: ['blue', 'sky', 'yellow', 'lemon', 'red', 'green', 'orange', 'violet'], word: 'red' },
    { age: 'age 35', kid: 0.62, head: 0.125, tree: 1.00, pal: ['blue', 'sky', 'yellow', 'lemon', 'red', 'green', 'orange', 'violet', 'crimson', 'teal'], word: 'yellow' }
  ];
  const WORD_RGB = { blue: C.blue, red: C.red, yellow: C.yellow };

  const PAINT_MS = 4600;
  const STAGE_MS = 6800;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  // ---- layout (one source of truth for every stage) -------------------
  let W = 0, H = 0, B = 0, sc = 1, L = {};
  function layout() {
    W = hero.clientWidth; H = hero.clientHeight;
    B = Math.min(H, W * 0.62);
    sc = B / 700;
    const narrow = W < 700;
    const horizon = H * (narrow ? 0.46 : 0.66);
    L = {
      horizon,
      treeX: W * (narrow ? 0.24 : 0.47),  treeBase: horizon + B * 0.07,
      kidX: W * (narrow ? 0.68 : 0.73),   kidFeet: horizon + B * 0.15,
      sunX: W * 0.86,  sunY: H * (narrow ? 0.08 : 0.15), sunR: B * (narrow ? 0.06 : 0.07),
      wordY: H * (narrow ? 0.2 : 0.3)
    };
  }

  function sizeCanvas(cv, ctx) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- stroke construction -------------------------------------------
  function rgb(c, k) { return `rgb(${clamp(Math.round(c[0] * k), 0, 255)},${clamp(Math.round(c[1] * k), 0, 255)},${clamp(Math.round(c[2] * k), 0, 255)})`; }
  function mk(r, x, y, a, len, w, base) {
    const k = 0.86 + r() * 0.3;
    return { x, y, a, l: len, w, c: rgb(base, k), h: rgb(base, Math.min(1.3, k + 0.18)) };
  }
  function pick(r, names, pal, fallback) {
    const ok = names.filter(n => pal.includes(n));
    const n = ok.length ? ok[Math.floor(r() * ok.length)] : fallback;
    return C[n];
  }

  function buildStage(i) {
    const S = STAGES[i];
    const r = rng(1000 + i * 77);
    const out = [];
    const len = 50 * sc, wd = 13 * sc;
    const pal = S.pal;

    function area(x0, y0, x1, y1, names, angle, jit, fb, flow = 0.35) {
      const n = Math.round(((x1 - x0) * (y1 - y0)) / (len * wd * 0.55));
      for (let k = 0; k < n; k++) {
        const x = lerp(x0, x1, r()), y = lerp(y0, y1, r());
        const a = angle + flow * Math.sin((x / W) * 7 + (y / H) * 5) + (r() - 0.5) * jit;
        out.push(mk(r, x, y, a, len * (0.6 + r() * 1.0), wd * (0.7 + r() * 0.6), pick(r, names, pal, fb)));
      }
    }
    function ellipse(cx, cy, rx, ry, names, opt = {}) {
      const l = (opt.len || len) , w = (opt.w || wd);
      const n = Math.max(5, Math.round(Math.PI * rx * ry / (l * w * 0.5)));
      for (let k = 0; k < n; k++) {
        const t = r() * Math.PI * 2, d = Math.sqrt(r());
        const dx = Math.cos(t) * d * rx, dy = Math.sin(t) * d * ry;
        const a = opt.swirl ? Math.atan2(dy, dx) + Math.PI / 2 + (r() - 0.5) * 0.9
                            : (opt.angle || 0) + (r() - 0.5) * (opt.jit || 0.8);
        out.push(mk(r, cx + dx, cy + dy, a, l * (0.7 + r() * 0.6), w * (0.7 + r() * 0.6), pick(r, names, pal, 'ink')));
      }
    }

    const hz = L.horizon;

    // sky
    area(-20, 0, W + 20, hz + 10, ['sky', 'blue', 'lemon', 'violet', 'teal'], -0.12, 0.35, 'sky');
    // far hills
    const ridge = x => hz - B * 0.14 * (0.55 + 0.45 * Math.sin((x / W) * 5.2 + 1.1)) - B * 0.03;
    for (let k = 0, n = Math.round(W * B * 0.12 / (len * wd * 0.5)); k < n; k++) {
      const x = r() * W, yTop = ridge(x), y = lerp(yTop, hz + 8, r());
      out.push(mk(r, x, y, -0.15 + (r() - 0.5) * 0.5, len * 1.1, wd, pick(r, ['blue', 'violet', 'teal', 'green'], pal, 'blue')));
    }
    // ground
    area(-20, hz, W + 20, H + 20, ['yellow', 'lemon', 'green', 'orange', 'red'], 0.18, 0.4, 'yellow', 0.5);
    // flowers / dabs that multiply as the palette grows
    for (let k = 0, n = i * 22; k < n; k++) {
      out.push(mk(r, r() * W, lerp(hz + B * 0.05, H - 6, r()), r() * 6, 14 * sc, 11 * sc, pick(r, ['red', 'crimson', 'violet', 'orange', 'lemon'], pal, 'yellow')));
    }

    // sun
    ellipse(L.sunX, L.sunY, L.sunR, L.sunR, ['yellow', 'lemon'], { swirl: true, len: 22 * sc, w: 11 * sc });
    for (let k = 0, n = 10 + i * 2; k < n; k++) {
      const a = (k / n) * Math.PI * 2, d = L.sunR * 1.55;
      out.push(mk(r, L.sunX + Math.cos(a) * d, L.sunY + Math.sin(a) * d, a, 26 * sc, 8 * sc, C.yellow));
    }

    // tree
    const g = S.tree;
    const trunkH = B * lerp(0.1, 0.36, g), trunkW = B * lerp(0.012, 0.034, g);
    const tx = L.treeX, ty = L.treeBase;
    for (let k = 0, n = Math.round(trunkH * trunkW * 2 / (len * wd * 0.35)) + 8; k < n; k++) {
      out.push(mk(r, tx + (r() - 0.5) * trunkW * 1.6, ty - r() * trunkH, Math.PI / 2 + (r() - 0.5) * 0.25,
        len * 0.9, wd * 0.8, pick(r, ['crimson', 'violet', 'red', 'blue'], pal, 'ink')));
    }
    const crx = B * lerp(0.07, 0.24, g), cry = crx * 0.85;
    ellipse(tx, ty - trunkH - cry * 0.5, crx, cry, ['green', 'teal', 'blue', 'yellow', 'lemon', 'red', 'orange'],
      { swirl: true, len: 30 * sc, w: 14 * sc });

    // the kid
    const hk = B * S.kid, kx = L.kidX, fy = L.kidFeet;
    const hr = hk * S.head;
    const neck = fy - hk + hr * 2;
    const hip = fy - hk * 0.42;
    const sl = 20 * sc, sw = 10 * sc;
    // ground shadow
    ellipse(kx + hk * 0.1, fy + 2 * sc, hk * 0.28, hk * 0.05, ['violet', 'blue'], { angle: 0, jit: 0.2, len: 24 * sc, w: 9 * sc });
    // legs
    ellipse(kx - hk * 0.06, (hip + fy) / 2, hk * 0.06, (fy - hip) / 2, ['blue', 'violet', 'green'], { angle: Math.PI / 2, jit: 0.3, len: sl, w: sw });
    ellipse(kx + hk * 0.06, (hip + fy) / 2, hk * 0.06, (fy - hip) / 2, ['blue', 'violet', 'green'], { angle: Math.PI / 2, jit: 0.3, len: sl, w: sw });
    // torso
    ellipse(kx, (neck + hip) / 2, hk * 0.135, (hip - neck) / 2 + hk * 0.02, ['red', 'yellow', 'orange', 'blue'], { angle: Math.PI / 2, jit: 0.6, len: sl, w: sw * 1.2 });
    // arms
    ellipse(kx - hk * 0.15, neck + (hip - neck) * 0.45, hk * 0.045, (hip - neck) * 0.45, ['skin'], { angle: Math.PI / 2, jit: 0.3, len: sl * 0.8, w: sw * 0.9 });
    ellipse(kx + hk * 0.15, neck + (hip - neck) * 0.45, hk * 0.045, (hip - neck) * 0.45, ['skin'], { angle: Math.PI / 2, jit: 0.3, len: sl * 0.8, w: sw * 0.9 });
    // head, hair, face
    const hy = fy - hk + hr;
    ellipse(kx, hy, hr, hr, ['skin'], { swirl: true, len: Math.max(7, hr * 0.8), w: Math.max(4, hr * 0.5) });
    ellipse(kx, hy - hr * 0.62, hr * 0.95, hr * 0.38, ['crimson', 'orange', 'ink'], { swirl: true, len: Math.max(6, hr * 0.5), w: Math.max(4, hr * 0.3) });
    for (const ex of [-0.32, 0.32]) {
      out.push(mk(r, kx + hr * ex, hy + hr * 0.05, 0, hr * 0.22, hr * 0.2, C.ink));
    }

    // a few edge-defining dark strokes so shapes read like oil work, not fog
    for (let k = 0, n = 7 + i * 3; k < n; k++) {
      const a = r() * Math.PI * 2;
      out.push(mk(r, kx + Math.cos(a) * hr * 1.02, hy + Math.sin(a) * hr * 1.02, a + Math.PI / 2, hr * 0.45, Math.max(2, hr * 0.07), C.ink));
    }
    return out;
  }

  function dab(ctx, s) {
    const dx = Math.cos(s.a) * s.l / 2, dy = Math.sin(s.a) * s.l / 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = s.c; ctx.lineWidth = s.w;
    ctx.beginPath(); ctx.moveTo(s.x - dx, s.y - dy); ctx.lineTo(s.x + dx, s.y + dy); ctx.stroke();
    // impasto highlight: a thin lighter bristle line along one edge
    const nx = -Math.sin(s.a) * s.w * 0.28, ny = Math.cos(s.a) * s.w * 0.28;
    ctx.strokeStyle = s.h; ctx.lineWidth = Math.max(1, s.w * 0.16);
    ctx.beginPath(); ctx.moveTo(s.x - dx * 0.85 + nx, s.y - dy * 0.85 + ny); ctx.lineTo(s.x + dx * 0.85 + nx, s.y + dy * 0.85 + ny); ctx.stroke();
  }

  // ---- wordmark ------------------------------------------------------
  const off = document.createElement('canvas');
  function buildWord(i) {
    const S = STAGES[i % STAGES.length];
    const r = rng(5000 + i * 31);
    const fs = Math.min(B * lerp(0.2, 0.27, i / (STAGES.length - 1)), W * 0.2);
    off.width = Math.max(1, Math.round(W)); off.height = Math.max(1, Math.round(H));
    const o = off.getContext('2d', { willReadFrequently: true });
    o.clearRect(0, 0, off.width, off.height);
    o.fillStyle = '#000';
    o.font = `italic 700 ${fs}px "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif`;
    o.textAlign = 'center'; o.textBaseline = 'middle';
    o.fillText('Kestral', W / 2, L.wordY);
    const data = o.getImageData(0, 0, off.width, off.height).data;
    const g = Math.max(2.5, fs * 0.024);
    const base = WORD_RGB[S.word];
    const out = [];
    for (let y = 0; y < off.height; y += g * 0.9) {
      for (let x = 0; x < off.width; x += g * 0.9) {
        const px = Math.round(x + (r() - 0.5) * g), py = Math.round(y + (r() - 0.5) * g);
        if (px < 0 || py < 0 || px >= off.width || py >= off.height) continue;
        if (data[(py * off.width + px) * 4 + 3] < 128) continue;
        const a = -0.55 + (r() - 0.5) * 0.5;
        out.push({
          x: px, y: py, a, l: g * 3.2, w: g * 1.7,
          col: mk(r, 0, 0, 0, 0, 0, r() < 0.12 ? C.paper : base), sort: px + r() * W * 0.06
        });
      }
    }
    out.sort((p, q) => p.sort - q.sort);
    return { strokes: out, g };
  }
  function wordDab(s, g) {
    // dark shadow goes BEHIND everything already painted so letters stay readable
    wctx.globalCompositeOperation = 'source-over';
    dab(wctx, { x: s.x, y: s.y, a: s.a, l: s.l, w: s.w, c: s.col.c, h: s.col.h });
    wctx.globalCompositeOperation = 'destination-over';
    wctx.lineCap = 'round';
    wctx.strokeStyle = rgb(C.ink, 1); wctx.lineWidth = s.w * 1.5;
    const dx = Math.cos(s.a) * s.l / 2, dy = Math.sin(s.a) * s.l / 2;
    wctx.beginPath();
    wctx.moveTo(s.x - dx + g * 0.45, s.y - dy + g * 0.6);
    wctx.lineTo(s.x + dx + g * 0.45, s.y + dy + g * 0.6);
    wctx.stroke();
    wctx.globalCompositeOperation = 'source-over';
  }

  // ---- hand-painted frames ------------------------------------------
  const images = [];
  function drawCover(img, alpha) {
    const ir = img.width / img.height, cr = W / H;
    let dw, dh;
    if (ir > cr) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; }
    sctx.globalAlpha = alpha;
    sctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    sctx.globalAlpha = 1;
  }

  // ---- runner --------------------------------------------------------
  let strokes = [], drawn = 0, word = null, wDrawn = 0, curStage = -1, t0 = 0;
  const count = () => (HAND.length || STAGES.length);

  function setAge(i) {
    const labels = window.KESTRAL_AGES;
    const txt = labels ? labels[i] : (!HAND.length ? STAGES[i].age : '');
    ageEl.classList.remove('on');
    if (!txt) return;
    setTimeout(() => { ageEl.textContent = txt; ageEl.classList.add('on'); }, 350);
  }

  function swapWord() {
    oldWord = wordCvs[wi]; oldFaded = false;
    wi ^= 1;
    const cv = wordCvs[wi];
    wctx = wordCtxs[wi];
    wctx.clearRect(0, 0, W, H);
    cv.style.transition = 'none'; cv.style.opacity = '1'; cv.style.zIndex = String(++zTop);
  }

  function enter(i) {
    curStage = i;
    drawn = 0; wDrawn = 0;
    swapWord();
    strokes = HAND.length ? [] : buildStage(i % STAGES.length);
    word = buildWord(i % STAGES.length);
    setAge(i);
  }

  function frame(now) {
    const el = Math.max(0, now - t0);
    const i = Math.floor(el / STAGE_MS) % count();
    const local = el % STAGE_MS;
    if (i !== curStage) enter(i);

    const p = ease(clamp(local / PAINT_MS, 0, 1));
    if (i === 0 && el >= count() * STAGE_MS && local < 700) {
      sctx.globalAlpha = 0.12; sctx.fillStyle = rgb(C.paper, 1); sctx.fillRect(0, 0, W, H); sctx.globalAlpha = 1;
    }
    if (HAND.length) {
      const img = images[i];
      if (img && img.complete && img.naturalWidth) drawCover(img, clamp(p * 1.4, 0, 1));
    } else {
      const upto = Math.floor(p * strokes.length);
      while (drawn < upto) dab(sctx, strokes[drawn++]);
    }

    if (!oldFaded && oldWord && local > PAINT_MS * 0.8) {
      oldWord.style.transition = 'opacity .9s'; oldWord.style.opacity = '0'; oldFaded = true;
    }
    const pw = ease(clamp(local / (PAINT_MS * 0.75), 0, 1));
    const wupto = Math.floor(pw * word.strokes.length);
    while (wDrawn < wupto) wordDab(word.strokes[wDrawn++], word.g);

    requestAnimationFrame(frame);
  }

  function finishInstant(i) {
    curStage = i;
    strokes = HAND.length ? [] : buildStage(i % STAGES.length);
    word = buildWord(i % STAGES.length);
    if (HAND.length) { const img = images[i]; if (img && img.complete) drawCover(img, 1); }
    else strokes.forEach(s => dab(sctx, s));
    word.strokes.forEach(s => wordDab(s, word.g));
    const labels = window.KESTRAL_AGES;
    const txt = labels ? labels[i] : (!HAND.length ? STAGES[i].age : '');
    if (txt) { ageEl.textContent = txt; ageEl.classList.add('on'); }
  }

  function start() {
    layout();
    sizeCanvas(stageCv, sctx); wordCvs.forEach((c, k) => sizeCanvas(c, wordCtxs[k]));
    sctx.fillStyle = rgb(C.paper, 1); sctx.fillRect(0, 0, W, H);
    wordCtxs.forEach(c => c.clearRect(0, 0, W, H));
    wordCvs.forEach(c => { c.style.transition = 'none'; c.style.opacity = '1'; });
    curStage = -1;
    if (reduced) { finishInstant(count() - 1); return; }
    t0 = performance.now();
  }

  let raf = false, timer = null;
  function boot() {
    HAND.forEach((src, k) => { const im = new Image(); im.src = src; images[k] = im; });
    start();
    if (!reduced && !raf) { raf = true; requestAnimationFrame(frame); }
  }
  window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(start, 250); });
  boot();
})();
