import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Band, CrewUser, UserPick } from '../types';
import {
  CREW_USERS_CHANGED_EVENT,
  PICKS_CHANGED_EVENT,
  loadAllUserPicks,
  loadBands,
  loadCrewUsers,
} from '../lib/db';
import { findLivePlan, formatFestivalTime, mapCrewLivePlans, type LivePlan } from '../lib/livePreview';
import { useAuth } from '../hooks/useAuth';
import BottomNav from '../components/BottomNav';
import styles from './RightNowPage.module.css';

function nowLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(date);
}

function planLabel(plan: LivePlan) {
  if (plan.status === 'current') return 'Agora';
  if (plan.status === 'next') return 'Próximo pick';
  return 'Sem pick';
}

function planHint(plan: LivePlan) {
  if (plan.status === 'current') return 'Você deveria estar nesse palco agora.';
  if (plan.status === 'next') return 'Nada rolando agora nos seus picks. Próxima parada:';
  return 'Marca umas bandas na agenda para aparecerem aqui offline.';
}

export default function RightNowPage() {
  const { session, user } = useAuth();
  const userId = session?.user?.id ?? null;
  const userDisplayName =
    (user?.user_metadata?.['display_name'] as string | undefined) ?? user?.email ?? null;

  const [bands, setBands] = useState<Band[]>([]);
  const [picks, setPicks] = useState<UserPick[]>([]);
  const [crewUsers, setCrewUsers] = useState<CrewUser[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);

  const refreshFromCache = useCallback(async () => {
    const [cachedBands, cachedPicks, cachedUsers] = await Promise.all([
      loadBands(),
      loadAllUserPicks(),
      loadCrewUsers(),
    ]);
    setBands(cachedBands.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    setPicks(cachedPicks);
    setCrewUsers(cachedUsers);
    setLoading(false);
  }, []);

  useEffect(() => {
    function handleCacheChange() {
      refreshFromCache();
    }

    window.queueMicrotask(handleCacheChange);
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    window.addEventListener(PICKS_CHANGED_EVENT, handleCacheChange);
    window.addEventListener(CREW_USERS_CHANGED_EVENT, handleCacheChange);

    return () => {
      window.clearInterval(tick);
      window.removeEventListener(PICKS_CHANGED_EVENT, handleCacheChange);
      window.removeEventListener(CREW_USERS_CHANGED_EVENT, handleCacheChange);
    };
  }, [refreshFromCache]);

  const myPlan = useMemo(() => {
    if (!userId) return { status: 'empty', band: null } satisfies LivePlan;
    return findLivePlan(
      bands,
      new Set(picks.filter((pick) => pick.user_id === userId).map((pick) => pick.band_id)),
      now,
    );
  }, [bands, picks, userId, now]);

  const crewPlans = useMemo(() => {
    const users = [...crewUsers];
    if (userId && !users.some((crewUser) => crewUser.id === userId)) {
      users.push({ id: userId, display_name: userDisplayName, avatar_url: null });
    }
    return mapCrewLivePlans(bands, picks, users, now);
  }, [bands, picks, crewUsers, userId, userDisplayName, now]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.title}>Agora</span>
        <span className={styles.timestamp}>{nowLabel(now)} no horário de Wacken</span>
      </header>

      <main className={styles.main}>
        {loading ? (
          <p className={styles.empty}>Carregando plano da crew...</p>
        ) : (
          <>
            <section className={styles.hero} aria-live="polite">
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
                <span className={styles.eyebrow}>{planLabel(myPlan)}</span>
                {myPlan.band ? (
                  <>
                    <h1 className={styles.bandName}>{myPlan.band.name}</h1>
                    <p className={styles.empty}>{planHint(myPlan)}</p>
                    <div className={styles.meta}>
                      <span className={styles.stage}>{myPlan.band.stage}</span>
                      <span className={styles.time}>
                        {formatFestivalTime(myPlan.band.start_time)} - {formatFestivalTime(myPlan.band.end_time)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className={styles.empty}>{planHint(myPlan)}</p>
                )}
              </div>
            </section>

            <h2 className={styles.sectionTitle}>Crew agora</h2>
            {crewPlans.length === 0 ? (
              <p className={styles.empty}>Sem picks da crew no cache ainda.</p>
            ) : (
              <section className={styles.crewGrid} aria-label="Plano atual da crew">
                {crewPlans.map((crew) => (
                  <article className={styles.crewTile} key={crew.id}>
                    <div className={styles.crewTop}>
                      <div className={styles.avatar}>
                        {crew.avatar_url ? (
                          <img className={styles.avatarImg} src={crew.avatar_url} alt="" loading="lazy" />
                        ) : (
                          <span aria-hidden>{crew.label.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className={styles.crewName}>{crew.label}</div>
                        <div className={styles.status}>{planLabel(crew.plan)}</div>
                      </div>
                    </div>
                    <div className={styles.crewBand}>{crew.plan.band?.name ?? 'Sem pick na fila'}</div>
                    {crew.plan.band && (
                      <div className={styles.crewMeta}>
                        {crew.plan.band.stage} - {formatFestivalTime(crew.plan.band.start_time)}
                      </div>
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
