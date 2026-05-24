#!/usr/bin/env npx tsx
/**
 * One-shot helper: apply Phase 25 genre collapse to bands.ts + lineup.md.
 * Run from repo root: npx tsx scripts/apply-genre-collapse.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { collapseGenre } from '../src/services/genreGuide.ts';

const BANDS_PATH = 'supabase/seed/bands.ts';
const LINEUP_PATH = 'docs/ai-wiki/lineup.md';

function applyBands() {
  let src = readFileSync(BANDS_PATH, 'utf-8');
  src = src.replace(
    /const TBD_GENRE = 'Generic Metal';/,
    "const TBD_GENRE = 'Metal';",
  );
  src = src.replace(
    /- Bands with `Genre: TBD` use the fallback genre `"Generic Metal"`\./,
    '- Bands with `Genre: TBD` use the fallback genre `"Metal"`.',
  );

  src = src.replace(/genre: '([^']+)'/g, (match, genre: string) => {
    const next = collapseGenre(genre);
    if (next === genre) return match;
    return `genre: '${next}'`;
  });

  writeFileSync(BANDS_PATH, src);
  console.log('Updated', BANDS_PATH);
}

function applyLineup() {
  let src = readFileSync(LINEUP_PATH, 'utf-8');
  const lines = src.split('\n');
  const out = lines.map((line) => {
    if (!line.startsWith('|') || line.includes('Name | Genre')) return line;
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length < 6) return line;
    // | Name | Genre | Slot | Band Status | Image URL |
    const genre = parts[2];
    if (!genre || genre === 'Genre') return line;
    const next = collapseGenre(genre);
    if (next === genre) return line;
    parts[2] = next;
    return '| ' + parts.slice(1, -1).join(' | ') + ' |';
  });
  writeFileSync(LINEUP_PATH, out.join('\n'));
  console.log('Updated', LINEUP_PATH);
}

applyBands();
applyLineup();

// Verify distinct genres in bands.ts
const bandsSrc = readFileSync(BANDS_PATH, 'utf-8');
const genres = new Set<string>();
for (const m of bandsSrc.matchAll(/genre: (?:TBD_GENRE|'([^']+)')/g)) {
  genres.add(m[1] ?? 'Metal');
}
console.log('Distinct genres after collapse:', genres.size);
console.log([...genres].sort().join(', '));
