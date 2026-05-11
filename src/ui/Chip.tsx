import type { CSSProperties, ReactNode } from 'react';
import styles from './Chip.module.css';

type ChipVariant = 'default' | 'role-normal' | 'role-manager' | 'role-godlike';

type ChipProps = {
  children: ReactNode;
  variant?: ChipVariant;
  style?: CSSProperties;
  className?: string;
};

export default function Chip({
  children,
  variant = 'default',
  style,
  className,
}: ChipProps) {
  const variantClass =
    variant === 'role-godlike'
      ? styles.roleGodlike
      : variant === 'role-manager'
        ? styles.roleManager
        : variant === 'role-normal'
          ? styles.roleNormal
          : '';

  const classes = [styles.chip, variantClass, className].filter(Boolean).join(' ');

  return (
    <span className={classes} style={style}>
      {children}
    </span>
  );
}
