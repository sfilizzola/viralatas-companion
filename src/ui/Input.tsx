import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './Input.module.css';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
};

export default function Input({ label, id, className, ...props }: InputProps) {
  const input = (
    <input id={id} className={[styles.input, className].filter(Boolean).join(' ')} {...props} />
  );

  if (label) {
    return (
      <label className={styles.label} htmlFor={id}>
        {label}
        {input}
      </label>
    );
  }

  return input;
}
