import styles from './Avatar.module.css';

type AvatarSize = 32 | 40 | 56;

type AvatarProps = {
  src?: string | null;
  initial: string;
  size?: AvatarSize;
  color?: string;
  className?: string;
};

export default function Avatar({
  src,
  initial,
  size = 40,
  color,
  className,
}: AvatarProps) {
  const sizeClass =
    size === 56 ? styles.size56 : size === 32 ? styles.size32 : styles.size40;
  const wrapClass = [styles.wrap, sizeClass, className].filter(Boolean).join(' ');
  const inlineStyle = color ? { backgroundColor: color } : undefined;

  return (
    <div className={wrapClass} style={inlineStyle}>
      {src ? (
        <img src={src} alt="" className={styles.img} />
      ) : (
        <span className={styles.initial} aria-hidden>
          {initial}
        </span>
      )}
    </div>
  );
}
