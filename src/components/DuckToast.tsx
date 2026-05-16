import { useEffect, useRef, useState } from 'react';
import { loadBands } from '../lib/db';
import { DUCK_QUACK_EVENT, type DuckQuackEventDetail } from '../hooks/useDuckNotifications';
import styles from './DuckToast.module.css';

type ToastState = {
  bandName: string;
  phase: 'entering' | 'visible' | 'exiting';
};

const VISIBLE_MS = 2_800;
const EXIT_MS = 280;

/**
 * Global floating duck notification. Mounts once at the App level.
 * Listens to `viralatas:duck-quack` window events, looks up the band name
 * from IndexedDB, and shows an animated toast.
 */
export default function DuckToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timersRef = useRef<number[]>([]);

  function clearTimers() {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
  }

  function schedule(ms: number, fn: () => void) {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }

  useEffect(() => {
    async function handleDuckQuack(event: Event) {
      const detail = (event as CustomEvent<DuckQuackEventDetail>).detail;

      let bandName = detail.bandName ?? '';
      if (!bandName) {
        const bands = await loadBands();
        const band = bands.find((b) => b.id === detail.bandId);
        bandName = band?.name ?? '';
      }

      clearTimers();

      setToast({ bandName, phase: 'entering' });

      schedule(100, () => {
        setToast((prev) => (prev ? { ...prev, phase: 'visible' } : null));
      });

      schedule(100 + VISIBLE_MS, () => {
        setToast((prev) => (prev ? { ...prev, phase: 'exiting' } : null));
      });

      schedule(100 + VISIBLE_MS + EXIT_MS, () => {
        setToast(null);
      });
    }

    window.addEventListener(DUCK_QUACK_EVENT, handleDuckQuack);
    return () => {
      window.removeEventListener(DUCK_QUACK_EVENT, handleDuckQuack);
      clearTimers();
    };
  }, []);

  if (!toast) return null;

  const phaseClass =
    toast.phase === 'entering'
      ? styles.entering
      : toast.phase === 'exiting'
        ? styles.exiting
        : '';

  return (
    <div className={`${styles.toast} ${phaseClass}`} role="status" aria-live="polite">
      <img src="/rubber-duck.png" alt="🦆" className={styles.duck} />
      <div className={styles.text}>
        {toast.bandName && <span className={styles.bandName}>{toast.bandName}</span>}
        <span className={styles.label}>🦆 quack!</span>
      </div>
    </div>
  );
}
