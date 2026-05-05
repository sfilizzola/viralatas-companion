import { useState, useEffect, useMemo, useCallback, useRef, type KeyboardEvent } from 'react';
import type { Band } from '../types';
import { loadBands } from '../lib/db';
import { togglePick } from '../lib/picks';
import { useAuth } from '../hooks/useAuth';
import { useMyPicks } from '../hooks/useMyPicks';
import { usePickCounts } from '../hooks/usePickCounts';
import { useI18n } from '../lib/i18n';
import BottomNav from '../components/BottomNav';
import styles from './SchedulePage.module.css';

const STAGE_COLORS: Record<string, string> = {
  'W.E.T.':              '#c0392b',
  'Harder':              '#e67e22',
  'Louder':              '#8e44ad',
  'Faster':              '#2980b9',
  'Headbangers':         '#16a085',
  'Wasteland':           '#2c3e50',
  'Wackinger':           '#95a5a6',
  'Welcome to the Jungle': '#f39c12',
};

function bandDay(band: Band): string {
  const d = new Date(band.start_time);
  const cest = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  const hour = cest.getUTCHours();
  if (hour < 4) cest.setUTCDate(cest.getUTCDate() - 1);
  return cest.toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const cest = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  const h = String(cest.getUTCHours()).padStart(2, '0');
  const m = String(cest.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

type Filters = {
  day: string | null;
  stage: string | null;
  upcoming: boolean;
};

export default function SchedulePage() {
  const { t } = useI18n('SchedulePage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ day: null, stage: null, upcoming: false });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);

  const { pickedIds, refresh: refreshPicks } = useMyPicks(userId);
  const pickCounts = usePickCounts();

  const getDayLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    return t(dayNames[dayOfWeek]);
  };

  const festivalDays = useMemo(
    () => {
      const uniqueDays = [...new Set(bands.map(bandDay))].sort();
      return uniqueDays.map((date) => ({
        label: getDayLabel(date),
        date,
      }));
    },
    [bands, t],
  );

  useEffect(() => {
    loadBands().then((data) => {
      setBands(data.sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const handleEsc = (e: Event) => {
      const ke = e as unknown as KeyboardEvent;
      if (ke.key === 'Escape') {
        closeSheet();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [sheetOpen]);

  const stages = useMemo(
    () => [...new Set(bands.map((b) => b.stage))].sort(),
    [bands],
  );

  const filtered = useMemo(() => {
    const now = new Date();
    return bands.filter((b) => {
      if (filters.day && bandDay(b) !== filters.day) return false;
      if (filters.stage && b.stage !== filters.stage) return false;
      if (filters.upcoming && new Date(b.end_time) <= now) return false;
      return true;
    });
  }, [bands, filters]);

  const handleToggle = useCallback(
    async (bandId: string) => {
      if (!userId) return;
      await togglePick(userId, bandId, pickedIds.has(bandId));
      await refreshPicks();
    },
    [userId, pickedIds, refreshPicks],
  );

  function toggleDay(date: string) {
    setFilters((f) => ({ ...f, day: f.day === date ? null : date }));
  }

  function toggleStage(stage: string) {
    setFilters((f) => ({ ...f, stage: f.stage === stage ? null : stage }));
  }

  function toggleUpcoming() {
    setFilters((f) => ({ ...f, upcoming: !f.upcoming }));
  }

  const hasActiveFilters = filters.day || filters.stage || filters.upcoming;

  function closeSheet() {
    setSheetOpen(false);
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) {
      closeSheet();
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const touchEndY = e.changedTouches[0].clientY;
    if (touchEndY > touchStartY.current + 50) {
      closeSheet();
    }
  }

  function getActiveFilterTags() {
    const tags: string[] = [];
    if (filters.day) {
      const dayLabel = festivalDays.find((d) => d.date === filters.day)?.label;
      if (dayLabel) tags.push(dayLabel);
    }
    if (filters.stage) tags.push(filters.stage);
    if (filters.upcoming) tags.push(t('upcomingBands'));
    return tags;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
      </header>

      <div className={styles.stickyBar}>
        <button className={styles.filtersButton} onClick={() => setSheetOpen(true)}>
          <FunnelIcon />
          <span>{t('filtros')}</span>
        </button>

        {hasActiveFilters && (
          <div className={styles.activeTags}>
            {getActiveFilterTags().map((tag, i) => (
              <span key={i} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {hasActiveFilters && (
          <button className={styles.clearLink} onClick={() => setFilters({ day: null, stage: null, upcoming: false })}>
            {t('limpar')}
          </button>
        )}
      </div>

      {sheetOpen && (
        <div
          className={styles.backdrop}
          ref={backdropRef}
          onClick={handleBackdropClick}
          role="presentation"
        >
          <div
            className={styles.bottomSheet}
            ref={sheetRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.sheetHandle} />

            <div className={styles.sheetContent}>
              <h2 className={styles.sectionTitle}>{t('dia')}</h2>
              <div className={styles.dayChips}>
                <button
                  className={`${styles.pill} ${!filters.day ? styles.pillActive : ''}`}
                  onClick={() => setFilters((f) => ({ ...f, day: null }))}
                >
                  {t('todos')}
                </button>
                {festivalDays.map(({ label, date }) => (
                  <button
                    key={date}
                    className={`${styles.pill} ${filters.day === date ? styles.pillActive : ''}`}
                    onClick={() => toggleDay(date)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <h2 className={styles.sectionTitle}>{t('palco')}</h2>
              <div className={styles.stageChips}>
                {stages.map((stage) => (
                  <button
                    key={stage}
                    className={`${styles.pill} ${filters.stage === stage ? styles.pillActive : ''}`}
                    style={
                      filters.stage === stage
                        ? { background: STAGE_COLORS[stage] ?? 'var(--accent)', borderColor: 'transparent' }
                        : {}
                    }
                    onClick={() => toggleStage(stage)}
                  >
                    {stage}
                  </button>
                ))}
              </div>

              <div className={styles.advancedToggle}>
                <button
                  className={`${styles.advancedButton} ${showAdvanced ? styles.advancedActive : ''}`}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {t('avancado')}
                </button>
              </div>

              {showAdvanced && (
                <div className={styles.advancedContent}>
                  <h2 className={styles.sectionTitle}>{t('upcomingBands')}</h2>
                  <button
                    className={`${styles.pill} ${filters.upcoming ? styles.pillActive : ''}`}
                    onClick={toggleUpcoming}
                  >
                    {t('upcomingBands')}
                  </button>
                </div>
              )}

              <button className={styles.verBandasBtn} onClick={closeSheet}>
                {t('verBandas')}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={styles.list}>
        {loading && <p className={styles.empty}>{t('loadingSchedule')}</p>}
        {!loading && filtered.length === 0 && (
          <p className={styles.empty}>{t('emptySchedule')}</p>
        )}
        {filtered.map((band) => (
          <BandCard
            key={band.id}
            band={band}
            isPicked={pickedIds.has(band.id)}
            count={pickCounts[band.id] ?? 0}
            onToggle={() => handleToggle(band.id)}
          />
        ))}
      </main>

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}

type BandCardProps = {
  band: Band;
  isPicked: boolean;
  count: number;
  onToggle: () => void;
  children?: React.ReactNode;
  hidePickButton?: boolean;
};

export function BandCard({ band, isPicked, count, onToggle, children, hidePickButton = false }: BandCardProps) {
  const { t } = useI18n('SchedulePage');
  const stageColor = STAGE_COLORS[band.stage] ?? 'var(--accent)';
  const initial = band.name.charAt(0).toUpperCase();

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  }

  return (
    <article
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      aria-pressed={isPicked}
    >
      <div className={styles.cardImage}>
        {band.image_url ? (
          <img src={band.image_url} alt={band.name} className={styles.img} loading="lazy" />
        ) : (
          <div className={styles.imgPlaceholder} style={{ background: stageColor }}>
            {initial}
          </div>
        )}
      </div>

      <div className={styles.cardBody}>
        <h2 className={styles.bandName}>{band.name}</h2>
        {band.genre && <p className={styles.genre}>{band.genre}</p>}
        <div className={styles.meta}>
          <span className={styles.stageBadge} style={{ background: stageColor }}>
            {band.stage}
          </span>
          <span className={styles.time}>
            {formatTime(band.start_time)} – {formatTime(band.end_time)}
          </span>
          <span className={styles.goingCount}>{t('goingCount', { count })}</span>
        </div>
        {children}
      </div>

      {!hidePickButton && (
        <button
          className={`${styles.pickBtn} ${isPicked ? styles.pickBtnActive : ''}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          aria-label={isPicked ? t('removePick') : t('addPick')}
          aria-pressed={isPicked}
        >
          <StarIcon filled={isPicked} />
        </button>
      )}
    </article>
  );
}

function FunnelIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
