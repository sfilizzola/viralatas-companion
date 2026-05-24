import { useState, useEffect, useCallback } from 'react';
import type { Band } from '../types';
import { BANDS_CHANGED_EVENT, loadBands } from '../lib/db';

export function useBands() {
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await loadBands();
    setBands(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      const data = await loadBands();
      if (active) {
        setBands(data);
        setLoading(false);
      }
    }

    function handleChange() {
      load();
    }

    load();
    window.addEventListener(BANDS_CHANGED_EVENT, handleChange);

    return () => {
      active = false;
      window.removeEventListener(BANDS_CHANGED_EVENT, handleChange);
    };
  }, []);

  return { bands, loading, refresh };
}
