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
} from '../services/livePreview';
import { picksRepository, presenceRepository } from '../repositories';
import { syncLiveBandTestConfig } from '../services/liveBandTest';
import {
  loadLiveBandTestConfig,
  loadMetalPlaceConfig,
  LIVE_BAND_TEST_CONFIG_CHANGED_EVENT,
  METAL_PLACE_CONFIG_CHANGED_EVENT,
  saveLiveBandTestConfig,
  saveMetalPlaceConfig,
} from '../lib/db';
import type { LiveBandTestConfig, MetalPlaceConfig } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNow } from '../hooks/useNow';
import { useI18n } from '../lib/i18n';
import { stageColor } from '../services/stageColors';
import BottomNav from '../components/BottomNav';
import OfflineBanner from '../components/OfflineBanner';
import BadgesDisplay from '../components/BadgesDisplay';
import PresenceToggle, { type PresenceLocation } from '../components/PresenceToggle';
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

function relativeAnnouncementTime(
  isoString: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const date = new Date(isoString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return t('minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hoursAgo', { n: hours });
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function groupTitle(
  group: CrewLiveGroup,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  if (group.kind === 'band') return group.band.name;
  if (group.kind === 'metal_place') return t('metalPlaceGroupTitle');
  if (group.kind === 'camping') return t('campingGroupTitle');
  return t('lostGroupTitle');
}

function groupKicker(
  group: CrewLiveGroup,
  t: (key: string, values?: Record<string, string | number>) => string,
  isUserHere: boolean,
) {
  if (group.kind === 'band') return isUserHere ? t('bandGroupKickerHere') : t('bandGroupKicker');
  if (group.kind === 'metal_place') {
    return isUserHere ? t('metalPlaceGroupKickerHere') : t('metalPlaceGroupKicker');
  }
  if (group.kind === 'camping') return isUserHere ? t('campingGroupKickerHere') : t('campingGroupKicker');
  return isUserHere ? t('lostGroupKickerHere') : t('lostGroupKicker');
}

function groupSubtitle(
  group: CrewLiveGroup,
  t: (key: string, values?: Record<string, string | number>) => string,
  metalPlaceConfig?: MetalPlaceConfig | null,
) {
  if (group.kind === 'band') {
    return t('bandGroupSubtitle', {
      stage: group.band.stage,
      start: formatFestivalTime(group.band.start_time),
      end: formatFestivalTime(group.band.end_time),
    });
  }
  if (group.kind === 'metal_place') return metalPlaceSubtitle(metalPlaceConfig ?? null, t);
  if (group.kind === 'camping') return t('campingGroupSubtitle');
  return t('lostGroupSubtitle');
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
    return t('metalPlaceGroupSubtitleWithTime', { start, end });
  }
  return t('metalPlaceGroupSubtitle');
}


function CrewMember({ crew, isCurrentUser }: { crew: CrewLivePlan; isCurrentUser: boolean }) {
  const hasNext = !crew.plan.band && !!crew.plan.nextBand;
  return (
    <li className={`${styles.memberPill} ${isCurrentUser ? styles.me : ''}`}>
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
    presenceRepository.syncCrewFromRemote().catch(() => {});

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
    presenceRepository.syncMetalPlaceConfig().catch(() => {});

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
    () => presenceRepository.isTimeWithinMetalPlaceWindow(metalPlaceConfig, now),
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
    presenceRepository.validateAndAutoCheckout(metalPlaceConfig, userId).catch(() => {});
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
  const presenceValue: PresenceLocation =
    isAtMetalPlace && isMetalPlaceWindowActive
      ? 'metal_place'
      : isCamping && myRawPlan.status !== 'current'
        ? 'camping'
        : 'auto';

  const myPlan = useMemo(
    () => applyPresenceToLivePlan(myRawPlan, isCamping),
    [myRawPlan, isCamping],
  );

  useEffect(() => {
    if (!userId || !isCamping || myRawPlan.status !== 'current') return;
    presenceRepository.setCampingStatus(userId, false).catch(() => {});
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
    await picksRepository.toggle(userId, bandId, true);

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
    await picksRepository.toggle(userId, undoState.bandId, false);

    // Close toast
    setUndoState(null);
  }

  async function handlePresenceChange(nextValue: PresenceLocation) {
    if (!userId) return;

    if (nextValue === 'camping') {
      if (myRawPlan.status === 'current') {
        await presenceRepository.setCampingStatus(userId, false);
        return;
      }
      await presenceRepository.setCampingStatus(userId, true);
      return;
    }

    if (nextValue === 'metal_place') {
      await presenceRepository.setMetalPlaceStatus(userId, true);
      return;
    }

    if (isAtMetalPlace) await presenceRepository.setMetalPlaceStatus(userId, false);
    if (isCamping) await presenceRepository.setCampingStatus(userId, false);
  }

  return (
    <div className={styles.page}>
      <OfflineBanner />
      <header className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
        <span className={styles.timestamp}>
          <span>{nowLabel(now, language)}</span>
          <span>{t('wackenTime')}</span>
        </span>
      </header>

      {liveTestBand && (
        <div className={styles.liveTestBanner} role="status">
          {t('liveTestBanner', { band: liveTestBand.name })}
        </div>
      )}

      <main className={styles.main}>
        {userId && (
          <PresenceToggle
            className={styles.presence}
            value={presenceValue}
            metalPlaceAvailable={isMetalPlaceWindowActive}
            labels={{
              title: t('presenceTitle'),
              camping: t('presenceCamping'),
              metalPlace: t('presenceMetalPlace'),
            }}
            onChange={handlePresenceChange}
          />
        )}
        {loading ? (
          <p className={styles.empty}>{t('loading')}</p>
        ) : (
          <>
            {latestAnnouncement && myPlan.status !== 'current' && (
              <section className={styles.latestSignal} aria-labelledby="latest-mural-signal">
                <span className={styles.latestSignalKicker} id="latest-mural-signal">
                  {t('latestNews')}
                </span>
                <div className={styles.latestSignalBody}>
                  {(() => {
                    const author = crewUsers.find((crewUser) => crewUser.id === latestAnnouncement.author_id);
                    const authorName = author?.display_name?.trim() || t('anonymous');
                    return (
                      <div className={styles.latestSignalContent}>
                        <p className={styles.latestSignalText}>{latestAnnouncement.content}</p>
                        <div className={styles.latestSignalMeta}>
                          <span className={styles.latestAvatar}>
                            {author?.avatar_url ? (
                              <img src={author.avatar_url} alt="" loading="lazy" />
                            ) : (
                              <span aria-hidden>{authorName.charAt(0).toUpperCase()}</span>
                            )}
                          </span>
                          <span className={styles.latestSignalName}>{authorName}</span>
                          <span className={styles.latestSignalTime}>
                            {relativeAnnouncementTime(latestAnnouncement.created_at, t)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </section>
            )}

            {user && <BadgesDisplay user={user} heading={t('patches')} />}

            <h2 className={styles.sectionTitle}>{t('crewNow')}</h2>
            {crewPlans.length === 0 ? (
              <p className={styles.empty}>{t('crewEmpty')}</p>
            ) : (
              <section className={styles.crewGroups} aria-label={t('crewGridLabel')}>
                {crewGroups.map((group) => {
                  const isUserHere = !!userId && group.members.some((crew) => crew.id === userId);
                  const showWeakButton =
                    isUserHere &&
                    group.kind === 'band' &&
                    myPlan.status === 'current' &&
                    myPlan.band?.id === group.band.id;

                  return (
                    <article
                      className={`${styles.groupCard} ${styles[group.kind]} ${
                        isUserHere ? styles.youAreHere : ''
                      }`}
                      key={group.kind === 'band' ? group.band.id : group.kind}
                    >
                      <div
                        className={styles.locStrip}
                        style={group.kind === 'band' ? { background: stageColor(group.band.stage) } : undefined}
                      />
                      <div className={styles.groupHeader}>
                        <div>
                          <span className={styles.groupKicker}>
                            {group.kind === 'band' && isUserHere && (
                              <span className={styles.liveDot} aria-hidden />
                            )}
                            {groupKicker(group, t, isUserHere)}
                          </span>
                          <h3 className={styles.groupTitle}>{groupTitle(group, t)}</h3>
                          <p className={styles.groupSubtitle}>{groupSubtitle(group, t, metalPlaceConfig)}</p>
                        </div>
                        <div className={styles.groupCount}>
                          {group.members.length}
                          <small className={styles.locCountLabel}>{t('crewCountLabel')}</small>
                        </div>
                      </div>
                      {group.members.length > 0 ? (
                        <ul className={styles.memberList}>
                          {group.members.map((crew) => (
                            <CrewMember crew={crew} isCurrentUser={crew.id === userId} key={crew.id} />
                          ))}
                        </ul>
                      ) : (
                        <p className={styles.groupEmpty}>{emptyGroupMessage(group, t)}</p>
                      )}
                      {showWeakButton && (
                        <div className={styles.groupActions}>
                          <button className={styles.skipButton} onClick={() => handleSkip()}>
                            {t('souFraco')}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
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
