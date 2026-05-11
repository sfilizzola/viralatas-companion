import type { ReactNode } from 'react';
import styles from './SectionTitle.module.css';

type SectionTitleProps = {
  children: ReactNode;
  className?: string;
};

export default function SectionTitle({ children, className }: SectionTitleProps) {
  return (
    <div className={[styles.title, className].filter(Boolean).join(' ')}>{children}</div>
  );
}
