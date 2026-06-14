import { useEffect, useRef, type RefObject } from 'react';
import { REACTION_EMOJIS } from '../../lib/db';
import styles from './EmojiPicker.module.css';

type EmojiPickerProps = {
  activeEmojis: Set<string>;
  onSelect: (emoji: string) => void;
  label: string;
};

export function EmojiPicker({ activeEmojis, onSelect, label }: EmojiPickerProps) {
  return (
    <div className={styles.popover} role="group" aria-label={label}>
      <span className={styles.label}>{label}</span>
      <div className={styles.rail}>
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={activeEmojis.has(emoji) ? styles.cellActive : styles.cell}
            onClick={() => onSelect(emoji)}
            aria-label={emoji}
            aria-pressed={activeEmojis.has(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export function useOutsideClick(ref: RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutside();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, onOutside]);
}

export function useLongPressTooltip(title: string) {
  const timerRef = useRef<number | null>(null);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return {
    title,
    onTouchStart: () => {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        // title attribute surfaces on long-press on most mobile browsers
      }, 400);
    },
    onTouchEnd: clearTimer,
    onTouchCancel: clearTimer,
  };
}
