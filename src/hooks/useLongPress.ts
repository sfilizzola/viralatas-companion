import { useCallback, useRef, type MouseEvent } from 'react';

type Options = {
  delayMs?: number;
};

export function useLongPress(
  onLongPress: () => void,
  onPress: () => void,
  { delayMs = 500 }: Options = {},
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(() => {
    longPressTriggeredRef.current = false;
    clear();
    timerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onLongPress();
    }, delayMs);
  }, [clear, delayMs, onLongPress]);

  const onPointerUp = useCallback(() => {
    clear();
    if (!longPressTriggeredRef.current) onPress();
  }, [clear, onPress]);

  const onPointerCancel = useCallback(() => {
    clear();
    longPressTriggeredRef.current = false;
  }, [clear]);

  const onContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel, onContextMenu };
}
