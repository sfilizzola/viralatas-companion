import { useState, type ReactNode } from 'react';
import Icon from '../components/icons/Icon';
import styles from './Collapsible.module.css';

type CollapsibleProps = {
  trigger: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

export default function Collapsible({
  trigger,
  children,
  defaultOpen = false,
  className,
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const wrapClass = [styles.wrap, className].filter(Boolean).join(' ');
  const chevronClass = [styles.chevron, isOpen ? styles.chevronOpen : '']
    .filter(Boolean)
    .join(' ');
  const contentClass = [styles.content, isOpen ? styles.contentOpen : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapClass}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        {trigger}
        <span className={chevronClass}>
          <Icon name="chevron" size={14} />
        </span>
      </button>
      <div className={contentClass}>{children}</div>
    </div>
  );
}
