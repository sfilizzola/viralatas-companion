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
import { setCampingStatus, syncCrewPresence } from '../lib/presence';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../lib/i18n';
import BottomNav from '../components/BottomNav';
import styles from './RightNowPage.module.css';

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
  if (group.kind === 'camping') return t('campingGroupTitle');
  return t('lostGroupTitle');
}

function groupKicker(group: CrewLiveGroup, t: (key: string, values?: Record<string, string | number>) => string) {
  if (group.kind === 'band') {
    return t('bandGroupKicker', {
      stage: group.band.stage,
      start: formatFestivalTime(group.band.start_time),
      end: formatFestivalTime(group.band.end_time),
    });
  }
  if (group.kind === 'camping') return t('campingGroupKicker');
  return t('lostGroupKicker');
}

function emptyGroupMessage(group: CrewLiveGroup, t: (key: string) => string) {
  return group.kind === 'camping' ? t('campingGroupEmpty') : t('lostGroupEmpty');
}

function CrewMember({ crew }: { crew: CrewLivePlan }) {
  return (
    <li className={styles.memberPill}>
      <span className={styles.avatar}>
        {crew.avatar_url ? (
          <img className={styles.avatarImg} src={crew.avatar_url} alt="" loading="lazy" />
        ) : (
          <span aria-hidden>{crew.label.charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className={styles.memberText}>
        <span className={styles.crewName}>{crew.label}</span>
        {!crew.plan.band && crew.plan.nextBand && (
          <span className={styles.memberMeta}>
            {formatFestivalTime(crew.plan.nextBand.start_time)} - {crew.plan.nextBand.name}
          </span>
        )}
      </span>
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
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);

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
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    window.addEventListener(PICKS_CHANGED_EVENT, handleCacheChange);
    window.addEventListener(CREW_USERS_CHANGED_EVENT, handleCacheChange);
    window.addEventListener(PRESENCE_CHANGED_EVENT, handleCacheChange);
    window.addEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handleCacheChange);

    return () => {
      window.clearInterval(tick);
      window.removeEventListener(PICKS_CHANGED_EVENT, handleCacheChange);
      window.removeEventListener(CREW_USERS_CHANGED_EVENT, handleCacheChange);
      window.removeEventListener(PRESENCE_CHANGED_EVENT, handleCacheChange);
      window.removeEventListener(ANNOUNCEMENTS_CHANGED_EVENT, handleCacheChange);
    };
  }, [refreshFromCache]);

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

  const myRawPlan = useMemo(() => {
    if (!userId) return { status: 'empty', band: null } satisfies LivePlan;
    return findLivePlan(
      bands,
      new Set(picks.filter((pick) => pick.user_id === userId).map((pick) => pick.band_id)),
      now,
    );
  }, [bands, picks, userId, now]);

  const myPresence = useMemo(
    () => (userId ? presence.find((item) => item.user_id === userId) : undefined),
    [presence, userId],
  );

  const isCamping = myPresence?.is_camping ?? false;

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
    return mapCrewLivePlans(bands, picks, users, presence, now);
  }, [bands, picks, crewUsers, presence, userId, userDisplayName, now]);

  const crewGroups = useMemo(() => groupCrewLivePlans(crewPlans), [crewPlans]);

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
                  </div>
                </>
              )}
            </section>

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
                    {group.kind === 'band' && (
                      group.band.image_url ? (
                        <img className={styles.groupImage} src={group.band.image_url} alt="" loading="lazy" />
                      ) : (
                        <div className={styles.groupImage} aria-hidden>
                          {group.band.name.charAt(0).toUpperCase()}
                        </div>
                      )
                    )}
                    <div className={styles.groupHeader}>
                      <div>
                        <span className={styles.groupKicker}>{groupKicker(group, t)}</span>
                        <h3 className={styles.groupTitle}>{groupTitle(group, t)}</h3>
                      </div>
                      <span className={styles.groupCount}>
                        {t('crewCount', { count: group.members.length })}
                      </span>
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

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}
