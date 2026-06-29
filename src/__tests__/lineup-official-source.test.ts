import { describe, expect, it } from 'vitest';

import {
  buildOfficialSlots,
  classifyOfficialEvent,
  computeDiff,
  namesEquivalent,
  parseLineupMarkdown,
  applyLineupPatches,
} from '../../supabase/seed/lineup-official-source';

const sampleEvents = [
  {
    start: 100,
    end: 200,
    title: 'MB Hungary',
    subtitle: '',
    festivalday: { uid: 34, title: 'Wednesday' },
    stage: { uid: 8 },
    artists: [
      {
        assets: [{ artist: { title: 'Metal Battle tba.' }, thumbnail: '' }],
      },
    ],
  },
  {
    start: 300,
    end: 400,
    title: '',
    subtitle: '',
    festivalday: { uid: 34, title: 'Wednesday' },
    stage: { uid: 8 },
    artists: [
      {
        assets: [
          {
            artist: { title: 'Speak in Whispers' },
            thumbnail: '/fileadmin/_processed_/9/9/csm_speak_in_whispers_26.jpg',
          },
        ],
      },
    ],
  },
] as Parameters<typeof buildOfficialSlots>[0];

const sampleStages = [
  { uid: 8, title: 'W:E:T Stage' },
  { uid: 21, title: 'LGH Clubstage' },
];

describe('lineup-official-source', () => {
  it('classifies Metal Battle tba as TDB MTB', () => {
    const result = classifyOfficialEvent(sampleEvents[0]);
    expect(result.status).toBe('TDB MTB');
    expect(result.name).toBe('TDB MTB');
  });

  it('classifies named artist as CONFIRMED with absolute image URL', () => {
    const result = classifyOfficialEvent(sampleEvents[1]);
    expect(result.status).toBe('CONFIRMED');
    expect(result.name).toBe('Speak in Whispers');
    expect(result.imageUrl).toContain('https://www.wacken.com/fileadmin/');
  });

  it('builds global slot ids WET1 WET2', () => {
    const slots = buildOfficialSlots(sampleEvents, sampleStages);
    expect(slots.get('WET1')?.status).toBe('TDB MTB');
    expect(slots.get('WET2')?.name).toBe('Speak in Whispers');
  });

  it('treats BornBroken and Born Broken as equivalent', () => {
    expect(namesEquivalent('BornBroken', 'Born Broken')).toBe(true);
  });

  it('computes patch when wiki lags official confirmation', () => {
    const official = buildOfficialSlots(sampleEvents, sampleStages);
    const wiki = parseLineupMarkdown(
      '| Speak in Whispers | Metal Battle | WET2 | TDB | PLACEHOLDER |',
    );
    const diff = computeDiff(wiki, official);
    expect(diff.inSync).toBe(false);
    expect(diff.patches[0]?.slotId).toBe('WET2');
    expect(diff.patches[0]?.target.status).toBe('CONFIRMED');
  });

  it('skips HAR13 override', () => {
    const wiki = parseLineupMarkdown(
      '| Farewell & Announcements | Metal | HAR13 | CEREMONY | — |',
    );
    const official = new Map([
      [
        'HAR13',
        {
          slotId: 'HAR13',
          name: 'TBD',
          status: 'TBD' as const,
          imageUrl: '',
          mbRegion: '',
          start: 0,
          end: 0,
        },
      ],
    ]);
    const diff = computeDiff(wiki, official);
    expect(diff.patches).toHaveLength(0);
    expect(diff.skippedOverrides.length).toBe(1);
  });

  it('applyLineupPatches updates row and summary', () => {
    const wikiText = `**Summary:** 0 bands CONFIRMED · 1 \`TDB MTB\` Metal Battle placeholders · 0 named TDB · 0 TBD (Name=TBD) · 1 total · 0 ceremony (Farewell & Announcements, HAR13)

| Speak in Whispers | Metal Battle | WET2 | TDB | PLACEHOLDER |`;

    const official = buildOfficialSlots(sampleEvents, sampleStages);
    const wiki = parseLineupMarkdown(wikiText);
    const diff = computeDiff(wiki, official);
    const next = applyLineupPatches(wikiText, diff.patches, '2026-06-29');

    expect(next).toContain('CONFIRMED');
    expect(next).toContain('csm_speak_in_whispers_26.jpg');
    expect(next).toContain('1 bands CONFIRMED');
  });
});
