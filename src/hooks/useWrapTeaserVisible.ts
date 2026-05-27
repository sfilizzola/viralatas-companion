import { useEffect, useState } from 'react';
import { loadBands } from '../lib/db';
import { isWrapDismissed } from '../lib/wrapDismiss';
import { isFestivalEnded, now, TIME_OVERRIDE_CHANGED_EVENT } from '../services/time';

export function useWrapTeaserVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      const bands = await loadBands();
      if (!active) return;
      setVisible(isFestivalEnded(now(), bands) && !isWrapDismissed());
    }

    void check();

    function onTimeOverrideChanged() {
      void check();
    }

    window.addEventListener(TIME_OVERRIDE_CHANGED_EVENT, onTimeOverrideChanged);
    return () => {
      active = false;
      window.removeEventListener(TIME_OVERRIDE_CHANGED_EVENT, onTimeOverrideChanged);
    };
  }, []);

  return visible;
}
