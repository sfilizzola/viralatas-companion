import { useEffect, useMemo, useState } from 'react';
import BottomNav from '../components/BottomNav';
import OfflineBanner from '../components/OfflineBanner';
import { useActiveFestival } from '../hooks/useActiveFestival';
import { useI18n, type Language } from '../lib/i18n';
import type { Festival } from '../types';
import styles from './FestivalsPage.module.css';

const DATE_LOCALES: Record<Language, string> = {
  br: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
  de: 'de-DE',
};

function formatFestivalDates(festival: Festival, language: Language): string {
  const locale = DATE_LOCALES[language];
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: festival.timezone,
  };
  const start = new Intl.DateTimeFormat(locale, opts).format(new Date(festival.starts_at));
  const end = new Intl.DateTimeFormat(locale, opts).format(new Date(festival.ends_at));
  return `${start} – ${end}`;
}

export default function FestivalsPage() {
  const { language, t } = useI18n('FestivalsPage');
  const { catalog, memberships, activeFestivalId, ready, optIn, optOut, setActive } =
    useActiveFestival();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const membershipIds = useMemo(
    () => new Set(memberships.map((m) => m.festival_id)),
    [memberships],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  function requireOnline(): boolean {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setToast(t('needSignalToSwitch'));
      return false;
    }
    return true;
  }

  async function handleJoin(festivalId: string) {
    if (!requireOnline()) return;
    setBusyId(festivalId);
    try {
      await optIn(festivalId);
      await setActive(festivalId);
    } finally {
      setBusyId(null);
    }
  }

  async function handleLeave(festivalId: string) {
    if (!requireOnline()) return;
    setBusyId(festivalId);
    try {
      await optOut(festivalId);
    } finally {
      setBusyId(null);
    }
  }

  async function handleActivate(festivalId: string) {
    if (festivalId === activeFestivalId) return;
    if (!requireOnline()) return;
    setBusyId(festivalId);
    try {
      await setActive(festivalId);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.page}>
      <OfflineBanner />
      <header className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
      </header>

      <main className={styles.main}>
        {!ready ? (
          <p className={styles.loading}>…</p>
        ) : catalog.length === 0 ? (
          <p className={styles.empty}>{t('empty')}</p>
        ) : (
          <ul className={styles.list}>
            {catalog.map((festival) => {
              const joined = membershipIds.has(festival.id);
              const active = festival.id === activeFestivalId;
              const busy = busyId === festival.id;

              return (
                <li
                  key={festival.id}
                  className={`${styles.card} ${active ? styles.cardActive : ''}`}
                >
                  <div className={styles.cardTop}>
                    <div>
                      <h2 className={styles.name}>{festival.name}</h2>
                      <div className={styles.meta}>
                        <span>{formatFestivalDates(festival, language)}</span>
                        <span>{festival.timezone}</span>
                      </div>
                    </div>
                    <div className={styles.badges}>
                      {active && <span className={`${styles.badge} ${styles.badgeActive}`}>{t('active')}</span>}
                      {joined && !active && <span className={styles.badge}>{t('joined')}</span>}
                    </div>
                  </div>

                  <div className={styles.actions}>
                    {!joined && (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        disabled={busy}
                        onClick={() => void handleJoin(festival.id)}
                      >
                        {t('imGoing')}
                      </button>
                    )}
                    {joined && !active && (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        disabled={busy}
                        onClick={() => void handleActivate(festival.id)}
                      >
                        {t('active')}
                      </button>
                    )}
                    {joined && (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDanger}`}
                        disabled={busy}
                        onClick={() => void handleLeave(festival.id)}
                      >
                        {t('leave')}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          {toast}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
