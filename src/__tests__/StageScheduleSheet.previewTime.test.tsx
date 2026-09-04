import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StageScheduleSheet from '../components/StageScheduleSheet';
import type { Band } from '../types';
import type { Festival } from '../types/festival';

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string>) => {
      if (key === 'sheetSubtitlePreview' && vars?.time) return `⏱ Preview · ${vars.time}`;
      const map: Record<string, string> = {
        sheetTitle: 'All Stages',
        sheetSubtitle: 'Now & up next',
        close: 'Close',
        live: 'LIVE',
        next: 'Next ·',
        tileAriaLive: 'live',
        tileAriaNext: 'next',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('../services/stageSchedule', () => ({
  buildStageScheduleSnapshot: () => [],
}));

vi.mock('../services/stageColors', () => ({
  stageColor: () => '#888',
}));

const BANDS: Band[] = [];
const NOW = new Date('2026-07-30T20:00:00+02:00');
const FESTIVAL = { features: { running_order: true } } as Festival;

describe('StageScheduleSheet previewTime prop', () => {
  it('live mode — no previewTime: subtitle shows "Now & up next", no headerPreview class', () => {
    const { container } = render(
      <StageScheduleSheet
        bands={BANDS}
        now={NOW}
        festival={FESTIVAL}
        onClose={vi.fn()}
        onBandSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('Now & up next')).toBeInTheDocument();
    const header = container.querySelector('[class*="header"]');
    expect(header?.className).not.toMatch(/headerPreview/);
  });

  it('preview mode — previewTime set: subtitle shows ⏱ label, headerPreview class applied', () => {
    const previewTime = new Date('2026-07-30T21:30:00+02:00');
    const { container } = render(
      <StageScheduleSheet
        bands={BANDS}
        now={NOW}
        festival={FESTIVAL}
        previewTime={previewTime}
        onClose={vi.fn()}
        onBandSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/⏱ Preview · 21:30/)).toBeInTheDocument();
    const header = container.querySelector('[class*="headerPreview"]');
    expect(header).not.toBeNull();
  });
});
