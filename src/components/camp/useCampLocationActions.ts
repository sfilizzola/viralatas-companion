import { useCallback, useMemo, useState } from 'react';
import type { CampLocation } from '../../types';
import { openCampInMaps } from '../../services/campLocation';
import { useLongPress } from '../../hooks/useLongPress';

function useIsTouchDevice(): boolean {
  return useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }, []);
}

export function useCampLocationActions(location: CampLocation) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const isTouch = useIsTouchDevice();

  const openSheet = useCallback(() => {
    if (isTouch) setSheetOpen(true);
  }, [isTouch]);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const openMaps = useCallback(() => openCampInMaps(location), [location]);

  const pressHandlers = useLongPress(openSheet, openMaps);

  return { sheetOpen, closeSheet, openMaps, pressHandlers, location, isTouch };
}
