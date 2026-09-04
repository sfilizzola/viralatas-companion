/**
 * Catalog + Announcement Lineup seed for supported 2027 festivals.
 *
 * Usage:
 *   npm run seed:announcement-festivals-2027 -- --festival wacken-2027
 *   npm run seed:announcement-festivals-2027 -- --festival wacken-2027 --apply
 *
 * Dry-run is the default and needs no credentials. Apply creates the Festival
 * when absent, inserts untimed Bands when that Festival has zero bands, and
 * patches `image_url` when the existing name set already matches. It never
 * deletes Bands or picks.
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

export type AnnouncementBandSeed = {
  name: string;
  image_url: string;
};

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
  bands: AnnouncementBandSeed[];
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
      { name: 'Avatar', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Avatar.jpg' },
      { name: 'Beast In Black', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Beast_in_Black.jpg' },
      { name: 'Belphegor', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Belphegor.jpg' },
      { name: 'Between Two Worlds', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Between_Two_Worlds.jpg' },
      { name: 'Blue Medusa', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Blue_Medusa.jpg' },
      { name: 'Carnifex', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Carnifex.jpg' },
      { name: 'Cavalera Conspiracy', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Cavaleria-Conspiracy.jpg' },
      { name: 'Children Of Bodom', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Children_of_Bottom.jpg' },
      { name: 'Creeper', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Creeper.jpg' },
      { name: 'Crypta', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Crypta.jpg' },
      { name: 'Dark Tranquility', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Dark_Tranquility.jpg' },
      { name: 'Dethklok', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Dethklok.jpg' },
      { name: 'DragonForce', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Dragon_Force.jpg' },
      { name: 'Edguy', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Edguy.jpg' },
      { name: 'Electric Callboy', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Electric_Callboy.jpg' },
      { name: 'Feuerschwanz', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Feuerschwanz.jpg' },
      { name: 'Five Finger Death Punch', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Five_Finger_Death_Punch.jpg' },
      { name: 'Gaerea', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Gaerea.jpg' },
      { name: 'Halestorm', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Halestorm.jpg' },
      { name: 'Hammerfall', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Hammerfall.jpg' },
      { name: 'Heaven Shall Burn', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Heaven_Shall_Burn.jpg' },
      { name: 'Heavens Gate', image_url: 'https://cdn-images.dzcdn.net/images/artist/b9c0f5568fe8a9f5d221b9aa2fcfad71/1000x1000-000000-80-0-0.jpg' },
      { name: 'Helloween', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Helloween.jpg' },
      { name: 'Hiraes', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Hiraes.jpg' },
      { name: 'Imminence', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Imminence.jpg' },
      { name: 'Jinjer', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Jinjer.jpg' },
      { name: 'John 5 And The Creatures', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_John5.jpg' },
      { name: 'John Bush', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_John_Bush.jpg' },
      { name: 'Kanonenfieber', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Kanonenfieber.jpg' },
      { name: 'Knocked Loose', image_url: 'https://upload.wikimedia.org/wikipedia/commons/9/92/Knocked_Loose_2024.jpg' },
      { name: 'Make Them Suffer', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Make-them-Suffer.jpg' },
      { name: 'Malevolence', image_url: 'https://www.wacken.com/fileadmin/user_upload/malevolence.jpg' },
      { name: 'Metal Church', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Metal_Church.jpg' },
      { name: 'Mittel Alta', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Mittel_Alta.jpg' },
      { name: 'Napalm Death', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Napalm_Death.jpg' },
      { name: 'Norther', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Norther.jpg' },
      { name: 'Overkill', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Overkill.jpg' },
      { name: 'Primordial', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Primordial.jpg' },
      { name: 'Seven Blood', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Seven_Blood.jpg' },
      { name: 'Shadow Of Intent', image_url: 'https://www.wacken.com/fileadmin/user_upload/shadow-of-intent.jpg' },
      { name: 'Sylosis', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Sylosis.jpg' },
      { name: 'Tailgunner', image_url: 'https://cdn-images.dzcdn.net/images/artist/743c8f560e97d818a665c480fe97216e/1000x1000-000000-80-0-0.jpg' },
      { name: 'The Browning', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_The_Browning.jpg' },
      { name: 'The Narrator', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_The-Narrator.jpg' },
      { name: 'The New Roses', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_The_New_Roses.jpg' },
      { name: 'Towards The Sinister', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Towards_the_Sinister.jpg' },
      { name: 'Tyketto', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Tyketto.jpg' },
      { name: 'U.D.O.', image_url: 'https://www.wacken.com/fileadmin/user_upload/udo-band.jpg' },
      { name: 'Victorius', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/victorius_27.jpg' },
      { name: 'Witch Club Satan', image_url: 'https://www.wacken.com/fileadmin/user_upload/bandimages/bands2027/WOA27_Witch_Club_Satan.jpg' },
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
      { name: 'Accept', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_accept_v2a.jpg' },
      { name: 'Alestorm', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_alestorm_v1a.jpg' },
      { name: 'All For Metal', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_allformetal_v1a.jpg' },
      { name: 'Arch Enemy', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_archenemy_v2a.jpg' },
      { name: 'Bruce Dickinson', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_brucedickinson_v1a.jpg' },
      { name: 'Coppelius', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_coppelius_v1a.jpg' },
      { name: 'Dartagnan', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_dartagnan_v1a.jpg' },
      { name: 'Dust Bolt', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_dustbolt_v1a.jpg' },
      { name: 'Eisbrecher', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_eisbrecher_v1a.jpg' },
      { name: 'Emil Bulls', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_emilbulls_v1a.jpg' },
      { name: 'Equilibrium', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_equilibrium_v1a.jpg' },
      { name: 'Grave Digger', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_gravedigger_v1a.jpg' },
      { name: 'Gutalax', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_gutalax_v1a.jpg' },
      { name: 'GWAR', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_gwar_v1a.jpg' },
      { name: 'H-Blockx', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_h-blockx_v1a.jpg' },
      { name: 'Handgemeng', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_handgemeng_v1a.jpg' },
      { name: 'Igels vs. Shark', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_igelvsshark_v1a.jpg' },
      { name: 'Katerfahrt', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_katerfahrt_v1a.jpg' },
      { name: 'Korpiklaani', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_korpiklaani_v1a.jpg' },
      { name: 'Lord Of The Lost', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_lordofthelost_v1a.jpg' },
      { name: 'Marduk', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_marduk_v1a.jpg' },
      { name: 'Metal Church', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_metalchurch_v1a.jpg' },
      { name: 'Nestor', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_nestor_v1a.jpg' },
      { name: 'Setyoursails', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_setyoursails_v1a.jpg' },
      { name: 'Skald', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_skald_v1a.jpg' },
      { name: 'Tankard', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_tankard_v1a.jpg' },
      { name: 'The Sisters of Mercy', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_thesistersofmercy_v1a.jpg' },
      { name: 'Stormseeker', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_stormseeker_v1a.jpg' },
      { name: 'Turbobier', image_url: 'https://www.rockharz-festival.com/wp-content/uploads/2026/07/rhz2027_web_linkespalte_turbobier_v1a.jpg' },
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
      { name: 'Lacuna Coil', image_url: 'https://bangersopenair.com/wp-content/uploads/2026/06/CARD-lacuna-coil.png' },
      { name: 'Quiet Riot', image_url: 'https://bangersopenair.com/wp-content/uploads/2026/06/CARD-quiet-riot.png' },
      { name: 'Floor Jansen', image_url: 'https://bangersopenair.com/wp-content/uploads/2026/06/CARD-floor-jansen.png' },
      { name: 'Soen', image_url: 'https://bangersopenair.com/wp-content/uploads/2026/06/CARD-soen.png' },
      { name: "KK's Priest", image_url: 'https://bangersopenair.com/wp-content/uploads/2026/07/CARD-kks-priest.png' },
      { name: 'W.E.T.', image_url: 'https://bangersopenair.com/wp-content/uploads/2026/07/CARD-wet.png' },
      { name: 'Eluveitie', image_url: 'https://bangersopenair.com/wp-content/uploads/2026/08/CARD-eluveitie.png' },
      { name: 'Kanonenfieber', image_url: 'https://bangersopenair.com/wp-content/uploads/2026/08/CARD-kanonenfieber.png' },
      { name: 'Soilwork', image_url: 'https://bangersopenair.com/wp-content/uploads/2026/08/CARD-soilwork.png' },
      { name: 'Metal Church', image_url: 'https://bangersopenair.com/wp-content/uploads/2026/06/CARD-metal-church.png' },
      { name: 'Blaze Bayley', image_url: 'https://bangersopenair.com/wp-content/uploads/2026/07/CARD-blaze-bayley.png' },
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
      { name: 'HammerFall', image_url: 'https://upload.wikimedia.org/wikipedia/commons/1/16/Hammerfall_-_Wacken_Open_Air_2023_37_%28cropped%29.jpg' },
      { name: 'Korpiklaani', image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Korpiklaani_-_Rakuunarock_2013.jpg' },
      { name: 'Warkings', image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Warkings_Rockharz_2025_49.jpg' },
      { name: 'Edu Falaschi', image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Edu_Falaschi_%282%29.jpg' },
      { name: 'Elvenking', image_url: 'https://cdn-images.dzcdn.net/images/artist/9481c0c4c760be64009594ba63486e74/1000x1000-000000-80-0-0.jpg' },
      { name: 'Nanowar of Steel', image_url: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Nanowar_of_Steel_-_2024165202214_2024-06-13_Steel_Panther_-_Sven_-_1D_X_MK_II_-_0039_-_B70I9112.jpg' },
      { name: 'Freedom Call', image_url: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Freedom_Call_Band_2.jpg' },
      { name: 'Heavysaurus', image_url: 'https://cdn-images.dzcdn.net/images/artist/626c39b3ba444f1dae426df935351c32/1000x1000-000000-80-0-0.jpg' },
      { name: 'Temperance', image_url: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Temperance_Hellraiser_Leipzig_2024_09.jpg' },
      { name: 'Labyrinth', image_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Labyrinth_Evolution.jpg' },
      { name: 'Hagane', image_url: 'https://upload.wikimedia.org/wikipedia/commons/1/1f/HAGANE_at_EPICFEST2026_Denmark_1.jpg' },
      { name: "Sascha Paeth's Masters of Ceremony", image_url: 'https://cdn-images.dzcdn.net/images/artist/bf448ce75db3e57cdac176c86846567d/1000x1000-000000-80-0-0.jpg' },
      { name: 'Dreamtale', image_url: 'https://cdn-images.dzcdn.net/images/artist/e113f02feaff3b272b228a1f48d1105e/1000x1000-000000-80-0-0.jpg' },
      { name: 'Hulkoff', image_url: 'https://cdn-images.dzcdn.net/images/artist/6eb96fe93140bba962321195f5f91413/1000x1000-000000-80-0-0.jpg' },
      { name: 'Jupiter', image_url: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Jupiter_live_2015.jpg' },
      { name: 'Sellsword', image_url: 'https://cdn-images.dzcdn.net/images/artist/a404736a0d94331ffbf038539ae6c05e/1000x1000-000000-80-0-0.jpg' },
      { name: 'Tower Hill', image_url: 'https://cdn-images.dzcdn.net/images/artist/77a4fceb9918a4ff7889119be8d654ff/1000x1000-000000-80-0-0.jpg' },
      { name: 'Owlbear', image_url: 'https://super.magfest.org/wp-content/uploads/2026/02/owlbear_xp.png' },
      { name: 'Power Paladin', image_url: 'https://cdn-images.dzcdn.net/images/artist/aab71da7f1a330f2243a52dbbe06c8c3/1000x1000-000000-80-0-0.jpg' },
      { name: 'Heimdall', image_url: 'https://cdn-images.dzcdn.net/images/artist/323bd5f6056f0815d25a34f4ce83e3f8/1000x1000-000000-80-0-0.jpg' },
      { name: 'Skeletoon', image_url: 'https://cdn-images.dzcdn.net/images/artist/61a52d42382539e0bb173628ea47679f/1000x1000-000000-80-0-0.jpg' },
      { name: 'The 7th Guild', image_url: 'https://cdn-images.dzcdn.net/images/artist/2298582fe1ed7e2512b32363c154577d/1000x1000-000000-80-0-0.jpg' },
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
    for (const band of festival.bands) {
      const normalized = normalizedName(band.name);
      if (!normalized) errors.push(`${festival.slug}: empty Band name`);
      if (names.has(normalized)) {
        errors.push(`${festival.slug}: duplicate normalized Band name: ${band.name}`);
      }
      names.add(normalized);
      if (!/^https:\/\//.test(band.image_url)) {
        errors.push(`${festival.slug}: ${band.name} needs an https image_url`);
      }
      if (/coming-soon/i.test(band.image_url)) {
        errors.push(`${festival.slug}: ${band.name} still uses a Coming Soon placeholder`);
      }
    }
  }

  return errors;
}

export function buildAnnouncementBandRows(
  festivalId: string,
  bands: AnnouncementBandSeed[],
) {
  return bands.map((band) => ({
    festival_id: festivalId,
    slot_id: null,
    name: band.name,
    stage: null,
    start_time: null,
    end_time: null,
    genre: null,
    image_url: band.image_url,
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
    .select('id, name, image_url')
    .eq('festival_id', festivalId);
  if (bandsError) throw new Error(`Band lookup failed: ${bandsError.message}`);

  if ((existingBands ?? []).length > 0) {
    const expected = new Set(festival.bands.map((band) => normalizedName(band.name)));
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
    let changed = 0;
    const byName = new Map(
      (existingBands ?? []).map((row) => [normalizedName(row.name), row] as const),
    );
    for (const band of festival.bands) {
      const row = byName.get(normalizedName(band.name));
      if (!row || row.image_url === band.image_url) continue;
      const { error } = await supabase
        .from('bands')
        .update({ image_url: band.image_url })
        .eq('id', row.id);
      if (error) {
        throw new Error(`image_url update failed for ${band.name}: ${error.message}`);
      }
      changed += 1;
    }
    if (changed === 0) {
      console.log(`✓ Existing ${existingBands?.length ?? 0}-Band announcement lineup matches; images unchanged`);
      return;
    }
    await bumpCacheVersion(supabase, festivalId);
    console.log(`✓ Patched image_url on ${changed} Bands and bumped cache_version`);
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
  console.log(`${festival.name} — Announcement Lineup seed`);
  console.log('━'.repeat(72));
  console.log(`Location: ${festival.location}`);
  console.log(`Dates:    ${festival.starts_at} → ${festival.ends_at}`);
  console.log(`Bands:    ${festival.bands.length}`);
  console.log(`Images:   ${festival.bands.filter((band) => band.image_url).length}`);
  console.log('Era:      Announcement Lineup (running_order=false)');
  console.log('Safety:   never deletes Bands; matching lineup patches image_url only');

  if (!argv.includes('--apply')) {
    console.log('\nDry-run only. Re-run with --apply to create the catalog/lineup or patch images.');
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
