import { useEffect, useRef, useState } from 'react';

export function useCountdownProgress(
  cooldownUntil: number | null,
  cooldownMs: number,
): { fillFraction: number; countdown: string } {
  const [fillFraction, setFillFraction] = useState(0);
  const [countdown, setCountdown] = useState('');
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const isActive = cooldownUntil !== null && cooldownUntil > Date.now();
    if (!isActive) {
      setFillFraction(0);
      setCountdown('');
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, cooldownUntil! - Date.now());
      const elapsed = cooldownMs - remaining;
      setFillFraction(Math.min(1, elapsed / cooldownMs));
      const s = Math.ceil(remaining / 1000);
      setCountdown(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [cooldownUntil, cooldownMs]);

  return { fillFraction, countdown };
}
