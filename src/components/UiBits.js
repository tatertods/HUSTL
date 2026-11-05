import { h, clamp, prefersReducedMotion, useState, useEffect, useLayoutEffect, useRef } from '../lib/base.js';

/* ===== Tiny animation engine (stands in for motion) ===== */
const bezier = (x1, y1, x2, y2) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t;
  const sy = t => ((ay * t + by) * t + cy) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return p => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - p;
      if (Math.abs(e) < 1e-5) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return sy(clamp(t, 0, 1));
  };
};
const EASE_OUT_FN = bezier(0.23, 1, 0.32, 1);

/* Animate one numeric key on a plain object. Springs and keyframe tweens, one at a time per key. */
const animateKey = (store, key, to, opts, onFrame) => {
  store.__anims = store.__anims || {};
  if (store.__anims[key]) store.__anims[key].cancel();
  let raf = 0, timeout = 0, dead = false;
  const handle = { cancel: () => { dead = true; cancelAnimationFrame(raf); clearTimeout(timeout); } };
  store.__anims[key] = handle;
  const start = () => {
    if (dead) return;
    if (opts.stiffness) {
      let v = opts.velocity || 0, last = performance.now();
      const mass = opts.mass || 1;
      const step = now => {
        if (dead) return;
        const dt = Math.min(0.032, (now - last) / 1000); last = now;
        const n = Math.max(1, Math.ceil(dt / 0.004));
        const hh = dt / n;
        for (let i = 0; i < n; i++) {
          const a = (opts.stiffness * (to - store[key]) - opts.damping * v) / mass;
          v += a * hh; store[key] += v * hh;
        }
        onFrame();
        if (Math.abs(to - store[key]) < 0.01 && Math.abs(v) < 0.05) { store[key] = to; onFrame(); return; }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    } else {
      const frames = Array.isArray(to) ? to : [store[key], to];
      const times = opts.times || frames.map((_, i) => i / (frames.length - 1));
      const ease = opts.ease || (p => p);
      const dur = (opts.duration || 0.2) * 1000, t0 = performance.now();
      const step = now => {
        if (dead) return;
        const p = clamp((now - t0) / dur, 0, 1);
        let i = 0;
        while (i < times.length - 2 && p > times[i + 1]) i++;
        const seg = (p - times[i]) / Math.max(1e-6, times[i + 1] - times[i]);
        store[key] = frames[i] + (frames[i + 1] - frames[i]) * ease(clamp(seg, 0, 1));
        onFrame();
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
  };
  if (opts.delay) timeout = setTimeout(start, opts.delay * 1000); else start();
  return handle;
};

/* ===== React Bits: PeekRating (hugeicons swapped for inline glyphs) ===== */
const PR_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
const PR_SHAPES = {
  star: 'M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.05 1.1-6.5L2.6 9.45l6.5-.95z',
  heart: 'M12 20.5s-8.5-5.1-8.5-11.1A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 8.5 2.8c0 6-8.5 11.1-8.5 11.1z',
  bolt: 'M13.2 2.5 4.5 13.4h6.2l-1 8.1 8.8-11h-6.3z'
};
export const PeekRating = ({
  value: valueProp, defaultValue = 0, onChange, onPreview, count = 5, shape = 'star', icon, labels = [],
  activeColor = '#f5b400', idleColor = '#52525b', tipColor = '#27272a', tipTextColor = '#f5f5f5', size = 28,
  lift = 6, magnify = 1.15, riseDuration = 320, popScale = 1.3, showTip = true, allowClear = true,
  readOnly = false, disabled = false, ariaLabel = 'Rating', className = ''
}) => {
  const [inner, setInner] = useState(defaultValue);
  const value = clamp(valueProp !== undefined ? valueProp : inner, 0, count);
  const interactive = !readOnly && !disabled;
  const rootRef = useRef(null), rowRef = useRef(null), tipEl = useRef(null);
  const starEls = useRef([]), liftEls = useRef([]), glyphEls = useRef([]);
  const st = useRef({ hover: null, pressing: false, pointerId: null, settled: false, rect: null, rtl: false });

  const paint = () => {
    const { hover, settled, rtl } = st.current;
    const previewing = hover !== null && !settled;
    const shown = previewing ? hover + 1 : value;
    const still = prefersReducedMotion();
    for (let i = 0; i < count; i++) {
      const liftEl = liftEls.current[i], glyphEl = glyphEls.current[i];
      if (!liftEl || !glyphEl) continue;
      const lifted = previewing && !still && i <= hover;
      liftEl.style.transform = lifted ? `translateY(${-lift}px) scale(${i === hover ? magnify : 1})` : 'translateY(0px) scale(1)';
      glyphEl.dataset.lit = i < shown;
    }
    const tip = tipEl.current;
    if (!tip) return;
    if (previewing && showTip) {
      const row = rowRef.current;
      const slot = row ? row.clientWidth / count : size;
      const visual = rtl ? count - 1 - hover : hover;
      const wasHidden = tip.dataset.show !== 'true';
      if (wasHidden) tip.style.transition = 'none';
      tip.textContent = labels[hover] != null ? labels[hover] : String(hover + 1);
      tip.style.transform = `translate(calc(${slot * (visual + 0.5)}px - 50%), 0)`;
      if (wasHidden) { void tip.offsetWidth; tip.style.transition = ''; }
      tip.dataset.show = 'true';
    } else tip.dataset.show = 'false';
  };
  useLayoutEffect(paint);

  const setHover = index => {
    if (index === st.current.hover) return;
    st.current.hover = index;
    if (index !== null) st.current.settled = false;
    paint();
    if (onPreview) onPreview(index === null ? null : index + 1);
  };
  const setHoverRef = useRef(setHover); setHoverRef.current = setHover;

  const measure = () => {
    const row = rowRef.current; if (!row) return;
    st.current.rect = row.getBoundingClientRect();
    st.current.rtl = getComputedStyle(row).direction === 'rtl';
  };
  const indexAt = (x, y) => {
    const { rect, pressing, rtl } = st.current;
    if (!rect || !rect.width) return null;
    if (pressing && (y < rect.top - size || y > rect.bottom + size)) return null;
    const index = clamp(Math.floor(((x - rect.left) / rect.width) * count), 0, count - 1);
    return rtl ? count - 1 - index : index;
  };
  const commit = (next, pop = true) => {
    if (valueProp === undefined) setInner(next);
    if (onChange) onChange(next);
    st.current.settled = true;
    paint();
    const glyph = glyphEls.current[next - 1];
    if (pop && next > 0 && popScale > 1 && glyph && typeof glyph.animate === 'function' && !prefersReducedMotion()) {
      glyph.getAnimations().forEach(a => a.cancel());
      glyph.animate([
        { transform: 'scale(1)', easing: PR_EASE },
        { transform: `scale(${popScale})`, offset: 0.35, easing: PR_EASE },
        { transform: 'scale(1)' }
      ], { duration: 300 });
    }
  };
  const handlePointerEnter = e => {
    if (!interactive || e.pointerType !== 'mouse') return;
    if (rootRef.current) rootRef.current.removeAttribute('data-instant');
    measure();
  };
  const handlePointerDown = e => {
    if (!interactive || e.button !== 0 || st.current.pointerId !== null) return;
    if (rootRef.current) rootRef.current.removeAttribute('data-instant');
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    st.current.pointerId = e.pointerId; st.current.pressing = true;
    measure();
    setHover(indexAt(e.clientX, e.clientY));
  };
  const handlePointerMove = e => {
    if (!interactive) return;
    const { pressing, pointerId } = st.current;
    if (e.pointerType !== 'mouse' && !pressing) return;
    if (pressing && e.pointerId !== pointerId) return;
    if (!pressing && !st.current.rect) measure();
    setHover(indexAt(e.clientX, e.clientY));
  };
  const endPress = e => {
    const { pressing, pointerId, hover } = st.current;
    if (!pressing || e.pointerId !== pointerId) return;
    st.current.pressing = false; st.current.pointerId = null;
    if (e.type === 'pointerup' && hover !== null) {
      const next = hover + 1;
      commit(allowClear && next === value ? 0 : next);
    }
    if (e.pointerType !== 'mouse') setHover(null);
  };
  const handlePointerLeave = () => { if (!st.current.pressing) setHover(null); };
  const handleKeyDown = e => {
    if (!interactive) return;
    const min = allowClear ? 0 : 1;
    let next;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowUp': next = clamp(value + 1, min, count); break;
      case 'ArrowLeft': case 'ArrowDown': next = clamp(value - 1, min, count); break;
      case 'Home': next = 1; break;
      case 'End': next = count; break;
      case 'Backspace': case 'Delete': if (!allowClear) return; next = 0; break;
      case ' ': case 'Enter': {
        const index = starEls.current.indexOf(e.target);
        if (index === -1) return;
        next = allowClear && index + 1 === value ? 0 : index + 1;
        break;
      }
      default: return;
    }
    e.preventDefault();
    if (rootRef.current) rootRef.current.setAttribute('data-instant', 'true');
    st.current.hover = null;
    commit(next, false);
    const target = starEls.current[Math.max(next, 1) - 1];
    if (target) target.focus();
  };
  useEffect(() => {
    const reset = () => { st.current.pressing = false; st.current.pointerId = null; setHoverRef.current(null); };
    const onVisibility = () => { if (document.hidden) reset(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', reset);
    return () => { document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', reset); };
  }, []);

  const Star = readOnly ? 'span' : 'button';
  const tipRoom = interactive && showTip ? Math.round(size * 0.9) : 0;
  const glyph = icon || h('svg', { viewBox: '0 0 24 24', fill: 'currentColor', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d: PR_SHAPES[shape] || PR_SHAPES.star }));

  return h('div', {
    ref: rootRef, role: readOnly ? 'img' : 'radiogroup', 'aria-label': readOnly ? `${value} of ${count}` : ariaLabel,
    'aria-disabled': disabled || undefined, className: `peek-rating${className ? ' ' + className : ''}`,
    style: {
      '--pr-active': activeColor, '--pr-idle': idleColor, '--pr-tip': tipColor, '--pr-tip-text': tipTextColor,
      '--pr-size': `${size}px`, '--pr-gap': `${Math.round(size * 0.22)}px`, '--pr-room': `${lift + tipRoom}px`, '--pr-rise': `${riseDuration}ms`
    },
    onKeyDown: readOnly ? undefined : handleKeyDown
  },
    h('div', {
      ref: rowRef, className: 'peek-rating__row', onPointerEnter: handlePointerEnter, onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove, onPointerUp: endPress, onPointerCancel: endPress, onLostPointerCapture: endPress,
      onPointerLeave: handlePointerLeave
    },
      interactive && showTip ? h('span', { ref: tipEl, className: 'peek-rating__tip', 'aria-hidden': 'true' }) : null,
      Array.from({ length: count }, (_, i) => {
        const checked = value === i + 1;
        const label = labels[i] ? `${i + 1} of ${count}, ${labels[i]}` : `${i + 1} of ${count}`;
        return h(Star, {
          key: i, ref: el => { starEls.current[i] = el; }, type: readOnly ? undefined : 'button', className: 'peek-rating__star',
          role: readOnly ? undefined : 'radio', 'aria-checked': readOnly ? undefined : checked,
          'aria-label': readOnly ? undefined : label, 'aria-hidden': readOnly || undefined,
          tabIndex: !interactive ? -1 : (value === 0 ? i === 0 : checked) ? 0 : -1
        },
          h('span', { ref: el => { liftEls.current[i] = el; }, className: 'peek-rating__lift' },
            h('span', { ref: el => { glyphEls.current[i] = el; }, className: 'peek-rating__glyph' }, glyph)));
      })
    )
  );
};

/* ===== React Bits: SlideCommit (motion swapped for the engine above) ===== */
const SC_PAD = 4, SC_SQUASH_MAX = 0.08, SC_SQUASH_DIV = 110, SC_SWELL = 1.03, SC_MIN_PENDING = 300;
const SC_SHAKE = [0, -5, 5, -3, 3, -1, 0];
const scOnColor = hex => {
  const raw = String(hex).replace('#', '');
  const full = raw.length === 3 ? raw.split('').map(ch => ch + ch).join('') : raw.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return '#ffffff';
  const yiq = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return yiq >= 128 ? '#111111' : '#ffffff';
};
const scVelocity = hist => {
  if (hist.length < 2) return 0;
  const a = hist[0], b = hist[hist.length - 1];
  return ((b[1] - a[1]) / Math.max(1, b[0] - a[0])) * 1000;
};
const scFine = () => !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

export const SlideCommit = ({
  label = 'Slide to pay', doneLabel = 'Paid', errorLabel = 'Payment failed', onConfirm, onDone, onError,
  trackColor = '#262626', handleColor = '#f5f5f5', successColor = '#22c55e', dangerColor = '#e5484d',
  width = 280, height = 56, radius = 28, speed = 50, returnBounce = 0.38, landingDip = 0.026, holdMs = 1500,
  disabled = false, icon, className = ''
}) => {
  const reduce = prefersReducedMotion();
  const [phase, setPhaseState] = useState('idle');
  const [held, setHeldState] = useState(false);
  const trackRef = useRef(null), capsuleRef = useRef(null), trackEl = useRef(null);
  const els = useRef({});
  const grip = useRef(null), timer = useRef(0), homeTimer = useRef(0), run = useRef(0), unwatch = useRef(null);
  const live = useRef({ move: () => {}, up: () => {} });
  const lastPercent = useRef(-1);
  const flags = useRef({ phase: 'idle', held: false, hot: false });
  const cb = useRef({});
  cb.current = { onConfirm, onDone, onError };

  const GRIP = height - SC_PAD * 2, INNER = width - SC_PAD * 2, TRAVEL = Math.max(1, INNER - GRIP);
  const r = clamp(radius, 0, height / 2), gripR = Math.max(0, r - SC_PAD);
  const k = 260 + (clamp(speed, 0, 100) / 100) * 640, mass = 0.9, critical = 2 * Math.sqrt(k * mass);
  const commitSpring = { stiffness: k, damping: critical, mass };
  const homeSpring = { stiffness: k, damping: critical * (1 - clamp(returnBounce, 0, 0.5)), mass };

  const V = useRef({ x: 0, anchor: 0, shown: 1, spin: 0, pulse: 1, shake: 0 }).current;

  const apply = () => {
    const e = els.current;
    if (!e.capsule) return;
    const seen = clamp(V.x, 0, TRAVEL);
    const edge = seen + GRIP + clamp(V.anchor - seen, 0, TRAVEL);
    const f = flags.current;
    const swell = f.hot && !f.held && f.phase === 'idle' && !reduce ? SC_SWELL : 1;
    const q = 1 - Math.min(SC_SQUASH_MAX, Math.max(0, -V.x) / SC_SQUASH_DIV);
    e.capsule.style.clipPath = `inset(0 ${INNER - edge}px 0 0 round ${gripR}px)`;
    e.capsule.style.transform = `scale(${q * swell}, ${swell / q})`;
    e.capsule.style.transformOrigin = `${seen}px 50%`;
    e.content.style.transform = `translateX(${(seen + edge) / 2 - INNER / 2}px)`;
    e.label.style.opacity = clamp(1 - seen / (TRAVEL * 0.55), 0, 1);
    e.arrow.style.opacity = V.shown * clamp(1 - (seen - TRAVEL * 0.55) / (TRAVEL * 0.4), 0, 1);
    e.spin.style.opacity = V.spin;
    e.track.style.transform = `translateX(${V.shake}px) scale(${V.pulse})`;
    const percent = Math.round((seen / TRAVEL) * 100);
    if (percent !== lastPercent.current) {
      lastPercent.current = percent;
      e.capsule.setAttribute('aria-valuenow', String(percent));
      e.capsule.setAttribute('aria-valuetext', `${typeof label === 'string' ? label : 'Slide to confirm'}, ${percent}%`);
    }
  };
  const go = (key, to, opts) => animateKey(V, key, to, opts, apply);
  const setPhase = p => { flags.current.phase = p; setPhaseState(p); apply(); };
  const setHeld = v => { flags.current.held = v; setHeldState(v); apply(); };

  useLayoutEffect(() => {
    const t = trackEl.current;
    els.current = {
      track: t, capsule: t.querySelector('.slide-commit__capsule'), content: t.querySelector('.slide-commit__content'),
      label: t.querySelector('.slide-commit__label'), arrow: t.querySelector('.slide-commit__arrow'), spin: t.querySelector('.slide-commit__spin')
    };
    apply();
  });
  useEffect(() => () => {
    clearTimeout(timer.current); clearTimeout(homeTimer.current);
    if (unwatch.current) unwatch.current();
    run.current += 1;
    for (const key of Object.keys(V.__anims || {})) V.__anims[key].cancel();
  }, []);

  const local = clientX => {
    const rect = trackRef.current && trackRef.current.getBoundingClientRect();
    if (!rect) return 0;
    return (clientX - rect.left) / (rect.width / width || 1);
  };
  const goHome = velocity => {
    if (reduce) go('x', 0, { duration: 0.2, ease: EASE_OUT_FN });
    else go('x', 0, Object.assign({}, homeSpring, { velocity: Math.min(0, velocity) }));
  };
  const settle = () => {
    setPhase('idle');
    go('shown', 1, { duration: 0.2, delay: 0.12 });
    if (reduce) { V.anchor = 0; apply(); } else go('anchor', 0, { stiffness: 440, damping: 2 * Math.sqrt(440), mass: 1 });
  };
  const resolve = viaKey => {
    setPhase('done');
    V.anchor = V.x; apply();
    go('spin', 0, { duration: 0.12 });
    if (reduce) { V.x = 0; apply(); }
    else {
      go('x', 0, commitSpring);
      if (!viaKey && landingDip > 0) go('pulse', [1, 1 - landingDip, 1], { duration: 0.46, times: [0, 0.62, 1], ease: EASE_OUT_FN, delay: 0.1 });
    }
    if (cb.current.onDone) cb.current.onDone();
    if (holdMs > 0) timer.current = setTimeout(settle, holdMs);
  };
  const reject = reason => {
    setPhase('error');
    if (cb.current.onError) cb.current.onError(reason);
    go('spin', 0, { duration: 0.12 });
    go('shown', 1, { duration: 0.2, delay: 0.12 });
    if (reduce) goHome(0);
    else {
      go('shake', SC_SHAKE, { duration: 0.45, ease: EASE_OUT_FN });
      homeTimer.current = setTimeout(() => { if (!grip.current) goHome(0); }, 300);
    }
    timer.current = setTimeout(() => setPhase('idle'), Math.max(holdMs, 1500));
  };
  const commit = viaKey => {
    clearTimeout(timer.current);
    const id = ++run.current;
    V.x = TRAVEL; apply();
    let out;
    try { out = cb.current.onConfirm ? cb.current.onConfirm() : undefined; } catch (reason) { reject(reason); return; }
    const pending = out && typeof out.then === 'function' ? out : null;
    if (!pending) { go('shown', 0, { duration: 0.12 }); resolve(viaKey); return; }
    setPhase('pending');
    go('shown', 0, { duration: 0.2 });
    go('spin', 1, { duration: 0.2 });
    const t0 = performance.now();
    const later = fn => setTimeout(() => { if (id === run.current) fn(); }, Math.max(0, SC_MIN_PENDING - (performance.now() - t0)));
    pending.then(() => later(() => resolve(viaKey)), reason => later(() => reject(reason)));
  };
  const down = e => {
    const p = flags.current.phase;
    if (disabled || grip.current || p === 'pending' || p === 'done' || e.button !== 0) return;
    if (V.__anims && V.__anims.x) V.__anims.x.cancel();
    grip.current = { id: e.pointerId, grab: null, moved: false, hist: [] };
    setHeld(true);
    try { trackRef.current.setPointerCapture(e.pointerId); } catch (err) {}
    if (unwatch.current) unwatch.current();
    const onMove = ev => ev.isTrusted && live.current.move(ev);
    const onUp = ev => ev.isTrusted && live.current.up(ev);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    unwatch.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      unwatch.current = null;
    };
  };
  const move = e => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    const at = local(e.clientX);
    if (g.grab === null) { g.grab = at - V.x; return; }
    const next = clamp(at - g.grab, 0, TRAVEL);
    if (Math.abs(next - V.x) > 0.5) g.moved = true;
    g.hist.push([e.timeStamp, next]);
    if (g.hist.length > 4) g.hist.shift();
    V.x = next; apply();
  };
  const up = e => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    grip.current = null;
    if (unwatch.current) unwatch.current();
    try { trackRef.current.releasePointerCapture(e.pointerId); } catch (err) {}
    setHeld(false);
    if (V.x >= TRAVEL) commit(false);
    else if (g.moved) goHome(scVelocity(g.hist));
  };
  live.current = { move, up };

  const onKeyDown = e => {
    const p = flags.current.phase;
    if (disabled || p === 'pending' || p === 'done') return;
    const step = TRAVEL / 10;
    if (e.key === 'End') { e.preventDefault(); commit(true); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(TRAVEL, V.x + step);
      V.x = next; apply();
      if (next >= TRAVEL) commit(true);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); V.x = Math.max(0, V.x - step); apply(); }
    else if (e.key === 'Home' || e.key === 'Escape') {
      e.preventDefault();
      if (grip.current) up({ pointerId: grip.current.id }); else { V.x = 0; apply(); }
    }
  };

  const fontSize = clamp(Math.round(height * 0.25), 13, 17);
  const iconSize = Math.round(GRIP * 0.42);
  const labelText = typeof label === 'string' ? label : 'Slide to confirm';
  const arrowIcon = icon || h('svg', { width: iconSize, height: iconSize, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: 'M5 12h14M13 6l6 6-6 6' }));

  return h('div', {
    className: `slide-commit${className ? ' ' + className : ''}`, 'data-phase': phase, 'data-held': held ? '' : undefined,
    'data-disabled': disabled ? '' : undefined,
    style: {
      width, height, '--sc-track': trackColor, '--sc-ink': handleColor, '--sc-ok': successColor, '--sc-no': dangerColor,
      '--sc-on-ink': scOnColor(handleColor), '--sc-on-ok': scOnColor(successColor), '--sc-on-no': scOnColor(dangerColor),
      '--sc-radius': `${r}px`, '--sc-grip-r': `${gripR}px`, '--sc-pad': `${SC_PAD}px`, '--sc-font': `${fontSize}px`
    }
  },
    h('div', { ref: el => { trackRef.current = el; trackEl.current = el; }, className: 'slide-commit__track', onPointerDown: down },
      h('span', { className: 'slide-commit__label', 'aria-hidden': 'true' },
        h('span', { className: 'slide-commit__text slide-commit__text--plain' }, label),
        h('span', { className: 'slide-commit__text slide-commit__text--error' }, errorLabel)),
      h('div', {
        ref: capsuleRef, role: 'slider', tabIndex: disabled ? -1 : 0, 'aria-label': labelText, 'aria-valuemin': 0, 'aria-valuemax': 100,
        'aria-valuenow': 0, 'aria-busy': phase === 'pending' || undefined, 'aria-disabled': disabled || undefined,
        className: 'slide-commit__capsule', onKeyDown,
        onPointerEnter: e => { if (e.pointerType === 'mouse' && scFine()) { flags.current.hot = true; apply(); } },
        onPointerLeave: () => { flags.current.hot = false; apply(); }
      },
        h('div', { className: 'slide-commit__content' },
          h('span', { className: 'slide-commit__arrow', 'aria-hidden': 'true' }, arrowIcon),
          h('span', { className: 'slide-commit__spin', 'aria-hidden': 'true' },
            h('svg', { className: 'slide-commit__spinner', width: iconSize, height: iconSize, viewBox: '0 0 24 24', 'aria-hidden': 'true' },
              h('circle', { cx: 12, cy: 12, r: 9, fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeOpacity: 0.25 }),
              h('path', { d: 'M12 3a9 9 0 0 1 9 9', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' }))),
          h('span', { className: 'slide-commit__done', 'aria-hidden': 'true' },
            h('svg', { width: Math.round(GRIP * 0.38), height: Math.round(GRIP * 0.38), viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: 'M20 6 9 17l-5-5' })),
            doneLabel))),
      h('span', { className: 'slide-commit__sr', 'aria-live': 'polite' },
        phase === 'pending' ? 'Working' : phase === 'done' ? doneLabel : phase === 'error' ? errorLabel : ''))
  );
};

/* ===== React Bits: TrueFocus (motion swapped for CSS transitions) ===== */
const TF_CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const TF_GAP = 10;
const TF_SMOOTH = 'cubic-bezier(0.65, 0, 0.35, 1)';
const TF_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export const TrueFocus = ({
  sentence = 'True Focus', separator = ' ', manualMode = false, focusStyle = 'brackets', order = 'sequential',
  easing = 'smooth', blurAmount = 5, focusScale = 1, borderColor = 'green', highlightColor, glowColor = 'transparent',
  animationDuration = 0.5, pauseBetweenAnimations = 1, cornerSize = 16, borderWidth = 3, unfocusedOpacity = 1
}) => {
  const words = sentence.split(separator).filter(w => w.trim() !== '');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [focusRect, setFocusRect] = useState(null);
  const [shown, setShown] = useState(false);
  const containerRef = useRef(null);
  const wordRefs = useRef([]);
  const reduceMotion = prefersReducedMotion();
  const duration = reduceMotion ? 0 : animationDuration;
  const activeIndex = words.length ? currentIndex % words.length : -1;
  const spring = easing === 'spring' && !reduceMotion;
  const curve = spring ? TF_SPRING : TF_SMOOTH;
  const move = `${duration}s ${curve}`;

  useEffect(() => {
    if (manualMode || words.length < 2) return;
    const interval = setInterval(() => {
      const roll = Math.random();
      setCurrentIndex(prev => {
        const current = prev % words.length;
        if (order !== 'random') return (current + 1) % words.length;
        const next = Math.floor(roll * (words.length - 1));
        return next >= current ? next + 1 : next;
      });
    }, (animationDuration + pauseBetweenAnimations) * 1000);
    return () => clearInterval(interval);
  }, [manualMode, animationDuration, pauseBetweenAnimations, words.length, order]);

  useLayoutEffect(() => {
    const container = containerRef.current, word = wordRefs.current[activeIndex];
    if (!container || !word) return;
    const measure = () => {
      const next = { x: word.offsetLeft, y: word.offsetTop, width: word.offsetWidth, height: word.offsetHeight };
      setFocusRect(prev => prev && prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height ? prev : next);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    wordRefs.current.forEach(n => n && observer.observe(n));
    return () => observer.disconnect();
  }, [activeIndex, sentence, separator]);

  useEffect(() => {
    if (!focusRect || shown) return;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [focusRect, shown]);

  const frame = focusRect && {
    x: focusRect.x - (focusRect.width * (focusScale - 1)) / 2,
    y: focusRect.y - (focusRect.height * (focusScale - 1)) / 2,
    width: focusRect.width * focusScale,
    height: focusRect.height * focusScale
  };
  const corners = frame && {
    'top-left': { x: frame.x - TF_GAP, y: frame.y - TF_GAP },
    'top-right': { x: frame.x + frame.width + TF_GAP - cornerSize, y: frame.y - TF_GAP },
    'bottom-left': { x: frame.x - TF_GAP, y: frame.y + frame.height + TF_GAP - cornerSize },
    'bottom-right': { x: frame.x + frame.width + TF_GAP - cornerSize, y: frame.y + frame.height + TF_GAP - cornerSize }
  };
  const shapes = frame && {
    box: { x: frame.x - TF_GAP, y: frame.y - TF_GAP, width: frame.width + TF_GAP * 2, height: frame.height + TF_GAP * 2 },
    underline: { x: frame.x, y: frame.y + frame.height + TF_GAP * 0.4, width: frame.width, height: borderWidth },
    highlight: { x: frame.x - frame.height * 0.14, y: frame.y + frame.height * 0.04, width: frame.width + frame.height * 0.28, height: frame.height * 0.92 }
  };
  const place = s => ({
    transform: `translate(${s.x}px, ${s.y}px)`, width: s.width, height: s.height, opacity: shown ? 1 : 0,
    transition: `transform ${move}, width ${move}, height ${move}, opacity ${duration || 0.01}s ease`
  });
  const cornerPlace = c => ({
    transform: `translate(${c.x}px, ${c.y}px)`, opacity: shown ? 1 : 0,
    transition: `transform ${move}, opacity ${duration || 0.01}s ease`
  });
  const frameStyle = {
    '--border-color': borderColor,
    '--highlight-color': `color-mix(in srgb, ${highlightColor || borderColor} 30%, transparent)`,
    '--glow-color': glowColor, '--corner-size': `${cornerSize}px`, '--border-width': `${borderWidth}px`
  };

  return h('div', { className: 'focus-container', ref: containerRef, style: frameStyle },
    focusStyle === 'highlight' && shapes ? h('span', { className: 'focus-highlight', 'aria-hidden': 'true', style: place(shapes.highlight) }) : null,
    words.map((word, index) => {
      const isActive = index === activeIndex;
      return h('span', {
        key: index, ref: el => { wordRefs.current[index] = el; },
        className: `focus-word ${manualMode ? 'manual' : ''} ${isActive && !manualMode ? 'active' : ''}`,
        style: {
          filter: `blur(${isActive ? 0 : blurAmount}px)`, opacity: isActive ? 1 : unfocusedOpacity,
          transform: focusScale !== 1 ? `scale(${isActive ? focusScale : 1})` : undefined,
          transition: `filter ${duration}s ease, opacity ${duration}s ease, transform ${duration}s ${curve}`
        },
        onMouseEnter: () => { if (manualMode) setCurrentIndex(index); }
      }, word);
    }),
    shapes && corners && focusStyle !== 'highlight'
      ? h('div', { className: 'focus-frame', 'aria-hidden': 'true' },
          focusStyle === 'box' ? h('span', { className: 'focus-box', style: place(shapes.box) }) : null,
          focusStyle === 'underline' ? h('span', { className: 'focus-underline', style: place(shapes.underline) }) : null,
          focusStyle !== 'box' && focusStyle !== 'underline'
            ? TF_CORNERS.map(c => h('span', { key: c, className: `corner ${c}`, style: cornerPlace(corners[c]) }))
            : null)
      : null
  );
};
