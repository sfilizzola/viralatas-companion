import { useEffect, useState } from 'react';
import type { LiveBandTestConfig } from '../types';
import { LIVE_BAND_TEST_CONFIG_CHANGED_EVENT, loadLiveBandTestConfig } from '../lib/db';
import { syncLiveBandTestConfig } from '../services/liveBandTest';

export function useLiveBandTestConfig(): LiveBandTestConfig | null {
  const [liveBandTestConfig, setLiveBandTestConfig] = useState<LiveBandTestConfig | null>(null);

  useEffect(() => {
    async function loadFromDB() {
      const config = await loadLiveBandTestConfig();
      setLiveBandTestConfig(config);
    }
    loadFromDB();
    syncLiveBandTestConfig().catch(() => {});

    window.addEventListener(LIVE_BAND_TEST_CONFIG_CHANGED_EVENT, loadFromDB);
    return () => {
      window.removeEventListener(LIVE_BAND_TEST_CONFIG_CHANGED_EVENT, loadFromDB);
    };
  }, []);

  return liveBandTestConfig;
}
