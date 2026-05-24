import { useEffect, useState } from 'react';
import type { MetalPlaceConfig } from '../types';
import {
  METAL_PLACE_CONFIG_CHANGED_EVENT,
  loadMetalPlaceConfig,
  saveMetalPlaceConfig,
} from '../lib/db';
import { presenceRepository } from '../repositories';
import { subscribePostgresChanges } from '../lib/realtimeSync';

export function useMetalPlaceConfig(): MetalPlaceConfig | null {
  const [metalPlaceConfig, setMetalPlaceConfig] = useState<MetalPlaceConfig | null>(null);

  useEffect(() => {
    async function loadMetalPlaceConfigFromDB() {
      const config = await loadMetalPlaceConfig();
      setMetalPlaceConfig(config);
    }
    loadMetalPlaceConfigFromDB();
    presenceRepository.syncMetalPlaceConfig().catch(() => {});

    function handleConfigChange() { loadMetalPlaceConfigFromDB(); }
    window.addEventListener(METAL_PLACE_CONFIG_CHANGED_EVENT, handleConfigChange);

    const unsubscribeRealtime = subscribePostgresChanges('metal_place_config_live', {
      filter: { event: '*', table: 'metal_place_config' },
      handler: async (payload) => {
        const next = (payload.new ?? payload.old) as MetalPlaceConfig | undefined;
        if (next) await saveMetalPlaceConfig(next);
      },
    });
    return () => {
      window.removeEventListener(METAL_PLACE_CONFIG_CHANGED_EVENT, handleConfigChange);
      unsubscribeRealtime();
    };
  }, []);

  return metalPlaceConfig;
}
