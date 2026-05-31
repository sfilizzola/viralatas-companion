import { type MouseEvent } from 'react';
import { useI18n } from '../lib/i18n';
import { useCooldown } from '../hooks/useCooldown';
import { useCountdownProgress } from '../hooks/useCountdownProgress';
import { DUCK_COOLDOWN_MS } from '../services/duck/constants';
import styles from './QuackGhostRow.module.css';

type QuackGhostRowProps = {
  onDuck: () => void;
  /** Expiry timestamp (ms since epoch) of the current cooldown, or null when idle. */
  cooldownUntil: number | null;
};

export default function QuackGhostRow({ onDuck, cooldownUntil }: QuackGhostRowProps) {
  const { t } = useI18n('QuackGhostRow');
  const isOnCooldown = useCooldown(cooldownUntil);
  const { fillFraction, countdown } = useCountdownProgress(cooldownUntil, DUCK_COOLDOWN_MS);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (isOnCooldown) return;
    onDuck();
  }

  return (
    <button
      type="button"
      className={styles.row}
      onClick={handleClick}
      disabled={isOnCooldown}
      aria-label={isOnCooldown ? t('cooldownLabel') : t('quackLabel')}
    >
      <div
        className={styles.progress}
        style={{ width: `${fillFraction * 100}%` }}
        aria-hidden
      />
      <img
        src="/rubber-duck.png"
        alt=""
        className={`${styles.duck} ${isOnCooldown ? styles.duckCooldown : ''}`}
      />
      <span className={styles.label}>
        {isOnCooldown ? t('cooldown') : t('quack')}
      </span>
      {isOnCooldown && (
        <span className={styles.countdown} aria-hidden>
          {countdown}
        </span>
      )}
    </button>
  );
}
