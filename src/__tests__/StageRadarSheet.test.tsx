import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import StageRadarSheet from '../components/now/StageRadarSheet';
import type { StageRadarEntry } from '../services/stageRadar';
import type { TimedBand } from '../services/timedBand';

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      if (key === 'sheetGoing') return `Going (${vars?.count})`;
      if (key === 'timeRange') return `${vars?.start} – ${vars?.end}`;
      if (key === 'nextFoot') return `Next · ${vars?.time}`;
      const map: Record<string, string> = {
        live: 'LIVE',
        next: 'NEXT',
        you: 'you',
        close: 'Close',
        going: `${vars?.count ?? 0} going`,
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('../services/stageColors', () => ({ stageColor: () => '#9b2c2c' }));
vi.mock('../services/bandTime', () => ({
  formatTime: (iso: string) => iso.slice(11, 16),
}));

const band: TimedBand = {
  id: '1',
  festival_id: 'sb',
  slot_id: '1',
  name: 'Powerwolf',
  stage: 'Main Stage',
  start_time: '2026-07-30T14:00:00Z',
  end_time: '2026-07-30T15:10:00Z',
  image_url: null,
  genre: null,
  category: null,
  created_at: '2026-01-01T00:00:00.000Z',
};

const entry: StageRadarEntry = {
  stage: 'Main Stage',
  status: 'live',
  band,
  pickers: [
    { userId: 'me', label: 'Bruno', avatar_url: null },
    { userId: 'u2', label: 'Ana', avatar_url: null },
  ],
  pickerCount: 2,
};

describe('StageRadarSheet', () => {
  it('lists pickers and marks current user', () => {
    render(<StageRadarSheet entry={entry} userId="me" onClose={vi.fn()} />);
    expect(screen.getByText('Powerwolf')).toBeInTheDocument();
    expect(screen.getByText('Going (2)')).toBeInTheDocument();
    expect(screen.getByText('Bruno')).toBeInTheDocument();
    expect(screen.getByText('you')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('calls onClose from close control', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StageRadarSheet entry={entry} userId="me" onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
