import { useEffect, useState } from 'react';
import type { LiveBandTestConfig } from '../types';
import {
  LIVE_BAND_TEST_CONFIG_CHANGED_EVENT,
  loadLiveBandTestConfig,
  saveLiveBandTestConfig,
} from '../lib/db';
import { syncLiveBandTestConfig } from '../services/liveBandTest';
import { subscribePostgresChanges } from '../lib/realtimeSync';

export function useLiveBandTestConfig(): LiveBandTestConfig | null {
  const [liveBandTestConfig, setLiveBandTestConfig] = useState<LiveBandTestConfig | null>(null);

  useEffect(() => {
    async function loadFromDB() {
      const config = await loadLiveBandTestConfig();
      setLiveBandTestConfig(config);
    }
    loadFromDB();
    syncLiveBandTestConfig().catch(() => {});

    function handleConfigChange() { loadFromDB(); }
    window.addEventListener(LIVE_BAND_TEST_CONFIG_CHANGED_EVENT, handleConfigChange);

    const unsubscribeRealtime = subscribePostgresChanges('live_band_test_config_live', {
      filter: { event: '*', table: 'live_band_test_config' },
      handler: async (payload) => {
        const next = (payload.new ?? payload.old) as LiveBandTestConfig | undefined;
        if (next) await saveLiveBandTestConfig(next);
      },
    });
    return () => {
      window.removeEventListener(LIVE_BAND_TEST_CONFIG_CHANGED_EVENT, handleConfigChange);
      unsubscribeRealtime();
    };
  }, []);

  return liveBandTestConfig;
}
