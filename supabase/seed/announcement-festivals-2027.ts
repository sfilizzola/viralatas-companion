/**
 * Initial catalog + Announcement Lineup seed for supported 2027 festivals.
 *
 * Usage:
 *   npm run seed:announcement-festivals-2027 -- --festival wacken-2027
 *   npm run seed:announcement-festivals-2027 -- --festival wacken-2027 --apply
 *
 * Dry-run is the default and needs no credentials. Apply creates the Festival
 * when absent, then inserts untimed Bands only when that Festival has zero
 * bands. It never deletes or updates existing Bands, so picks cannot be wiped.
 *
 * Requires Phase 49 migration 20260904000000_announcement_lineup.sql.
 * Requires .env.local for --apply:
 *   VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import {
  bumpCacheVersion,
  createServiceClient,
  isSelfInvoked,
} from './seed-shared';

export type AnnouncementFestivalSeed = {
  slug: string;
  name: string;
  timezone: string;
  starts_at: string;
  ends_at: string;
  features: { running_order: false };
  location: string;
  officialSources: string[];
  expectedBandCount: number;
  bands: string[];
};

export const announcementFestivals2027: AnnouncementFestivalSeed[] = [
  {
    slug: 'wacken-2027',
    name: 'Wacken Open Air 2027',
    timezone: 'Europe/Berlin',
    starts_at: '2027-07-28T00:00:00+02:00',
    ends_at: '2027-08-01T03:00:00+02:00',
    features: { running_order: false },
    location: 'Wacken, Schleswig-Holstein, Germany',
    officialSources: [
      'https://www.wacken.com/en/line-ups/bands/',
      'https://www.wacken.com/fileadmin/Json/bandlist-concert.json',
    ],
    expectedBandCount: 50,
    bands: [
      'Avatar',
      'Beast In Black',
      'Belphegor',
      'Between Two Worlds',
      'Blue Medusa',
      'Carnifex',
      'Cavalera Conspiracy',
      'Children Of Bodom',
      'Creeper',
      'Crypta',
      'Dark Tranquility',
      'Dethklok',
      'DragonForce',
      'Edguy',
      'Electric Callboy',
      'Feuerschwanz',
      'Five Finger Death Punch',
      'Gaerea',
      'Halestorm',
      'Hammerfall',
      'Heaven Shall Burn',
      'Heavens Gate',
      'Helloween',
      'Hiraes',
      'Imminence',
      'Jinjer',
      'John 5 And The Creatures',
      'John Bush',
      'Kanonenfieber',
      'Knocked Loose',
      'Make Them Suffer',
      'Malevolence',
      'Metal Church',
      'Mittel Alta',
      'Napalm Death',
      'Norther',
      'Overkill',
      'Primordial',
      'Seven Blood',
      'Shadow Of Intent',
      'Sylosis',
      'Tailgunner',
      'The Browning',
      'The Narrator',
      'The New Roses',
      'Towards The Sinister',
      'Tyketto',
      'U.D.O.',
      'Victorius',
      'Witch Club Satan',
    ],
  },
  {
    slug: 'rockharz-2027',
    name: 'ROCKHARZ 2027',
    timezone: 'Europe/Berlin',
    starts_at: '2027-07-07T00:00:00+02:00',
    ends_at: '2027-07-11T03:00:00+02:00',
    features: { running_order: false },
    location: 'Flugplatz Ballenstedt, Saxony-Anhalt, Germany',
    officialSources: [
      'https://www.rockharz-festival.com/bands',
      'https://www.rockharz-festival.com/erste-bandwelle-fuer-das-rockharz-2027',
    ],
    expectedBandCount: 29,
    bands: [
      'Accept',
      'Alestorm',
      'All For Metal',
      'Arch Enemy',
      'Bruce Dickinson',
      'Coppelius',
      'Dartagnan',
      'Dust Bolt',
      'Eisbrecher',
      'Emil Bulls',
      'Equilibrium',
      'Grave Digger',
      'Gutalax',
      'GWAR',
      'H-Blockx',
      'Handgemeng',
      'Igels vs. Shark',
      'Katerfahrt',
      'Korpiklaani',
      'Lord Of The Lost',
      'Marduk',
      'Metal Church',
      'Nestor',
      'Setyoursails',
      'Skald',
      'Tankard',
      'The Sisters of Mercy',
      'Stormseeker',
      'Turbobier',
    ],
  },
  {
    slug: 'bangers-open-air-2027',
    name: 'Bangers Open Air 2027',
    timezone: 'America/Sao_Paulo',
    starts_at: '2027-04-24T00:00:00-03:00',
    ends_at: '2027-04-26T00:00:00-03:00',
    features: { running_order: false },
    location: 'Memorial da América Latina, São Paulo, Brazil',
    officialSources: [
      'https://bangersopenair.com/lineup/',
      'https://bangersopenair.com/informacoes/',
    ],
    expectedBandCount: 11,
    bands: [
      'Lacuna Coil',
      'Quiet Riot',
      'Floor Jansen',
      'Soen',
      "KK's Priest",
      'W.E.T.',
      'Eluveitie',
      'Kanonenfieber',
      'Soilwork',
      'Metal Church',
      'Blaze Bayley',
    ],
  },
  {
    slug: 'epic-fest-2027',
    name: 'Epic Fest 2027',
    timezone: 'Europe/Copenhagen',
    starts_at: '2027-04-09T00:00:00+02:00',
    ends_at: '2027-04-11T00:00:00+02:00',
    features: { running_order: false },
    location: 'Roskilde, Denmark',
    officialSources: [
      'https://www.roskildekongrescenter.dk/arrangementer/epic-fest',
      'https://gimle.dk/event/epic-fest-2027-chapter-5/',
    ],
    expectedBandCount: 22,
    bands: [
      'HammerFall',
      'Korpiklaani',
      'Warkings',
      'Edu Falaschi',
      'Elvenking',
      'Nanowar of Steel',
      'Freedom Call',
      'Heavysaurus',
      'Temperance',
      'Labyrinth',
      'Hagane',
      "Sascha Paeth's Masters of Ceremony",
      'Dreamtale',
      'Hulkoff',
      'Jupiter',
      'Sellsword',
      'Tower Hill',
      'Owlbear',
      'Power Paladin',
      'Heimdall',
      'Skeletoon',
      'The 7th Guild',
    ],
  },
];

function normalizedName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/g, '');
}

export function validateAnnouncementFestivalSeeds(
  festivals = announcementFestivals2027,
): string[] {
  const errors: string[] = [];
  const slugs = new Set<string>();

  for (const festival of festivals) {
    if (slugs.has(festival.slug)) errors.push(`duplicate Festival slug: ${festival.slug}`);
    slugs.add(festival.slug);
    if (festival.features.running_order !== false) {
      errors.push(`${festival.slug}: running_order must be false`);
    }
    if (festival.bands.length !== festival.expectedBandCount) {
      errors.push(
        `${festival.slug}: expected ${festival.expectedBandCount} Bands, got ${festival.bands.length}`,
      );
    }
    if (Number.isNaN(Date.parse(festival.starts_at))) {
      errors.push(`${festival.slug}: invalid starts_at`);
    }
    if (Number.isNaN(Date.parse(festival.ends_at))) {
      errors.push(`${festival.slug}: invalid ends_at`);
    }
    if (Date.parse(festival.starts_at) >= Date.parse(festival.ends_at)) {
      errors.push(`${festival.slug}: starts_at must precede ends_at`);
    }

    const names = new Set<string>();
    for (const name of festival.bands) {
      const normalized = normalizedName(name);
      if (!normalized) errors.push(`${festival.slug}: empty Band name`);
      if (names.has(normalized)) {
        errors.push(`${festival.slug}: duplicate normalized Band name: ${name}`);
      }
      names.add(normalized);
    }
  }

  return errors;
}

export function buildAnnouncementBandRows(festivalId: string, bands: string[]) {
  return bands.map((name) => ({
    festival_id: festivalId,
    slot_id: null,
    name,
    stage: null,
    start_time: null,
    end_time: null,
    genre: null,
    image_url: null,
    category: 'band' as const,
  }));
}

function argValue(flag: string, argv = process.argv): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

async function applyFestival(festival: AnnouncementFestivalSeed) {
  const { supabase, supabaseUrl } = createServiceClient();
  console.log(`Target: ${supabaseUrl}`);

  const { data: existingFestival, error: lookupError } = await supabase
    .from('festivals')
    .select('id, slug, name, timezone, starts_at, ends_at, features')
    .eq('slug', festival.slug)
    .maybeSingle();
  if (lookupError) throw new Error(`Festival lookup failed: ${lookupError.message}`);

  let festivalId: string;
  if (existingFestival) {
    const existingFeatures = existingFestival.features as Record<string, unknown> | null;
    if (existingFeatures?.running_order === true) {
      throw new Error(
        `Refusing ${festival.slug}: existing Festival is already in Schedule Lineup.`,
      );
    }
    festivalId = existingFestival.id as string;
    console.log('Festival catalog row already exists; leaving its metadata/features unchanged.');
  } else {
    const catalogRow = {
      slug: festival.slug,
      name: festival.name,
      timezone: festival.timezone,
      starts_at: festival.starts_at,
      ends_at: festival.ends_at,
      features: festival.features,
    };
    const { data, error } = await supabase
      .from('festivals')
      .insert(catalogRow)
      .select('id')
      .single();
    if (error || !data) {
      throw new Error(`Festival insert failed: ${error?.message ?? 'no row returned'}`);
    }
    festivalId = data.id as string;
    console.log('✓ Festival catalog row created');
  }

  const { data: existingBands, error: bandsError } = await supabase
    .from('bands')
    .select('id, name')
    .eq('festival_id', festivalId);
  if (bandsError) throw new Error(`Band lookup failed: ${bandsError.message}`);

  if ((existingBands ?? []).length > 0) {
    const expected = new Set(festival.bands.map(normalizedName));
    const actual = new Set((existingBands ?? []).map((row) => normalizedName(row.name)));
    const same =
      existingBands?.length === festival.bands.length &&
      expected.size === actual.size &&
      [...expected].every((name) => actual.has(name));
    if (!same) {
      throw new Error(
        `Refusing to overwrite ${existingBands?.length ?? 0} existing Bands for ${festival.slug}. ` +
          'Use the Phase 49 name-match lineup workflow for later changes.',
      );
    }
    console.log(`✓ Existing ${existingBands?.length ?? 0}-Band announcement lineup matches; no-op`);
    return;
  }

  const rows = buildAnnouncementBandRows(festivalId, festival.bands);
  const { error: insertError } = await supabase.from('bands').insert(rows);
  if (insertError) throw new Error(`Band insert failed: ${insertError.message}`);
  await bumpCacheVersion(supabase, festivalId);
  console.log(`✓ Inserted ${rows.length} untimed Bands and bumped cache_version`);
}

export async function main(argv = process.argv) {
  const errors = validateAnnouncementFestivalSeeds();
  if (errors.length > 0) {
    throw new Error(`Announcement seed integrity failed:\n${errors.join('\n')}`);
  }

  const slug = argValue('--festival', argv);
  if (!slug) {
    console.error(
      `Missing --festival. Choose one of:\n${announcementFestivals2027
        .map((festival) => `  ${festival.slug}`)
        .join('\n')}`,
    );
    process.exitCode = 1;
    return;
  }

  const festival = announcementFestivals2027.find((candidate) => candidate.slug === slug);
  if (!festival) {
    console.error(`Unsupported Festival slug: ${slug}`);
    process.exitCode = 1;
    return;
  }

  console.log('━'.repeat(72));
  console.log(`${festival.name} — initial Announcement Lineup seed`);
  console.log('━'.repeat(72));
  console.log(`Location: ${festival.location}`);
  console.log(`Dates:    ${festival.starts_at} → ${festival.ends_at}`);
  console.log(`Bands:    ${festival.bands.length}`);
  console.log('Era:      Announcement Lineup (running_order=false)');
  console.log('Safety:   create-only; never deletes or overwrites Bands');

  if (!argv.includes('--apply')) {
    console.log('\nDry-run only. Re-run with --apply to create the catalog/lineup when absent.');
    return;
  }

  await applyFestival(festival);
  console.log('Done 🤘');
}

if (isSelfInvoked(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
