import { useEffect, type ReactNode } from 'react';
import styles from './Modal.module.css';

type ModalProps = {
  onClose: () => void;
  children: ReactNode;
  position?: 'center' | 'bottom';
  contentClassName?: string;
};

export default function Modal({ onClose, children, position = 'center', contentClassName }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const backdropClass = [
    styles.backdrop,
    position === 'bottom' ? styles.backdropBottom : '',
  ]
    .filter(Boolean)
    .join(' ');

  const contentClass = [
    styles.content,
    contentClassName ?? (position === 'bottom' ? styles.contentBottom : styles.contentCenter),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={backdropClass} onClick={onClose} role="presentation">
      <div
        className={contentClass}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
