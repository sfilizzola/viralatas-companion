/**
 * Compare (and optionally apply) docs/ai-wiki/lineup.md against live wacken.com JSON.
 *
 *   npm run lineup:check-official              # diff only — no writes
 *   npm run lineup:check-official -- --lineup    # diff + confirm + write lineup.md
 *   npm run lineup:check-official -- --complete  # diff + lineup.md + bands.ts (each confirmed)
 *
 * See docs/ai-wiki/lineup-official-source.md
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  applyLineupPatches,
  computeDiff,
  fetchOfficialSlots,
  formatDiffReport,
  formatPatchPreview,
  parseLineupMarkdown,
  patchBandsTsContent,
  todayIsoDate,
  type DiffResult,
  type SlotPatch,
} from '../../src/lib/lineup-official-source';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function lineupMdPath(): string {
  return join(REPO_ROOT, 'docs/ai-wiki/lineup.md');
}

function bandsTsPath(): string {
  return join(REPO_ROOT, 'supabase/seed/bands.ts');
}

function loadLineupMarkdownFromDisk(): string {
  return readFileSync(lineupMdPath(), 'utf-8');
}

function loadBandsTs(): string {
  return readFileSync(bandsTsPath(), 'utf-8');
}

type Mode = 'check' | 'lineup' | 'complete';

function isMain(): boolean {
  const arg = process.argv[1] ?? '';
  return arg.endsWith('lineup-check-official.ts');
}

function parseMode(argv: string[]): Mode {
  if (argv.includes('--complete')) return 'complete';
  if (argv.includes('--lineup')) return 'lineup';
  return 'check';
}

async function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(`${prompt} [y/N] `);
    return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

function printWritePreview(
  fileLabel: string,
  filePath: string,
  patches: SlotPatch[],
): void {
  console.log('');
  console.log(`── ${fileLabel} (${filePath}) ──`);
  console.log(formatPatchPreview(patches));
  console.log('');
}

async function run(): Promise<number> {
  const mode = parseMode(process.argv.slice(2));
  const asOf = todayIsoDate();

  console.log(`Wacken lineup check — ${asOf}`);
  console.log(`Mode: ${mode === 'check' ? 'compare only' : mode === 'lineup' ? 'apply lineup.md' : 'apply lineup.md + bands.ts'}`);
  console.log('');

  let official: Awaited<ReturnType<typeof fetchOfficialSlots>>;
  try {
    console.log('Fetching wacken.com JSON…');
    official = await fetchOfficialSlots();
    console.log(`  events-concert.json → ${official.size} camping slots`);
  } catch (err) {
    console.error('Fetch failed:', err instanceof Error ? err.message : err);
    return 2;
  }

  const lineupContent = loadLineupMarkdownFromDisk();
  const wikiRows = parseLineupMarkdown(lineupContent);
  const diff: DiffResult = computeDiff(wikiRows, official);

  console.log('');
  console.log(formatDiffReport(diff, official.size));

  if (diff.inSync) {
    console.log('');
    if (mode === 'check') return 0;
    console.log('Nothing to write.');
    return 0;
  }

  if (mode === 'check') {
    console.log('');
    console.log('Run with --lineup to apply these changes to lineup.md');
    console.log('Run with --complete to also update supabase/seed/bands.ts');
    return 1;
  }

  printWritePreview('lineup.md changes', lineupMdPath(), diff.patches);

  const lineupOk = await confirm('Write lineup.md with the changes above?');
  if (!lineupOk) {
    console.log('Cancelled — no files written.');
    return 0;
  }

  const newLineup = applyLineupPatches(lineupContent, diff.patches, asOf);
  writeFileSync(lineupMdPath(), newLineup, 'utf-8');
  console.log(`✓ Wrote ${lineupMdPath()}`);

  if (mode === 'lineup') {
    console.log('');
    console.log('Next: npm run lineup:check-official -- --complete  (bands.ts)');
    console.log('Then:  npm run seed:bands:sync  →  --apply');
    return 0;
  }

  const bandsContent = loadBandsTs();
  const bandsPreview = patchBandsTsContent(bandsContent, diff.patches);
  const bandsChanged = bandsPreview !== bandsContent;

  if (!bandsChanged) {
    console.log('');
    console.log('bands.ts: no seed rows to update for these patches (TBD/orphan slots omitted).');
    return 0;
  }

  const bandsPatches = diff.patches.filter(
    (p) =>
      p.slotId !== 'HAR13' &&
      bandsContent.includes(`slot_id: '${p.slotId}'`),
  );

  printWritePreview('bands.ts changes', bandsTsPath(), bandsPatches);

  const bandsOk = await confirm('Write bands.ts with the changes above?');
  if (!bandsOk) {
    console.log('lineup.md was saved; bands.ts left unchanged.');
    return 0;
  }

  writeFileSync(bandsTsPath(), bandsPreview, 'utf-8');
  console.log(`✓ Wrote ${bandsTsPath()}`);
  console.log('');
  console.log('Next: npm run seed:bands:sync  →  review  →  npm run seed:bands:sync -- --apply');
  return 0;
}

if (isMain()) {
  run()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(2);
    });
}
