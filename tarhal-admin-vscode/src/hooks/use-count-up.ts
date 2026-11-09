import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Counts from the previous value to `target`. Whole numbers while moving, the exact value at the end, no animation for reduced motion. */
export function useCountUp(target: number, duration = 650): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const from = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion() || from.current === target) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      if (progress < 1) {
        const current = Math.round(origin + (target - origin) * eased);
        from.current = current;
        setValue(current);
        frame = requestAnimationFrame(step);
      } else {
        from.current = target;
        setValue(target);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
