import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { ReactionBar } from '../components/announcements/ReactionBar';
import type { AnnouncementReactionSummary } from '../services/announcementsDisplay';
import { renderWithI18n } from './helpers/i18nMock';

const reactions: AnnouncementReactionSummary[] = [
  {
    emoji: '🤘',
    count: 2,
    reactedByMe: true,
    reactors: ['Alice', 'Bob'],
  },
  {
    emoji: '🍺',
    count: 1,
    reactedByMe: false,
    reactors: ['Carol'],
  },
];

describe('ReactionBar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders only the add stamp when there are no reactions', () => {
    const toggle = vi.fn();
    renderWithI18n(
      <ReactionBar announcementId="ann-1" reactions={[]} toggleReaction={toggle} />,
    );

    expect(screen.getByLabelText('Add reaction')).toBeInTheDocument();
    expect(screen.queryByText('🤘')).not.toBeInTheDocument();
  });

  it('renders reaction stamps and toggles on click', () => {
    const toggle = vi.fn();
    renderWithI18n(
      <ReactionBar announcementId="ann-1" reactions={reactions} toggleReaction={toggle} />,
    );

    fireEvent.click(screen.getByLabelText('2 reactions'));
    expect(toggle).toHaveBeenCalledWith('ann-1', '🤘');

    fireEvent.click(screen.getByLabelText('1 reactions'));
    expect(toggle).toHaveBeenCalledWith('ann-1', '🍺');
  });

  it('opens picker, selects emoji, and closes', () => {
    const toggle = vi.fn();
    renderWithI18n(
      <ReactionBar announcementId="ann-1" reactions={[]} toggleReaction={toggle} />,
    );

    fireEvent.click(screen.getByLabelText('Add reaction'));
    expect(screen.getByRole('group', { name: 'Pick one' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '🔥' }));
    expect(toggle).toHaveBeenCalledWith('ann-1', '🔥');
    expect(screen.queryByRole('group', { name: 'Pick one' })).not.toBeInTheDocument();
  });

  it('closes picker on outside click', () => {
    renderWithI18n(
      <div>
        <ReactionBar announcementId="ann-1" reactions={[]} toggleReaction={vi.fn()} />
        <button type="button">outside</button>
      </div>,
    );

    fireEvent.click(screen.getByLabelText('Add reaction'));
    expect(screen.getByRole('group', { name: 'Pick one' })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('group', { name: 'Pick one' })).not.toBeInTheDocument();
  });

  it('toggles picker open state via add button', () => {
    renderWithI18n(
      <ReactionBar announcementId="ann-1" reactions={[]} toggleReaction={vi.fn()} />,
    );

    const add = screen.getByLabelText('Add reaction');
    fireEvent.click(add);
    expect(add).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(add);
    expect(add).toHaveAttribute('aria-expanded', 'false');
  });
});
