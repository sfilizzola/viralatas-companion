/**
 * Wacken official running-order fetch, normalize, and diff helpers.
 * See docs/ai-wiki/lineup-official-source.md
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EVENTS_URL =
  'https://www.wacken.com/fileadmin/Json/events-concert.json';
export const STAGES_URL = 'https://www.wacken.com/fileadmin/Json/stages.json';

export const WACKEN_2026_DAY_UIDS = new Set([34, 35, 36, 37]);
export const LGH_CLUBSTAGE_UID = 21;

export const STAGE_UID_TO_ABBREV: Record<number, string> = {
  4: 'FAS',
  5: 'HAR',
  6: 'LOU',
  7: 'HBA',
  8: 'WET',
  10: 'WAK',
  11: 'WAS',
};

/** Slots kept as wiki/seed policy — never auto-patched from official feed. */
export const OVERRIDE_SLOT_IDS = new Set(['HAR13']);

/** Wiki-only until Wacken publishes Jungle in the feed. */
export function isJungleSlot(slotId: string): boolean {
  return slotId.startsWith('JUN');
}

export type BandStatus = 'CONFIRMED' | 'TDB MTB' | 'TBD' | 'CEREMONY';

export type OfficialSlot = {
  slotId: string;
  name: string;
  status: BandStatus;
  imageUrl: string;
  mbRegion: string;
  start: number;
  end: number;
};

export type WikiSlot = {
  slotId: string;
  name: string;
  genre: string;
  status: BandStatus;
  image: string;
};

export type SlotPatch = {
  slotId: string;
  changes: Array<{
    field: 'name' | 'status' | 'image';
    before: string;
    after: string;
  }>;
  target: WikiSlot;
};

export type DiffResult = {
  patches: SlotPatch[];
  skippedOverrides: Array<{ slotId: string; note: string }>;
  skippedJungle: string[];
  inSync: boolean;
};

type WackenEvent = {
  start: number;
  end: number;
  title: string;
  subtitle: string;
  festivalday: { uid: number; title: string };
  stage: { uid: number };
  artists?: Array<{
    assets?: Array<{
      artist?: { title?: string };
      thumbnail?: string;
    }>;
  }>;
};

type WackenStage = { uid: number; title: string };

export function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../..');
}

export function lineupMdPath(): string {
  return join(repoRoot(), 'docs/ai-wiki/lineup.md');
}

export function bandsTsPath(): string {
  return join(repoRoot(), 'supabase/seed/bands.ts');
}

export function normName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compactName(value: string): string {
  return normName(value).replace(/\s+/g, '');
}

function imageSlug(url: string): string {
  if (!url || url === 'PLACEHOLDER' || url === '—') return '';
  const m =
    url.match(/csm_([^_./]+)/i) ??
    url.match(/\/([^/]+)\.(jpg|png|webp)/i);
  return m ? m[1].toLowerCase().replace(/[^a-z0-9]/g, '') : url.toLowerCase();
}

/** Same band asset — wacken thumbnail paths often differ from poster URLs in lineup.md. */
export function imagesEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  if (!a || !b || a === 'PLACEHOLDER' || b === 'PLACEHOLDER') return a === b;
  const as = imageSlug(a);
  const bs = imageSlug(b);
  if (!as || !bs) return false;
  if (as === bs) return true;
  if (as.length >= 6 && bs.length >= 6) {
    if (as.includes(bs.slice(0, 6)) || bs.includes(as.slice(0, 6))) return true;
  }
  return false;
}

export function namesEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  if (compactName(a) === compactName(b)) return true;
  const an = normName(a);
  const bn = normName(b);
  if (an === bn) return true;
  if (
    (a === 'TDB MTB' && b === 'TDB MTB') ||
    (a === 'TBD' && b === 'TBD')
  ) {
    return true;
  }
  return false;
}

function absoluteWackenUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  return `https://www.wacken.com${pathOrUrl}`;
}

export function classifyOfficialEvent(event: WackenEvent): Pick<
  OfficialSlot,
  'name' | 'status' | 'imageUrl' | 'mbRegion'
> {
  const artist = event.artists?.[0]?.assets?.[0]?.artist?.title?.trim() ?? '';
  const thumb = event.artists?.[0]?.assets?.[0]?.thumbnail ?? '';
  const title = event.title?.trim() ?? '';
  const mbRegion = /^MB /i.test(title) || title === 'Award Ceremony' ? title : '';

  if (/metal battle tba/i.test(artist) || title === 'Award Ceremony') {
    return {
      name: 'TDB MTB',
      status: 'TDB MTB',
      imageUrl: '',
      mbRegion,
    };
  }

  if (artist) {
    return {
      name: artist,
      status: 'CONFIRMED',
      imageUrl: absoluteWackenUrl(thumb),
      mbRegion,
    };
  }

  return {
    name: 'TBD',
    status: 'TBD',
    imageUrl: '',
    mbRegion,
  };
}

export function buildOfficialSlots(
  events: WackenEvent[],
  _stages: WackenStage[],
): Map<string, OfficialSlot> {
  const counters: Record<string, number> = {};

  const filtered = events
    .filter(
      (e) =>
        WACKEN_2026_DAY_UIDS.has(e.festivalday?.uid) &&
        e.stage?.uid !== LGH_CLUBSTAGE_UID &&
        STAGE_UID_TO_ABBREV[e.stage?.uid],
    )
    .sort((a, b) => a.start - b.start);

  const result = new Map<string, OfficialSlot>();

  for (const event of filtered) {
    const abbrev = STAGE_UID_TO_ABBREV[event.stage.uid];
    counters[abbrev] = (counters[abbrev] ?? 0) + 1;
    const slotId = `${abbrev}${counters[abbrev]}`;
    const classified = classifyOfficialEvent(event);
    result.set(slotId, {
      slotId,
      ...classified,
      start: event.start,
      end: event.end,
    });
  }

  return result;
}

export async function fetchOfficialSlots(): Promise<Map<string, OfficialSlot>> {
  const [eventsRes, stagesRes] = await Promise.all([
    fetch(EVENTS_URL),
    fetch(STAGES_URL),
  ]);

  if (!eventsRes.ok) {
    throw new Error(`Failed to fetch events: ${eventsRes.status} ${eventsRes.statusText}`);
  }
  if (!stagesRes.ok) {
    throw new Error(`Failed to fetch stages: ${stagesRes.status} ${stagesRes.statusText}`);
  }

  const events = (await eventsRes.json()) as WackenEvent[];
  const stages = (await stagesRes.json()) as WackenStage[];
  return buildOfficialSlots(events, stages);
}

const LINEUP_ROW_RE =
  /^\| ([^|]+) \| ([^|]+) \| ([A-Z]{3}\d+) \| ([^|]+) \| ([^|]+) \|$/;

export function parseLineupMarkdown(content: string): WikiSlot[] {
  const rows: WikiSlot[] = [];
  for (const line of content.split('\n')) {
    const m = line.match(LINEUP_ROW_RE);
    if (!m) continue;
    rows.push({
      name: m[1].trim(),
      genre: m[2].trim(),
      slotId: m[3].trim(),
      status: m[4].trim() as BandStatus,
      image: m[5].trim(),
    });
  }
  return rows;
}

export function wikiImageForStatus(
  status: BandStatus,
  imageUrl: string,
): string {
  if (status === 'CEREMONY') return '—';
  if (status === 'CONFIRMED') return imageUrl;
  return 'PLACEHOLDER';
}

export function targetWikiSlot(
  wiki: WikiSlot,
  official: OfficialSlot | undefined,
): WikiSlot | null {
  if (OVERRIDE_SLOT_IDS.has(wiki.slotId)) return null;
  if (isJungleSlot(wiki.slotId)) return null;
  if (!official) return null;

  return {
    slotId: wiki.slotId,
    name: official.name,
    genre: wiki.genre,
    status: official.status,
    image: wikiImageForStatus(official.status, official.imageUrl),
  };
}

export function computeDiff(
  wikiRows: WikiSlot[],
  official: Map<string, OfficialSlot>,
): DiffResult {
  const patches: SlotPatch[] = [];
  const skippedOverrides: DiffResult['skippedOverrides'] = [];
  const skippedJungle: string[] = [];

  const wikiBySlot = new Map(wikiRows.map((r) => [r.slotId, r]));

  for (const wiki of wikiRows) {
    if (OVERRIDE_SLOT_IDS.has(wiki.slotId)) {
      const off = official.get(wiki.slotId);
      if (off && (off.status !== wiki.status || !namesEquivalent(off.name, wiki.name))) {
        skippedOverrides.push({
          slotId: wiki.slotId,
          note: `wiki keeps ${wiki.status} "${wiki.name}" (official: ${off.status} "${off.name}")`,
        });
      }
      continue;
    }

    if (isJungleSlot(wiki.slotId)) {
      skippedJungle.push(wiki.slotId);
      continue;
    }

    const off = official.get(wiki.slotId);
    if (!off) continue;

    const target = targetWikiSlot(wiki, off);
    if (!target) continue;

    const changes: SlotPatch['changes'] = [];

    if (!namesEquivalent(wiki.name, target.name)) {
      changes.push({ field: 'name', before: wiki.name, after: target.name });
    }
    if (wiki.status !== target.status) {
      changes.push({ field: 'status', before: wiki.status, after: target.status });
    }
    // Only push image when newly confirmed or identity changed — avoid thumbnail vs poster noise.
    const identityChanging =
      !namesEquivalent(wiki.name, target.name) || wiki.status !== target.status;
    const needsImageUpdate =
      target.status === 'CONFIRMED' &&
      !imagesEquivalent(wiki.image, target.image) &&
      (wiki.image === 'PLACEHOLDER' || identityChanging);
    if (needsImageUpdate) {
      changes.push({ field: 'image', before: wiki.image, after: target.image });
    }

    if (changes.length > 0) {
      patches.push({ slotId: wiki.slotId, changes, target });
    }
  }

  return {
    patches,
    skippedOverrides,
    skippedJungle,
    inSync: patches.length === 0,
  };
}

export function countStatuses(rows: WikiSlot[]): Record<BandStatus, number> {
  const counts: Record<BandStatus, number> = {
    CONFIRMED: 0,
    'TDB MTB': 0,
    TBD: 0,
    CEREMONY: 0,
  };
  for (const row of rows) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}

export function formatSummaryLine(rows: WikiSlot[]): string {
  const c = countStatuses(rows);
  return `**Summary:** ${c.CONFIRMED} bands CONFIRMED · ${c['TDB MTB']} \`TDB MTB\` Metal Battle placeholders · 0 named TDB · ${c.TBD} TBD (Name=TBD) · ${rows.length} total · ${c.CEREMONY} ceremony (Farewell & Announcements, HAR13)`;
}

export function applyLineupPatches(
  content: string,
  patches: SlotPatch[],
  asOfDate: string,
): string {
  let next = content;

  for (const patch of patches) {
    const rowRe = new RegExp(
      `^\\| [^|]+ \\| [^|]+ \\| ${patch.slotId} \\| [^|]+ \\| [^|]+ \\|$`,
      'm',
    );
    const replacement = `| ${patch.target.name} | ${patch.target.genre} | ${patch.slotId} | ${patch.target.status} | ${patch.target.image} |`;
    if (!rowRe.test(next)) {
      throw new Error(`lineup.md: row not found for ${patch.slotId}`);
    }
    next = next.replace(rowRe, replacement);
  }

  if (patches.length > 0) {
    const updatedRows = parseLineupMarkdown(next);
    next = next.replace(/\*\*Summary:\*\*[^\n]+/, formatSummaryLine(updatedRows));
    next = next.replace(/as of \d{4}-\d{2}-\d{2}/g, `as of ${asOfDate}`);
  }

  return next;
}

export function toBandsNameExpr(name: string): string {
  if (name === 'TDB MTB') return 'MTB';
  if (name.includes("'")) return JSON.stringify(name);
  return `'${name}'`;
}

export function toBandsImageExpr(status: BandStatus, imageUrl: string): string {
  if (status !== 'CONFIRMED' || !imageUrl) return 'PLACEHOLDER';
  const path = imageUrl.replace('https://www.wacken.com', '');
  return `\`\${WOA}${path}\``;
}

export function patchBandsTsContent(
  content: string,
  patches: SlotPatch[],
): string {
  let next = content;

  for (const patch of patches) {
    if (OVERRIDE_SLOT_IDS.has(patch.slotId)) continue;
    if (isJungleSlot(patch.slotId)) continue;

    const slotMarker = `slot_id: '${patch.slotId}'`;
    const lineIndex = next.split('\n').findIndex((line) => line.includes(slotMarker));
    if (lineIndex === -1) {
      // Dropped TBD slots (LOU21, WET30, …) are not in bands.ts
      continue;
    }

    const lines = next.split('\n');
    let line = lines[lineIndex];
    if (!line.includes('name:')) {
      throw new Error(`bands.ts: expected single-line entry for ${patch.slotId}`);
    }

    line = line.replace(
      /name: (?:MTB|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/,
      `name: ${toBandsNameExpr(patch.target.name)}`,
    );
    line = line.replace(
      /image_url: (?:PLACEHOLDER|`[^`]*`|'[^']*')/,
      `image_url: ${toBandsImageExpr(patch.target.status, patch.target.image === 'PLACEHOLDER' ? '' : patch.target.image)}`,
    );
    lines[lineIndex] = line;
    next = lines.join('\n');
  }

  return next;
}

export function formatPatchPreview(patches: SlotPatch[]): string {
  if (patches.length === 0) return '  (no changes)';
  return patches
    .map((p) => {
      const detail = p.changes
        .map((c) => `${c.field}: ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}`)
        .join(', ');
      return `  ${p.slotId}: ${detail}`;
    })
    .join('\n');
}

export function formatDiffReport(
  diff: DiffResult,
  officialCount: number,
): string {
  const lines: string[] = [
    `Official camping slots fetched: ${officialCount} (excl. LGH Clubstage)`,
    '',
  ];

  if (diff.inSync) {
    lines.push('✓ lineup.md matches wacken.com for all comparable slots.');
  } else {
    lines.push(`Changes needed (${diff.patches.length} slots):`);
    lines.push(formatPatchPreview(diff.patches));
  }

  if (diff.skippedOverrides.length > 0) {
    lines.push('', 'Policy overrides (left unchanged):');
    for (const o of diff.skippedOverrides) {
      lines.push(`  ${o.slotId}: ${o.note}`);
    }
  }

  if (diff.skippedJungle.length > 0) {
    lines.push(
      '',
      `Jungle placeholders not compared: ${diff.skippedJungle.join(', ')}`,
    );
  }

  return lines.join('\n');
}

export function loadLineupMarkdown(): string {
  return readFileSync(lineupMdPath(), 'utf-8');
}

export function loadBandsTs(): string {
  return readFileSync(bandsTsPath(), 'utf-8');
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
