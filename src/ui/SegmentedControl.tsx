import styles from './SegmentedControl.module.css';

type SegmentOption = {
  value: string;
  label: string;
};

type SegmentedControlProps = {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps) {
  return (
    <div className={[styles.seg, className].filter(Boolean).join(' ')}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={[styles.btn, value === opt.value ? styles.active : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
