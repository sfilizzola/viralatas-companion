import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuackGhostRow from '../components/QuackGhostRow';

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('../hooks/useCooldown', () => ({
  useCooldown: vi.fn(),
}));

import { useCooldown } from '../hooks/useCooldown';

describe('QuackGhostRow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onDuck when clicked and not on cooldown', () => {
    vi.mocked(useCooldown).mockReturnValue(false);
    const onDuck = vi.fn();
    render(<QuackGhostRow onDuck={onDuck} cooldownUntil={null} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onDuck).toHaveBeenCalledTimes(1);
  });

  it('is disabled and does not call onDuck when on cooldown', () => {
    vi.mocked(useCooldown).mockReturnValue(true);
    const onDuck = vi.fn();
    render(<QuackGhostRow onDuck={onDuck} cooldownUntil={Date.now() + 90_000} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onDuck).not.toHaveBeenCalled();
  });

  it('shows "quack" label when idle', () => {
    vi.mocked(useCooldown).mockReturnValue(false);
    render(<QuackGhostRow onDuck={() => {}} cooldownUntil={null} />);
    expect(screen.getByText('quack')).toBeInTheDocument();
  });

  it('shows "cooldown" label when on cooldown', () => {
    vi.mocked(useCooldown).mockReturnValue(true);
    render(<QuackGhostRow onDuck={() => {}} cooldownUntil={Date.now() + 90_000} />);
    expect(screen.getByText('cooldown')).toBeInTheDocument();
  });

  it('renders the duck image', () => {
    vi.mocked(useCooldown).mockReturnValue(false);
    render(<QuackGhostRow onDuck={() => {}} cooldownUntil={null} />);
    const img = screen.getByRole('button').querySelector('img');
    expect(img).toHaveAttribute('src', '/rubber-duck.png');
  });

  it('has aria-label "quackLabel" when idle', () => {
    vi.mocked(useCooldown).mockReturnValue(false);
    render(<QuackGhostRow onDuck={() => {}} cooldownUntil={null} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'quackLabel');
  });

  it('has aria-label "cooldownLabel" when on cooldown', () => {
    vi.mocked(useCooldown).mockReturnValue(true);
    render(<QuackGhostRow onDuck={() => {}} cooldownUntil={Date.now() + 90_000} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'cooldownLabel');
  });
});
