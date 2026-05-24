import { useId } from 'react';
import type { PresenceLocation } from '../services/livePreview';
import styles from './PresenceToggle.module.css';

export type { PresenceLocation };

type PresenceToggleLabels = {
  title: string;
  camping: string;
  metalPlace: string;
};

type PresenceToggleProps = {
  value: PresenceLocation;
  metalPlaceAvailable: boolean;
  labels: PresenceToggleLabels;
  onChange: (value: PresenceLocation) => void | Promise<void>;
  className?: string;
  disabled?: boolean;
};

export default function PresenceToggle({
  value,
  metalPlaceAvailable,
  labels,
  onChange,
  className,
  disabled = false,
}: PresenceToggleProps) {
  const titleId = useId();
  const toggle = (nextValue: PresenceLocation) => {
    if (disabled) return;
    void onChange(value === nextValue ? 'auto' : nextValue);
  };

  const rootClassName = className ? `${styles.root} ${className}` : styles.root;
  const toggleClassName = metalPlaceAvailable
    ? `${styles.toggle} ${styles.hasMetal}`
    : styles.toggle;

  return (
    <section className={rootClassName} aria-labelledby={titleId}>
      <div className={styles.legend}>
        <b id={titleId}>{labels.title}</b>
      </div>
      <div className={toggleClassName}>
        <button
          type="button"
          className={`${styles.option} ${styles.camping} ${value === 'camping' ? styles.on : ''}`}
          aria-pressed={value === 'camping'}
          onClick={() => toggle('camping')}
          disabled={disabled}
        >
          <span className={styles.dot} aria-hidden />
          {labels.camping}
        </button>
        {metalPlaceAvailable && (
          <button
            type="button"
            className={`${styles.option} ${styles.metal} ${
              value === 'metal_place' ? styles.on : ''
            }`}
            aria-pressed={value === 'metal_place'}
            onClick={() => toggle('metal_place')}
            disabled={disabled}
          >
            <span className={styles.dot} aria-hidden />
            {labels.metalPlace}
          </button>
        )}
      </div>
    </section>
  );
}
