import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import StageRadarSection from '../components/now/StageRadarSection';
import type { StageRadarEntry } from '../services/stageRadar';
import type { TimedBand } from '../services/timedBand';

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      if (key === 'going') return `${vars?.count} going`;
      if (key === 'startsAt') return `starts ${vars?.time}`;
      if (key === 'nextFoot') return `Next · ${vars?.time}`;
      if (key === 'timeRange') return `${vars?.start} – ${vars?.end}`;
      const map: Record<string, string> = {
        sectionTitle: 'Stages · now',
        live: 'LIVE',
        next: 'NEXT',
        done: 'DONE',
        doneEmpty: 'No more sets today',
        rowAriaLive: 'live-aria',
        rowAriaNext: 'next-aria',
        rowAriaDone: 'done-aria',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('../services/stageColors', () => ({
  stageColor: () => '#9b2c2c',
}));

vi.mock('../services/bandTime', () => ({
  formatTime: (iso: string) => iso.slice(11, 16),
}));

const liveBand: TimedBand = {
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

const entries: StageRadarEntry[] = [
  {
    stage: 'Main Stage',
    status: 'live',
    band: liveBand,
    pickers: [{ userId: 'u1', label: 'Ana', avatar_url: null }],
    pickerCount: 1,
  },
  {
    stage: 'Campsite Circus Stage',
    status: 'done',
    band: null,
    pickers: [],
    pickerCount: 0,
  },
];

describe('StageRadarSection', () => {
  it('renders section title, going count, and done empty copy', () => {
    render(<StageRadarSection entries={entries} onSelect={vi.fn()} />);
    expect(screen.getByText('Stages · now')).toBeInTheDocument();
    expect(screen.getByText('Powerwolf')).toBeInTheDocument();
    expect(screen.getByText('1 going')).toBeInTheDocument();
    expect(screen.getByText('No more sets today')).toBeInTheDocument();
  });

  it('calls onSelect for live rows and not for done rows', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<StageRadarSection entries={entries} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: 'live-aria' }));
    expect(onSelect).toHaveBeenCalledWith(entries[0]);
    expect(screen.queryByRole('button', { name: 'done-aria' })).toBeNull();
  });
});
