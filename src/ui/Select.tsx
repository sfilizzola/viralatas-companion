import type { ReactNode, SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  children: ReactNode;
};

export default function Select({ label, id, className, children, ...props }: SelectProps) {
  const select = (
    <select
      id={id}
      className={[styles.select, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </select>
  );

  if (label) {
    return (
      <label className={styles.label} htmlFor={id}>
        {label}
        {select}
      </label>
    );
  }

  return select;
}
