import { describe, it, expect } from 'vitest';
import {
  STAGE_COLOR_TOKENS,
  STAGE_COLORS,
  stageColor,
  stageColorVar,
} from '../services/stageColors';

// The implementation maps stage names to CSS variable references (e.g. var(--stage-faster)),
// not raw hex values. Hex values live in index.css under :root.
// Unknown stages fall back to var(--accent).

describe('STAGE_COLOR_TOKENS', () => {
  it.each([
    ['Faster', '--stage-faster'],
    ['Harder', '--stage-harder'],
    ['Louder', '--stage-louder'],
    ['W.E.T.', '--stage-wet'],
    ['Headbangers', '--stage-headbangers'],
    ['Wasteland', '--stage-wasteland'],
    ['Wackinger', '--stage-wackinger'],
    ['Welcome to the Jungle', '--stage-jungle'],
  ])('%s → %s token', (stage, token) => {
    expect(STAGE_COLOR_TOKENS[stage]).toBe(token);
  });

  it('returns undefined for an unknown stage', () => {
    expect(STAGE_COLOR_TOKENS['Unknown Stage']).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(STAGE_COLOR_TOKENS['']).toBeUndefined();
  });
});

describe('STAGE_COLORS', () => {
  it.each([
    ['Faster', 'var(--stage-faster)'],
    ['Harder', 'var(--stage-harder)'],
    ['Louder', 'var(--stage-louder)'],
    ['W.E.T.', 'var(--stage-wet)'],
    ['Headbangers', 'var(--stage-headbangers)'],
    ['Wasteland', 'var(--stage-wasteland)'],
    ['Wackinger', 'var(--stage-wackinger)'],
    ['Welcome to the Jungle', 'var(--stage-jungle)'],
  ])('%s → %s', (stage, cssVar) => {
    expect(STAGE_COLORS[stage]).toBe(cssVar);
  });
});

describe('stageColor()', () => {
  it.each([
    ['Faster', 'var(--stage-faster)'],
    ['Harder', 'var(--stage-harder)'],
    ['Louder', 'var(--stage-louder)'],
    ['W.E.T.', 'var(--stage-wet)'],
    ['Headbangers', 'var(--stage-headbangers)'],
    ['Wasteland', 'var(--stage-wasteland)'],
    ['Wackinger', 'var(--stage-wackinger)'],
    ['Welcome to the Jungle', 'var(--stage-jungle)'],
  ])('%s → %s', (stage, expected) => {
    expect(stageColor(stage)).toBe(expected);
  });

  it('falls back to var(--accent) for unknown stage', () => {
    expect(stageColor('Unknown Stage')).toBe('var(--accent)');
  });

  it('falls back to var(--accent) for empty string (no crash)', () => {
    expect(stageColor('')).toBe('var(--accent)');
  });
});

describe('stageColorVar()', () => {
  it('returns the same result as stageColor() for all 8 stages', () => {
    const stages = [
      'Faster',
      'Harder',
      'Louder',
      'W.E.T.',
      'Headbangers',
      'Wasteland',
      'Wackinger',
      'Welcome to the Jungle',
    ];
    for (const stage of stages) {
      expect(stageColorVar(stage)).toBe(stageColor(stage));
    }
  });

  it('falls back to var(--accent) for unknown stage', () => {
    expect(stageColorVar('Nonexistent')).toBe('var(--accent)');
  });
});
