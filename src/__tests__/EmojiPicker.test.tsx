import { useRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import {
  EmojiPicker,
  useLongPressTooltip,
  useOutsideClick,
} from '../components/announcements/EmojiPicker';
import { REACTION_EMOJIS } from '../lib/db';

describe('EmojiPicker', () => {
  it('renders all reaction emojis and marks active ones', () => {
    const onSelect = vi.fn();
    render(
      <EmojiPicker
        activeEmojis={new Set(['🤘', '🔥'])}
        onSelect={onSelect}
        label="Pick reaction"
      />,
    );

    expect(screen.getByRole('group', { name: 'Pick reaction' })).toBeInTheDocument();
    for (const emoji of REACTION_EMOJIS) {
      const btn = screen.getByRole('button', { name: emoji });
      expect(btn).toBeInTheDocument();
      if (emoji === '🤘' || emoji === '🔥') {
        expect(btn).toHaveAttribute('aria-pressed', 'true');
      }
    }

    fireEvent.click(screen.getByRole('button', { name: '👍' }));
    expect(onSelect).toHaveBeenCalledWith('👍');
  });
});

describe('useOutsideClick', () => {
  function Harness({ onOutside }: { onOutside: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    useOutsideClick(ref, onOutside);
    return (
      <div>
        <div ref={ref} data-testid="inside">
          inside
        </div>
        <button type="button">outside</button>
      </div>
    );
  }

  it('calls onOutside when mousedown happens outside the ref', () => {
    const onOutside = vi.fn();
    render(<Harness onOutside={onOutside} />);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
    expect(onOutside).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(screen.getByTestId('inside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });
});

describe('useLongPressTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns title and touch handlers that manage the timer', () => {
    const { result } = renderHook(() => useLongPressTooltip('Alice, Bob'));

    expect(result.current.title).toBe('Alice, Bob');

    act(() => {
      result.current.onTouchStart?.();
      vi.advanceTimersByTime(400);
      result.current.onTouchEnd?.();
    });

    act(() => {
      result.current.onTouchStart?.();
      result.current.onTouchCancel?.();
    });
  });
});
