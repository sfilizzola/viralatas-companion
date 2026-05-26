import type { ReactNode } from 'react';
import type { BadgeConfig } from '../../services/badges/types';
import styles from '../BadgesDisplay.module.css';

export function badgeYearSuffix(year: number): string {
  return String(year).slice(-2);
}

type PatchTileProps = {
  badge: BadgeConfig;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  title?: string;
  gridIndex?: number;
  animate?: boolean;
  overlay?: ReactNode;
  className?: string;
};

export default function PatchTile({
  badge,
  onClick,
  disabled,
  ariaLabel,
  title,
  gridIndex,
  animate = true,
  overlay,
  className,
}: PatchTileProps) {
  const btnClass = [
    styles.patchBtn,
    animate ? styles.patchGridItem : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={btnClass}
      style={gridIndex === undefined ? undefined : { ['--settle-i' as string]: gridIndex }}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
    >
      <span className={styles.imgWrapper}>
        <img src={badge.imagePath} alt="" className={styles.patchImg} />
        {badge.year && (
          <span className={styles.yearChip}>{badgeYearSuffix(badge.year)}</span>
        )}
        {overlay}
      </span>
    </button>
  );
}
