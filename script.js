document.documentElement.classList.add('js');

(function () {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---- Mobile menu ---- */
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  document.querySelectorAll('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', e => { if (!nav.contains(e.target)) setMenu(false); });

  /* ---- Scroll progress, back-to-top, nav state ---- */
  const bar = document.getElementById('progress');
  const toTop = document.getElementById('totop');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const max = root.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      toTop.classList.toggle('show', y > 600);
      nav.classList.toggle('scrolled', y > 20);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Reveal on scroll ---- */
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduce) {
    items.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(el => io.observe(el));
  }

  /* ---- Count-up for the skills statistics ---- */
  const counters = document.querySelectorAll('[data-count]');
  const fmt = (n, el) => n.toLocaleString('en-US') + (el.dataset.suffix || '');
  if (reduce || !('IntersectionObserver' in window)) {
    counters.forEach(el => { el.textContent = fmt(+el.dataset.count, el); });
  } else {
    const co = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        const el = e.target, end = +el.dataset.count, dur = 1300, t0 = performance.now();
        (function step(now) {
          const p = Math.min((now - t0) / dur, 1);
          el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - p, 3))), el);
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    counters.forEach(el => { el.textContent = fmt(0, el); co.observe(el); });
  }

  /* ---- Active nav link ---- */
  if ('IntersectionObserver' in window) {
    const links = Array.from(document.querySelectorAll('.links a'));
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(l => l.classList.toggle('active', e.target.id !== 'top' && l.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['top', 'about', 'skills', 'projects', 'resume', 'contact'].forEach(id => {
      const el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  /* ---- Copy email ---- */
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        const label = btn.textContent;
        btn.textContent = 'Copied ✓';
        setTimeout(() => { btn.textContent = label; }, 1800);
      } catch (err) {
        window.location.href = 'mailto:' + btn.dataset.copy;
      }
    });
  });

  /* ---- Cursor effects: soft light, ring, per-card spotlight (desktop only) ---- */
  const hero = document.getElementById('top');
  let px = -9999, py = -9999;          // pointer position inside hero (eased)
  let tpx = -9999, tpy = -9999;        // target
  if (fine && !reduce) {
    const glow = document.getElementById('glow');
    const ring = document.getElementById('ring');
    let mx = innerWidth / 2, my = innerHeight / 2, gx = mx, gy = my, rx = mx, ry = my, running = false;

    function frame() {
      gx += (mx - gx) * 0.10; gy += (my - gy) * 0.10;
      rx += (mx - rx) * 0.30; ry += (my - ry) * 0.30;
      glow.style.transform = 'translate3d(' + gx + 'px,' + gy + 'px,0)';
      ring.style.translate = rx + 'px ' + ry + 'px';
      const settled = Math.abs(mx - gx) < 0.3 && Math.abs(my - gy) < 0.3;
      if (settled) { running = false; return; }
      requestAnimationFrame(frame);
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

    document.addEventListener('pointermove', e => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY; kick();
      glow.classList.add('on'); ring.classList.add('on');
      const t = e.target;
      ring.classList.toggle('hot', !!(t.closest && t.closest('a, button')));
      const card = t.closest && t.closest('.card');
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }
      const hr = hero.getBoundingClientRect();
      tpx = e.clientX - hr.left; tpy = e.clientY - hr.top;
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => {
      glow.classList.remove('on'); ring.classList.remove('on'); tpx = tpy = -9999;
    });
  }

  /* ---- Topographic hero lines (bend toward the cursor, pause off-screen) ---- */
  const cv = document.getElementById('topo');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, t = 0, raf = null, visible = true;
  const R2 = 2 * 170 * 170;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const n = 10, gap = H / n;
    for (let i = 0; i < n; i++) {
      const hi = i % 4 === 1;
      ctx.beginPath();
      ctx.strokeStyle = hi ? 'rgba(232,163,61,.38)' : 'rgba(31,77,58,.13)';
      ctx.lineWidth = hi ? 1.4 : 1;
      for (let x = 0; x <= W; x += 12) {
        let y = i * gap + gap / 2 + Math.sin(x * 0.0022 + t + i * 0.45) * 46 + Math.cos(x * 0.0011 - t * 0.6 + i) * 26;
        if (px > -9000) {
          const dx = x - px, dy = y - py;
          y += (py - y) * 0.2 * Math.exp(-(dx * dx + dy * dy) / R2);
        }
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  function size() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * d; cv.height = H * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    draw();
  }
  function loop() {
    if (!visible || document.hidden) { raf = null; return; }
    t += 0.004;
    if (tpx < -9000) { px = py = -9999; } else if (px < -9000) { px = tpx; py = tpy; } else { px += (tpx - px) * 0.12; py += (tpy - py) * 0.12; }
    draw();
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!reduce && !raf && visible) raf = requestAnimationFrame(loop); }

  size();
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 120); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  start();
})();