import { useEffect, useState } from 'react';
import { TIME_OVERRIDE_CHANGED_EVENT, now } from '../lib/time';

export function useNow(intervalMs?: number): Date {
  const [date, setDate] = useState(() => now());

  useEffect(() => {
    function update() {
      setDate(now());
    }

    window.addEventListener(TIME_OVERRIDE_CHANGED_EVENT, update);

    let tick: number | undefined;
    if (intervalMs && intervalMs > 0) {
      tick = window.setInterval(update, intervalMs);
    }

    return () => {
      window.removeEventListener(TIME_OVERRIDE_CHANGED_EVENT, update);
      if (tick !== undefined) window.clearInterval(tick);
    };
  }, [intervalMs]);

  return date;
}
