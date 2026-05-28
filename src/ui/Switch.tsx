import styles from './Switch.module.css';

type SwitchTone = 'manager' | 'friend';

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  tone: SwitchTone;
  ariaLabel: string;
};

export default function Switch({
  checked,
  onChange,
  disabled = false,
  tone,
  ariaLabel,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={[styles.switch, styles[tone]].filter(Boolean).join(' ')}
      onClick={() => onChange(!checked)}
    />
  );
}
