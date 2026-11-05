import { h, clamp, prefersReducedMotion, useState, useEffect, useRef } from '../lib/base.js';

/* ===== Silk backdrop: slow layered ribbons behind the whole site ===== */
const SILK_RIBBONS = [
  { y: 0.34, a: 0.085, f: 1.1, s: 0.11, ph: 0.0, d: 10, c1: [247, 170, 218], c2: [252, 214, 178], al: 0.55 },
  { y: 0.46, a: 0.075, f: 1.5, s: 0.09, ph: 1.7, d: 18, c1: [242, 154, 79], c2: [255, 225, 200], al: 0.34 },
  { y: 0.58, a: 0.095, f: 0.9, s: 0.07, ph: 3.1, d: 26, c1: [233, 101, 185], c2: [255, 214, 236], al: 0.30 },
  { y: 0.70, a: 0.07, f: 1.7, s: 0.12, ph: 4.4, d: 34, c1: [255, 190, 140], c2: [255, 236, 220], al: 0.42 },
  { y: 0.82, a: 0.06, f: 1.2, s: 0.08, ph: 5.2, d: 44, c1: [244, 138, 200], c2: [255, 240, 246], al: 0.38 }
];
export const SilkBackdrop = () => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) return;
    const reduced = prefersReducedMotion();
    let w = 0, ht = 0, raf = 0, last = 0, px = 0, py = 0, tx = 0, ty = 0;
    const t0 = performance.now();
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const draw = now => {
      const t = (now - t0) / 1000;
      const base = ctx.createLinearGradient(0, 0, w, ht);
      base.addColorStop(0, '#fff9fc'); base.addColorStop(0.55, '#fff5f1'); base.addColorStop(1, '#fff2e8');
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, ht);
      const orb = (x, y, r, c, a) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      };
      orb(w * (0.12 + px * 0.02), ht * 0.18, Math.max(w, ht) * 0.45, [246, 170, 222], 0.38);
      orb(w * (0.92 - px * 0.02), ht * 0.86, Math.max(w, ht) * 0.5, [250, 176, 110], 0.34);
      for (const r of SILK_RIBBONS) {
        ctx.beginPath();
        ctx.moveTo(0, ht);
        const step = Math.max(6, Math.round(w / 140));
        const ys = [];
        for (let x = 0; x <= w + step; x += step) {
          const u = (x / w) * Math.PI * 2 * r.f;
          const y = ht * (r.y + r.a * Math.sin(u + t * r.s * 2 + r.ph) + r.a * 0.5 * Math.sin(u * 2.1 - t * r.s * 1.3 + r.ph * 2)) + py * r.d;
          ys.push([x, y]);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w + step, ht); ctx.closePath();
        const g = ctx.createLinearGradient(0, ht * (r.y - r.a), 0, ht);
        g.addColorStop(0, rgba(r.c1, r.al)); g.addColorStop(1, rgba(r.c2, 0));
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath();
        ys.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1.4; ctx.stroke();
      }
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth; ht = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(ht * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };
    const loop = now => {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return;
      last = now;
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      draw(now);
    };
    const onMove = e => { tx = (e.clientX / w) * 2 - 1; ty = (e.clientY / ht) * 2 - 1; };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) raf = requestAnimationFrame(loop);
    };
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
    if (!reduced) { window.addEventListener('pointermove', onMove, { passive: true }); raf = requestAnimationFrame(loop); }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return h('canvas', { ref, className: 'silk', 'aria-hidden': 'true' });
};

/* Spotlight: any .spot element gets a soft glow that follows the pointer */
export const useSpotlight = () => {
  useEffect(() => {
    const onMove = e => {
      const el = e.target && e.target.closest ? e.target.closest('.spot') : null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
};

/* CountUp: numbers that roll up to their value */
export const CountUp = ({ to, decimals = 0, prefix = '', suffix = '' }) => {
  const [v, setV] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const from = ref.current, t0 = performance.now();
    let raf = 0;
    if (prefersReducedMotion()) { ref.current = to; setV(to); return; }
    const step = now => {
      const p = clamp((now - t0) / 1300, 0, 1);
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      const val = from + (to - from) * e;
      ref.current = val; setV(val);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return h('span', { className: 'num' }, prefix + Number(v.toFixed(decimals)).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix);
};
