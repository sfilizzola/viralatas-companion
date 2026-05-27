import styles from './WrapProgress.module.css';

type WrapProgressProps = {
  activeIndex: number;
  total?: number;
};

export default function WrapProgress({ activeIndex, total = 5 }: WrapProgressProps) {
  return (
    <div className={styles.bar} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
        />
      ))}
    </div>
  );
}
