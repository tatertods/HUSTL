import { useState, useEffect, useRef, prefersReducedMotion, clamp } from './base.js';

export const useCountUp = (target, ms = 520) => {
  const [value, setValue] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    const from = ref.current, t0 = performance.now();
    let raf = 0;
    if (prefersReducedMotion()) { ref.current = target; setValue(target); return undefined; }
    const step = now => {
      const p = clamp((now - t0) / ms, 0, 1);
      const val = from + (target - from) * (1 - Math.pow(1 - p, 3));
      ref.current = val; setValue(val);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
};
