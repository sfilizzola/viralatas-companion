import { useState, useEffect, useCallback } from 'react';
import type { Band } from '../types';
import { BANDS_CHANGED_EVENT, loadBands } from '../lib/db';
import { withTimeout } from '../lib/withTimeout';

const BANDS_LOAD_TIMEOUT_MS = 5_000;

export function useBands() {
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await withTimeout(loadBands(), BANDS_LOAD_TIMEOUT_MS);
      setBands(data);
    } catch {
      setBands([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await withTimeout(loadBands(), BANDS_LOAD_TIMEOUT_MS);
        if (active) setBands(data);
      } catch {
        if (active) setBands([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    function handleChange() {
      void load();
    }

    void load();
    window.addEventListener(BANDS_CHANGED_EVENT, handleChange);

    return () => {
      active = false;
      window.removeEventListener(BANDS_CHANGED_EVENT, handleChange);
    };
  }, []);

  return { bands, loading, refresh };
}
