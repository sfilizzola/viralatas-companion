/**
 * Canonical genre labels after Phase 25 collapse.
 * Single source for filter guide UI and collapse mapping — works offline.
 */

export const CANONICAL_GENRES = [
  'Black Metal',
  'Death Metal',
  'Doom Metal',
  'Folk Metal',
  'Hard Rock',
  'Heavy Metal',
  'Metal',
  'Metal Battle',
  'Metalcore',
  'Party Metal',
  'Power Metal',
  'Punk',
  'Thrash Metal',
] as const;

export type CanonicalGenre = (typeof CANONICAL_GENRES)[number];

/** Old genre string → canonical label. Metal Battle * handled by prefix rule. */
export const GENRE_COLLAPSE_MAP: Record<string, CanonicalGenre> = {
  // Heavy Metal
  'Heavy Metal': 'Heavy Metal',
  'Traditional Heavy Metal': 'Heavy Metal',
  'Speed Metal': 'Heavy Metal',
  'Neoclassical Metal': 'Heavy Metal',

  // Black Metal
  'Black Metal': 'Black Metal',
  'Black / Doom Metal': 'Black Metal',
  'Black Metal (Bathory tribute)': 'Black Metal',
  'Black Metal / Grindcore': 'Black Metal',
  'Blackgaze': 'Black Metal',
  'Post-Black Metal': 'Black Metal',
  'Viking Metal': 'Black Metal',

  // Death Metal
  'Death Metal': 'Death Metal',
  'Death Metal / Grindcore': 'Death Metal',
  'Melodic Death Metal': 'Death Metal',
  'Goregrind': 'Death Metal',
  'Grindcore': 'Death Metal',
  'Deathcore': 'Death Metal',

  // Thrash Metal
  'Thrash Metal': 'Thrash Metal',
  'Crossover Thrash': 'Thrash Metal',
  'Crossover Metal': 'Thrash Metal',

  // Power Metal
  'Power Metal': 'Power Metal',
  'Symphonic Metal': 'Power Metal',

  // Folk Metal
  'Folk Metal': 'Folk Metal',
  'Folk / Brass Metal': 'Folk Metal',
  Folk: 'Folk Metal',
  'Pirate Metal': 'Folk Metal',
  'Ska / Reggae Metal': 'Folk Metal',
  Humppa: 'Folk Metal',

  // Doom Metal
  'Doom Metal': 'Doom Metal',
  'Gothic Metal': 'Doom Metal',
  'Gothic / Industrial Metal': 'Doom Metal',
  'Sludge Metal': 'Doom Metal',
  'Post-Metal': 'Doom Metal',
  'Stoner Rock': 'Doom Metal',
  'Occult Rock': 'Doom Metal',

  // Metalcore
  Metalcore: 'Metalcore',
  'Melodic Hardcore': 'Metalcore',

  // Hard Rock
  'Hard Rock': 'Hard Rock',
  AOR: 'Hard Rock',
  'AOR / Hard Rock': 'Hard Rock',
  Rock: 'Hard Rock',
  'Medieval Rock': 'Hard Rock',
  'Alternative Rock': 'Hard Rock',

  // Punk
  Punk: 'Punk',
  'Punk Rock': 'Punk',
  'Punk Metal': 'Punk',
  'Horror Punk': 'Punk',
  'Folk Punk': 'Punk',

  // Party Metal — locked (Alestorm + Airbourne only)
  'Party Metal': 'Party Metal',

  // Metal catch-all
  Metal: 'Metal',
  'Generic Metal': 'Metal',
  TBD: 'Metal',
  'Alternative Metal': 'Metal',
  'Industrial Metal': 'Metal',
  'Industrial / Gothic': 'Metal',
  'Groove Metal': 'Metal',
  'Nu Metal': 'Metal',
  'Rap Metal': 'Metal',
  'Progressive Metal': 'Metal',
  'Visual Kei Metal': 'Metal',
  'Dark Electronic': 'Metal',
  'Orchestral / Film Music': 'Metal',
  "Children's Metal": 'Metal',
};

export function collapseGenre(genre: string): CanonicalGenre {
  if (genre.startsWith('Metal Battle')) return 'Metal Battle';
  const mapped = GENRE_COLLAPSE_MAP[genre];
  if (mapped) return mapped;
  return 'Metal';
}

export type GenreGuideFootnoteKey =
  | 'genreGuidePartyMetalNote'
  | 'genreGuideMetalBattleNote'
  | 'genreGuideMetalNote';

export type GenreGuideEntry = {
  canonical: CanonicalGenre;
  /** Absorbed subgenre proper nouns — not translated in i18n */
  includes: string[];
  footnoteKey?: GenreGuideFootnoteKey;
};

/** Flat guide rows — alphabetical by canonical label; Metal Battle pinned last in filter UI only */
export const GENRE_GUIDE: GenreGuideEntry[] = [
  {
    canonical: 'Black Metal',
    includes: [
      'Black / Doom Metal',
      'Black Metal / Grindcore',
      'Blackgaze',
      'Post-Black Metal',
      'Viking Metal',
    ],
  },
  {
    canonical: 'Death Metal',
    includes: ['Death Metal / Grindcore', 'Melodic Death Metal', 'Goregrind', 'Grindcore', 'Deathcore'],
  },
  {
    canonical: 'Doom Metal',
    includes: [
      'Gothic Metal',
      'Gothic / Industrial Metal',
      'Sludge Metal',
      'Post-Metal',
      'Stoner Rock',
      'Occult Rock',
    ],
  },
  {
    canonical: 'Folk Metal',
    includes: ['Folk / Brass Metal', 'Folk', 'Pirate Metal', 'Ska / Reggae Metal', 'Humppa'],
  },
  {
    canonical: 'Hard Rock',
    includes: ['AOR', 'AOR / Hard Rock', 'Rock', 'Medieval Rock', 'Alternative Rock'],
  },
  {
    canonical: 'Heavy Metal',
    includes: ['Traditional Heavy Metal', 'Speed Metal', 'Neoclassical Metal'],
  },
  {
    canonical: 'Metal',
    includes: [
      'Alternative Metal',
      'Groove Metal',
      'Industrial Metal',
      'Nu Metal',
      'Progressive Metal',
      'Rap Metal',
      'Visual Kei Metal',
    ],
    footnoteKey: 'genreGuideMetalNote',
  },
  {
    canonical: 'Metal Battle',
    includes: [],
    footnoteKey: 'genreGuideMetalBattleNote',
  },
  {
    canonical: 'Metalcore',
    includes: ['Melodic Hardcore'],
  },
  {
    canonical: 'Party Metal',
    includes: [],
    footnoteKey: 'genreGuidePartyMetalNote',
  },
  {
    canonical: 'Power Metal',
    includes: ['Symphonic Metal'],
  },
  {
    canonical: 'Punk',
    includes: ['Punk Rock', 'Punk Metal', 'Horror Punk', 'Folk Punk'],
  },
  {
    canonical: 'Thrash Metal',
    includes: ['Crossover Thrash', 'Crossover Metal'],
  },
];

/** Sort genres for filter pills: alpha, Metal Battle last */
export function sortFilterGenres(genres: string[]): string[] {
  const sorted = [...genres].sort((a, b) => a.localeCompare(b));
  const battleIdx = sorted.indexOf('Metal Battle');
  if (battleIdx !== -1) {
    sorted.splice(battleIdx, 1);
    sorted.push('Metal Battle');
  }
  return sorted;
}
