import { useEffect, type ReactNode } from 'react';
import styles from './Modal.module.css';

type ModalProps = {
  onClose: () => void;
  children: ReactNode;
  position?: 'center' | 'bottom';
  contentClassName?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  'aria-label'?: string;
};

export default function Modal({
  onClose,
  children,
  position = 'center',
  contentClassName,
  closeOnBackdrop = true,
  closeOnEscape = true,
  'aria-label': ariaLabel,
}: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && closeOnEscape) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape, onClose]);

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

  function handleBackdropClick() {
    if (closeOnBackdrop) onClose();
  }

  return (
    <div className={backdropClass} onClick={handleBackdropClick} role="presentation">
      <div
        className={contentClass}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
