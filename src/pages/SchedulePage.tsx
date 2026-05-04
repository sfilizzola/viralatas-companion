import { useState, useEffect, useMemo, useCallback, type KeyboardEvent } from 'react';
import type { Band } from '../types';
import { loadBands } from '../lib/db';
import { togglePick } from '../lib/picks';
import { useAuth } from '../hooks/useAuth';
import { useMyPicks } from '../hooks/useMyPicks';
import { usePickCounts } from '../hooks/usePickCounts';
import BottomNav from '../components/BottomNav';
import styles from './SchedulePage.module.css';

const STAGE_COLORS: Record<string, string> = {
  'W:STAGE':       '#c0392b',
  'HARDER STAGE':  '#e67e22',
  'LOUDER STAGE':  '#8e44ad',
  'FASTER STAGE':  '#2980b9',
};

const FESTIVAL_DAYS = [
  { label: 'Qui 30/07', date: '2026-07-30' },
  { label: 'Sex 31/07', date: '2026-07-31' },
  { label: 'Sáb 01/08', date: '2026-08-01' },
];

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
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ day: null, stage: null, upcoming: false });

  const { pickedIds, refresh: refreshPicks } = useMyPicks(userId);
  const pickCounts = usePickCounts();

  useEffect(() => {
    loadBands().then((data) => {
      setBands(data.sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setLoading(false);
    });
  }, []);

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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.title}>Agenda 🤘</span>
      </header>

      <div className={styles.filters}>
        <div className={styles.filterRow}>
          {FESTIVAL_DAYS.map(({ label, date }) => (
            <button
              key={date}
              className={`${styles.pill} ${filters.day === date ? styles.pillActive : ''}`}
              onClick={() => toggleDay(date)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.filterRow}>
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

        <div className={styles.filterRow}>
          <button
            className={`${styles.pill} ${filters.upcoming ? styles.pillActive : ''}`}
            onClick={toggleUpcoming}
          >
            Próximas bandas
          </button>
          {(filters.day || filters.stage || filters.upcoming) && (
            <button
              className={styles.clearBtn}
              onClick={() => setFilters({ day: null, stage: null, upcoming: false })}
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      <main className={styles.list}>
        {loading && <p className={styles.empty}>Carregando agenda...</p>}
        {!loading && filtered.length === 0 && (
          <p className={styles.empty}>Nenhuma banda encontrada.</p>
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
};

export function BandCard({ band, isPicked, count, onToggle, children }: BandCardProps) {
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
          <span className={styles.goingCount}>{count} indo</span>
        </div>
        {children}
      </div>

      <button
        className={`${styles.pickBtn} ${isPicked ? styles.pickBtnActive : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        aria-label={isPicked ? 'Remover pick' : 'Adicionar pick'}
        aria-pressed={isPicked}
      >
        <StarIcon filled={isPicked} />
      </button>
    </article>
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
