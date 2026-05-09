import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Announcement, Band, CrewUser, UserPick, UserPresence } from '../types';
import {
  ANNOUNCEMENTS_CHANGED_EVENT,
  CREW_USERS_CHANGED_EVENT,
  PICKS_CHANGED_EVENT,
  PRESENCE_CHANGED_EVENT,
  loadAllUserPicks,
  loadAllUserPresence,
  loadBands,
  loadCrewUsers,
  loadLatestAnnouncement,
  saveUserPresence,
} from '../lib/db';
import {
  applyPresenceToLivePlan,
  findLivePlan,
  formatFestivalTime,
  groupCrewLivePlans,
  mapCrewLivePlans,
  type CrewLiveGroup,
  type CrewLivePlan,
  type LivePlan,
} from '../lib/livePreview';
import { setCampingStatus, setMetalPlaceStatus, syncCrewPresence, syncMetalPlaceConfig, isTimeWithinMetalPlaceWindow, validateAndAutoCheckoutOutsideMetalPlaceWindow } from '../lib/presence';
import { syncLiveBandTestConfig } from '../lib/liveBandTest';
import {
  loadLiveBandTestConfig,
  loadMetalPlaceConfig,
  LIVE_BAND_TEST_CONFIG_CHANGED_EVENT,
  METAL_PLACE_CONFIG_CHANGED_EVENT,
  saveLiveBandTestConfig,
  saveMetalPlaceConfig,
} from '../lib/db';
import type { LiveBandTestConfig, MetalPlaceConfig } from '../types';
import { togglePick } from '../lib/picks';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNow } from '../hooks/useNow';
import { useI18n } from '../lib/i18n';
import { stageColor } from '../lib/stageColors';
import BottomNav from '../components/BottomNav';
import OfflineBanner from '../components/OfflineBanner';
import BadgesDisplay from '../components/BadgesDisplay';
import styles from './RightNowPage.module.css';

function truncateDisplayName(name: string): string {
  if (name.length <= 17) return name;
  return name.slice(0, 17) + '...';
}

function nowLabel(date: Date, language: 'br' | 'en') {
  return new Intl.DateTimeFormat(language === 'br' ? 'pt-BR' : 'en-US', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(date);
}

function planLabel(plan: LivePlan, t: (key: string) => string) {
  if (plan.status === 'current') return t('current');
  if (plan.status === 'next') return t('next');
  if (plan.status === 'lost') return t('lost');
  return t('empty');
}

function planHint(plan: LivePlan, t: (key: string) => string) {
  if (plan.status === 'current') return t('currentHint');
  if (plan.status === 'next') return t('nextHint');
  if (plan.status === 'lost') return t('lostHint');
  return t('emptyHint');
}

function nextHint(plan: LivePlan, t: (key: string, values?: Record<string, string>) => string) {
  if (!plan.nextBand) return null;
  return t('nextPick', {
    band: plan.nextBand.name,
    time: formatFestivalTime(plan.nextBand.start_time),
  });
}

function groupTitle(group: CrewLiveGroup, t: (key: string, values?: Record<string, string | number>) => string) {
  if (group.kind === 'band') return group.band.name;
  if (group.kind === 'metal_place') return t('metalPlaceGroupTitle');
  if (group.kind === 'camping') return t('campingGroupTitle');
  return t('lostGroupTitle');
}

function groupKicker(
  group: CrewLiveGroup,
  t: (key: string, values?: Record<string, string | number>) => string,
  metalPlaceConfig?: MetalPlaceConfig | null,
) {
  if (group.kind === 'band') {
    return t('bandGroupKicker', {
      stage: group.band.stage,
      start: formatFestivalTime(group.band.start_time),
      end: formatFestivalTime(group.band.end_time),
    });
  }
  if (group.kind === 'metal_place') return metalPlaceSubtitle(metalPlaceConfig ?? null, t);
  if (group.kind === 'camping') return t('campingGroupKicker');
  return t('lostGroupKicker');
}

function emptyGroupMessage(group: CrewLiveGroup, t: (key: string) => string) {
  if (group.kind === 'metal_place') return t('metalPlaceGroupEmpty');
  return group.kind === 'camping' ? t('campingGroupEmpty') : t('lostGroupEmpty');
}

function formatHmTime(value?: string | null): string | null {
  if (!value) return null;
  // Postgres TIME ("12:00:00") or HTML <input type="time"> ("12:00").
  return value.slice(0, 5);
}

function metalPlaceSubtitle(
  config: MetalPlaceConfig | null,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const start = formatHmTime(config?.start_time);
  const end = formatHmTime(config?.end_time);
  if (start && end) {
    return t('metalPlaceGroupKickerWithTime', { start, end });
  }
  return t('metalPlaceGroupKicker');
}


function CrewMember({ crew }: { crew: CrewLivePlan }) {
  const hasNext = !crew.plan.band && !!crew.plan.nextBand;
  return (
    <li className={styles.memberPill}>
      <span className={styles.avatar}>
        {crew.avatar_url ? (
          <img className={styles.avatarImg} src={crew.avatar_url} alt="" loading="lazy" />
        ) : (
          <span aria-hidden>{crew.label.charAt(0).toUpperCase()}</span>
        )}
      </span>
      {hasNext ? (
        <span className={styles.memberText}>
          <span className={styles.crewName}>{truncateDisplayName(crew.label)}</span>
          <span className={styles.memberMeta}>
            {formatFestivalTime(crew.plan.nextBand!.start_time)} · {crew.plan.nextBand!.name}
          </span>
        </span>
      ) : (
        <span className={styles.crewName}>{truncateDisplayName(crew.label)}</span>
      )}
    </li>
  );
}

export default function RightNowPage() {
  const { language, t } = useI18n('RightNowPage');
  const { session, user } = useAuth();
  const userId = session?.user?.id ?? null;
  const userDisplayName =
    (user?.user_metadata?.['display_name'] as string | undefined) ?? user?.email ?? null;

  const [bands, setBands] = useState<Band[]>([]);
  const [picks, setPicks] = useState<UserPick[]>([]);
  const [crewUsers, setCrewUsers] = useState<CrewUser[]>([]);
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const now = useNow(30_000);
  const [loading, setLoading] = useState(true);
  const [undoState, setUndoState] = useState<{
    bandId: string;
    bandName: string;
  } | null>(null);
  const [undoTimerId, setUndoTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [metalPlaceCheckingIn, setMetalPlaceCheckingIn] = useState(false);
  const [metalPlaceCheckedIn, setMetalPlaceCheckedIn] = useState(false);
  const [metalPlaceConfig, setMetalPlaceConfig] = useState<MetalPlaceConfig | null>(null);
  const [liveBandTestConfig, setLiveBandTestConfig] = useState<LiveBandTestConfig | null>(null);

  const refreshFromCache = useCallback(async () => {
    try {
      const [cachedBands, cachedPicks, cachedUsers, cachedPresence, ann] = await Promise.all([
        loadBands(),
        loadAllUserPicks(),
        loadCrewUsers(),
        loadAllUserPresence(),
        loadLatestAnnouncement(),
      ]);
      setBands(cachedBands.sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setPicks(cachedPicks);
      setCrewUsers(cachedUsers);
      setPresence(cachedPresence);
      setLatestAnnouncement(ann ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    function handleCacheChange() {
      refreshFromCache();
    }

    window.queueMicrotask(handleCacheChange);
    window.addEventListener(PICKS_CHANGED_EVENT, handleCacheChange);
    window.addEventListener(CREW_USERS_CHANGED_EVENT, handleCacheChange);
    window.addEventListener(PRESENCE_CHANGED_EVENT, handleCacheChange);
    window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handleCacheChange);

    return () => {
      window.removeEventListener(PICKS_CHANGED_EVENT, handleCacheChange);
      window.removeEventListener(CREW_USERS_CHANGED_EVENT, handleCacheChange);
      window.removeEventListener(PRESENCE_CHANGED_EVENT, handleCacheChange);
      window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handleCacheChange);
      if (undoTimerId) clearTimeout(undoTimerId);
    };
  }, [refreshFromCache, undoTimerId]);

  useEffect(() => {
    syncCrewPresence().catch(() => {});

    const channel = supabase
      .channel('user_presence_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        async (payload) => {
          const nextPresence = (payload.new ?? payload.old) as UserPresence | undefined;
          if (nextPresence) await saveUserPresence(nextPresence);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    async function loadMetalPlaceConfigFromDB() {
      const config = await loadMetalPlaceConfig();
      setMetalPlaceConfig(config);
    }

    loadMetalPlaceConfigFromDB();
    syncMetalPlaceConfig().catch(() => {});

    function handleConfigChange() {
      loadMetalPlaceConfigFromDB();
    }

    window.addEventListener(METAL_PLACE_CONFIG_CHANGED_EVENT, handleConfigChange);

    // Realtime: when godlike updates Metal Place config from another tab/device,
    // mirror to IDB so this view picks it up via the cache-changed event above.
    const channel = supabase
      .channel('metal_place_config_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'metal_place_config' },
        async (payload) => {
          const next = (payload.new ?? payload.old) as MetalPlaceConfig | undefined;
          if (next) await saveMetalPlaceConfig(next);
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener(METAL_PLACE_CONFIG_CHANGED_EVENT, handleConfigChange);
      supabase.removeChannel(channel);
    };
  }, []);

  const isMetalPlaceWindowActive = useMemo(
    () => isTimeWithinMetalPlaceWindow(metalPlaceConfig, now),
    [metalPlaceConfig, now],
  );

  useEffect(() => {
    async function loadFromDB() {
      const config = await loadLiveBandTestConfig();
      setLiveBandTestConfig(config);
    }

    loadFromDB();
    syncLiveBandTestConfig().catch(() => {});

    function handleConfigChange() {
      loadFromDB();
    }

    window.addEventListener(LIVE_BAND_TEST_CONFIG_CHANGED_EVENT, handleConfigChange);

    const channel = supabase
      .channel('live_band_test_config_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_band_test_config' },
        async (payload) => {
          const next = (payload.new ?? payload.old) as LiveBandTestConfig | undefined;
          if (next) await saveLiveBandTestConfig(next);
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener(LIVE_BAND_TEST_CONFIG_CHANGED_EVENT, handleConfigChange);
      supabase.removeChannel(channel);
    };
  }, []);

  const liveTestBandId = useMemo(
    () =>
      liveBandTestConfig?.enabled && liveBandTestConfig.band_id
        ? liveBandTestConfig.band_id
        : null,
    [liveBandTestConfig],
  );

  const liveTestBand = useMemo(
    () => (liveTestBandId ? bands.find((b) => b.id === liveTestBandId) ?? null : null),
    [bands, liveTestBandId],
  );

  useEffect(() => {
    // Skip until both config and userId are available, otherwise the very first
    // run with config=null would force-checkout the user on every mount.
    // Re-runs when isMetalPlaceWindowActive flips false (config change OR time
    // crossing end_time during the 30s `now` tick), so the local user gets
    // checked out when the test event ends or the real schedule expires.
    if (!metalPlaceConfig || !userId) return;
    validateAndAutoCheckoutOutsideMetalPlaceWindow(metalPlaceConfig, userId).catch(() => {});
  }, [metalPlaceConfig, userId, isMetalPlaceWindowActive]);

  const myRawPlan = useMemo(() => {
    if (!userId) return { status: 'empty', band: null } satisfies LivePlan;
    return findLivePlan(
      bands,
      new Set(picks.filter((pick) => pick.user_id === userId).map((pick) => pick.band_id)),
      now,
      liveTestBandId,
    );
  }, [bands, picks, userId, now, liveTestBandId]);

  const myPresence = useMemo(
    () => (userId ? presence.find((item) => item.user_id === userId) : undefined),
    [presence, userId],
  );

  const isCamping = myPresence?.is_camping ?? false;
  const isAtMetalPlace = myPresence?.is_at_metal_place ?? false;

  const myPlan = useMemo(
    () => applyPresenceToLivePlan(myRawPlan, isCamping),
    [myRawPlan, isCamping],
  );

  useEffect(() => {
    if (!userId || !isCamping || myRawPlan.status !== 'current') return;
    setCampingStatus(userId, false).catch(() => {});
  }, [userId, isCamping, myRawPlan.status]);

  const crewPlans = useMemo(() => {
    const users = [...crewUsers];
    if (userId && !users.some((crewUser) => crewUser.id === userId)) {
      users.push({ id: userId, display_name: userDisplayName, avatar_url: null });
    }
    return mapCrewLivePlans(bands, picks, users, presence, now, liveTestBandId);
  }, [bands, picks, crewUsers, presence, userId, userDisplayName, now, liveTestBandId]);

  const crewGroups = useMemo(
    () => groupCrewLivePlans(crewPlans, { metalPlaceWindowActive: isMetalPlaceWindowActive }),
    [crewPlans, isMetalPlaceWindowActive],
  );

  async function handleSkip() {
    if (!myPlan.band || !userId) return;
    const bandId = myPlan.band.id;
    const bandName = myPlan.band.name;

    // Clear any existing undo timer
    if (undoTimerId) clearTimeout(undoTimerId);

    // Remove the pick from IndexedDB
    await togglePick(userId, bandId, true);

    // Show undo toast for 5 seconds
    setUndoState({
      bandId,
      bandName,
    });

    const timerId = setTimeout(() => {
      setUndoState(null);
    }, 5000);

    setUndoTimerId(timerId);
  }

  async function handleUndo() {
    if (!undoState || !userId) return;

    // Clear timer
    if (undoTimerId) clearTimeout(undoTimerId);
    setUndoTimerId(null);

    // Restore the pick to IndexedDB
    await togglePick(userId, undoState.bandId, false);

    // Close toast
    setUndoState(null);
  }

  function handleCampingToggle(checked: boolean) {
    if (!userId) return;
    if (checked && myRawPlan.status === 'current') {
      setCampingStatus(userId, false).catch(() => {});
      return;
    }
    setCampingStatus(userId, checked).catch(() => {});
  }

  return (
    <div className={styles.page}>
      <OfflineBanner />
      <header className={styles.header}>
        <div>
          <span className={styles.title}>{t('title')}</span>
          <span className={styles.timestamp}>
            {nowLabel(now, language)} {t('wackenTime')}
          </span>
        </div>
        <label className={styles.campingSwitch}>
          <span>{t('camping')}</span>
          <input
            type="checkbox"
            checked={isCamping && myRawPlan.status !== 'current'}
            onChange={(event) => handleCampingToggle(event.target.checked)}
          />
          <span className={styles.switchTrack} aria-hidden />
        </label>
      </header>

      {liveTestBand && (
        <div className={styles.liveTestBanner} role="status">
          {t('liveTestBanner', { band: liveTestBand.name })}
        </div>
      )}

      <main className={styles.main}>
        {loading ? (
          <p className={styles.empty}>{t('loading')}</p>
        ) : (
          <>
            <section className={styles.hero} aria-live="polite">
              {(myPlan.status === 'lost' || myPlan.status === 'empty') && latestAnnouncement ? (
                <div className={styles.announcementHero}>
                  <span className={styles.eyebrow}>{t('latestNews')}</span>
                  <p className={styles.announcementContent}>{latestAnnouncement.content}</p>
                </div>
              ) : (
                <>
                  <div className={styles.heroImage}>
                    {myPlan.band?.image_url ? (
                      <img src={myPlan.band.image_url} alt="" loading="lazy" />
                    ) : (
                      <div className={styles.placeholder} aria-hidden>
                        {myPlan.band?.name.charAt(0).toUpperCase() ?? 'V'}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className={styles.eyebrow}>{planLabel(myPlan, t)}</span>
                    {myPlan.band ? (
                      <>
                        <h1 className={styles.bandName}>{myPlan.band.name}</h1>
                        <p className={styles.empty}>{planHint(myPlan, t)}</p>
                        <div className={styles.meta}>
                          <span className={styles.stage}>{myPlan.band.stage}</span>
                          <span className={styles.time}>
                            {formatFestivalTime(myPlan.band.start_time)} -{' '}
                            {formatFestivalTime(myPlan.band.end_time)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className={styles.empty}>{planHint(myPlan, t)}</p>
                    )}
                    {myPlan.status === 'lost' && nextHint(myPlan, t) && (
                      <p className={styles.nextHint}>{nextHint(myPlan, t)}</p>
                    )}
                    {myPlan.status === 'current' && myPlan.band && (
                      <button className={styles.skipButton} onClick={() => handleSkip()}>
                        {t('souFraco')}
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>

            {userId && isMetalPlaceWindowActive && (
              <div className={styles.metalPlaceCard}>
                <div className={styles.metalPlaceContainer}>
                  <div className={styles.metalPlaceLeft}>
                    <div className={styles.metalPlaceIcon} aria-hidden>🍺</div>
                    <div className={styles.metalPlaceInfo}>
                      <div className={styles.metalPlaceTitle}>{t('metalPlaceGroupTitle')}</div>
                      <div className={styles.metalPlaceSubtitle}>
                        {metalPlaceSubtitle(metalPlaceConfig, t)}
                      </div>
                    </div>
                  </div>

                  <div className={styles.metalPlaceRight}>
                    {isAtMetalPlace ? (
                      <button
                        className={styles.checkoutButton}
                        onClick={async () => {
                          setMetalPlaceCheckingIn(true);
                          try {
                            await setMetalPlaceStatus(userId, false);
                            setMetalPlaceCheckedIn(true);
                            setTimeout(() => setMetalPlaceCheckedIn(false), 3000);
                          } finally {
                            setMetalPlaceCheckingIn(false);
                          }
                        }}
                        disabled={metalPlaceCheckingIn}
                      >
                        {metalPlaceCheckingIn ? '⏳' : metalPlaceCheckedIn ? '✅' : '👋'}
                        <span className={styles.buttonText}>
                          {metalPlaceCheckingIn
                            ? t('metalPlaceCheckingOut')
                            : metalPlaceCheckedIn
                              ? t('metalPlaceCheckedOut')
                              : t('metalPlaceCheckOut')}
                        </span>
                      </button>
                    ) : (
                      <button
                        className={styles.checkinButton}
                        onClick={async () => {
                          setMetalPlaceCheckingIn(true);
                          try {
                            await setMetalPlaceStatus(userId, true);
                            setMetalPlaceCheckedIn(true);
                            setTimeout(() => setMetalPlaceCheckedIn(false), 3000);
                          } finally {
                            setMetalPlaceCheckingIn(false);
                          }
                        }}
                        disabled={metalPlaceCheckingIn || metalPlaceCheckedIn}
                      >
                        {metalPlaceCheckingIn ? '⏳' : metalPlaceCheckedIn ? '✅' : '🍺'}
                        <span className={styles.buttonText}>
                          {metalPlaceCheckingIn
                            ? t('metalPlaceCheckingIn')
                            : metalPlaceCheckedIn
                              ? t('metalPlaceCheckInActive')
                              : t('metalPlaceCheckIn')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {user && <BadgesDisplay user={user} />}

            <h2 className={styles.sectionTitle}>{t('crewNow')}</h2>
            {crewPlans.length === 0 ? (
              <p className={styles.empty}>{t('crewEmpty')}</p>
            ) : (
              <section className={styles.crewGroups} aria-label={t('crewGridLabel')}>
                {crewGroups.map((group) => (
                  <article
                    className={`${styles.groupCard} ${styles[group.kind]}`}
                    key={group.kind === 'band' ? group.band.id : group.kind}
                  >
                    <div
                      className={styles.locStrip}
                      style={group.kind === 'band' ? { background: stageColor(group.band.stage) } : undefined}
                    />
                    <div className={styles.groupHeader}>
                      <div>
                        <span className={styles.groupKicker}>{groupKicker(group, t, metalPlaceConfig)}</span>
                        <h3 className={styles.groupTitle}>{groupTitle(group, t)}</h3>
                      </div>
                      <div className={styles.groupCount}>
                        {group.members.length}
                        <small className={styles.locCountLabel}>{t('crewCountLabel')}</small>
                      </div>
                    </div>
                    {group.members.length > 0 ? (
                      <ul className={styles.memberList}>
                        {group.members.map((crew) => (
                          <CrewMember crew={crew} key={crew.id} />
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.groupEmpty}>{emptyGroupMessage(group, t)}</p>
                    )}
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </main>

      {undoState && (
        <div className={styles.undoToast}>
          <span className={styles.undoToastText}>
            {t('saiuDe', { band: undoState.bandName })}
          </span>
          <button className={styles.undoToastButton} onClick={() => handleUndo()}>
            {t('desfazer')}
          </button>
        </div>
      )}

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
