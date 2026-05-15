import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { useI18n } from '../lib/i18n';
import styles from './DuckButton.module.css';

const COOLDOWN_MS = 90_000;

type DuckButtonProps = {
  onDuck: () => void;
  isOnCooldown: boolean;
  cooldownUntil: number | null;
  /** When true, removes the column border-left and fixed width (for in-body placement) */
  inBody?: boolean;
};

export default function DuckButton({ onDuck, isOnCooldown, cooldownUntil, inBody }: DuckButtonProps) {
  const { t } = useI18n('DuckButton');
  const [drainAngle, setDrainAngle] = useState(0);
  const [popping, setPopping] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Continuously update the conic-gradient drain angle during cooldown.
  // drain-angle = elapsed fraction * 360 — dark overlay grows CW from 12 o'clock.
  useEffect(() => {
    if (!isOnCooldown || !cooldownUntil) {
      setDrainAngle(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, cooldownUntil - Date.now());
      const elapsed = COOLDOWN_MS - remaining;
      setDrainAngle((elapsed / COOLDOWN_MS) * 360);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDrainAngle(360);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isOnCooldown, cooldownUntil]);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (isOnCooldown) return;
    setPopping(true);
    onDuck();
  }

  function handleAnimationEnd() {
    setPopping(false);
  }

  return (
    <div className={`${styles.wrapper} ${inBody ? styles.wrapperInBody : ''}`}>
      <button
        type="button"
        className={`${styles.button} ${popping ? styles.popping : ''}`}
        onClick={handleClick}
        disabled={isOnCooldown}
        aria-label={isOnCooldown ? t('cooldownLabel') : t('quackLabel')}
        aria-disabled={isOnCooldown}
        onAnimationEnd={handleAnimationEnd}
      >
        <img src="/rubber-duck.png" alt="" className={styles.duckImg} />

        {isOnCooldown && (
          <div
            className={styles.drainOverlay}
            style={{ '--drain-angle': `${drainAngle}deg` } as React.CSSProperties}
            aria-hidden
          />
        )}
      </button>
    </div>
  );
}
