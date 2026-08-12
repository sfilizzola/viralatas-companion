import { useEffect, useMemo, useRef, useState } from 'react';
import { useActiveFestival } from '../hooks/useActiveFestival';
import { useI18n } from '../lib/i18n';
import styles from './FestivalSwitcher.module.css';

export default function FestivalSwitcher() {
  const { t } = useI18n('FestivalsPage');
  const { festival, catalog, memberships, activeFestivalId, setActive } = useActiveFestival();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const joinedFestivals = useMemo(() => {
    const ids = new Set(memberships.map((m) => m.festival_id));
    return catalog.filter((f) => ids.has(f.id));
  }, [catalog, memberships]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  if (joinedFestivals.length === 0) return null;

  const label = festival?.name ?? joinedFestivals[0]?.name ?? '—';

  async function handleSelect(festivalId: string) {
    if (festivalId === activeFestivalId) {
      setOpen(false);
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setToast(t('needSignalToSwitch'));
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await setActive(festivalId);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.root} ref={rootRef}>
        <button
          type="button"
          className={styles.trigger}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={busy || joinedFestivals.length < 2}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.triggerLabel}>{label}</span>
          {joinedFestivals.length > 1 && (
            <span className={styles.chevron} aria-hidden="true">
              ▾
            </span>
          )}
        </button>

        {open && joinedFestivals.length > 1 && (
          <div className={styles.menu} role="listbox">
            {joinedFestivals.map((item) => {
              const isActive = item.id === activeFestivalId;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`${styles.option} ${isActive ? styles.optionActive : ''}`}
                  disabled={busy}
                  onClick={() => void handleSelect(item.id)}
                >
                  <span>{item.name}</span>
                  {isActive && <span className={styles.activeMark}>●</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}
