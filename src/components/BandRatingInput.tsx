import type { BandRatingScore } from '../types';
import PawIcon from './icons/PawIcon';
import styles from './BandRatingInput.module.css';

const SCORES: BandRatingScore[] = [1, 2, 3, 4, 5];

type Props = {
  value: BandRatingScore | null;
  onChange: (score: BandRatingScore | null) => void;
  disabled?: boolean;
  sectionTitle?: string;
  clearLabel?: string;
  clearHint?: string;
  scoreLabel?: (score: BandRatingScore) => string;
};

export default function BandRatingInput({
  value,
  onChange,
  disabled = false,
  sectionTitle,
  clearLabel,
  clearHint,
  scoreLabel,
}: Props) {
  return (
    <section className={styles.ratingSection} aria-label={sectionTitle}>
      <div className={styles.ratingHeader}>
        {sectionTitle && <span className={styles.ratingTitle}>{sectionTitle}</span>}
        {value !== null && clearLabel && (
          <button
            type="button"
            className={styles.ratingClear}
            onClick={() => onChange(null)}
            disabled={disabled}
          >
            {clearLabel}
          </button>
        )}
      </div>
      <div className={styles.ratingRow} role="group" aria-label={sectionTitle}>
        {SCORES.map((score) => {
          const active = value !== null && score <= value;
          const exact = value === score;
          const label = scoreLabel?.(score) ?? String(score);
          return (
            <button
              key={score}
              type="button"
              className={[
                styles.ratingBtn,
                active ? styles.ratingBtnActive : '',
                exact ? styles.ratingBtnExact : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onChange(exact ? null : score)}
              disabled={disabled}
              aria-label={label}
              aria-pressed={exact}
            >
              <PawIcon filled={active} size={20} />
            </button>
          );
        })}
      </div>
      {clearHint && <p className={styles.ratingHint}>{clearHint}</p>}
    </section>
  );
}
