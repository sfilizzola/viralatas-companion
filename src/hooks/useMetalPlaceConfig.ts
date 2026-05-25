import { useEffect, useState } from 'react';
import type { MetalPlaceConfig } from '../types';
import { METAL_PLACE_CONFIG_CHANGED_EVENT, loadMetalPlaceConfig } from '../lib/db';
import { presenceRepository } from '../repositories';

export function useMetalPlaceConfig(): MetalPlaceConfig | null {
  const [metalPlaceConfig, setMetalPlaceConfig] = useState<MetalPlaceConfig | null>(null);

  useEffect(() => {
    async function loadMetalPlaceConfigFromDB() {
      const config = await loadMetalPlaceConfig();
      setMetalPlaceConfig(config);
    }
    loadMetalPlaceConfigFromDB();
    presenceRepository.syncMetalPlaceConfig().catch(() => {});

    window.addEventListener(METAL_PLACE_CONFIG_CHANGED_EVENT, loadMetalPlaceConfigFromDB);
    return () => {
      window.removeEventListener(METAL_PLACE_CONFIG_CHANGED_EVENT, loadMetalPlaceConfigFromDB);
    };
  }, []);

  return metalPlaceConfig;
}
