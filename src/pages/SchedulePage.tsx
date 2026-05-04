import { useState, useEffect, useMemo } from 'react';
import type { Band } from '../types';
import { loadBands } from '../lib/db';
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
  // A band belongs to the day its set starts on (in local calendar date, CEST)
  // start_time is stored as timestamptz; we compare the local date portion
  const d = new Date(band.start_time);
  // Convert to CEST (UTC+2) for grouping
  const cest = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  // After midnight but before 04:00 still belongs to the previous festival day
  const hour = cest.getUTCHours();
  if (hour < 4) {
    cest.setUTCDate(cest.getUTCDate() - 1);
  }
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
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ day: null, stage: null, upcoming: false });

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
              style={filters.stage === stage ? { background: STAGE_COLORS[stage] ?? 'var(--accent)', borderColor: 'transparent' } : {}}
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
        {loading && (
          <p className={styles.empty}>Carregando agenda...</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className={styles.empty}>Nenhuma banda encontrada.</p>
        )}
        {filtered.map((band) => (
          <BandCard key={band.id} band={band} />
        ))}
      </main>

      <div className={styles.navSpacer} />
      <BottomNav />
    </div>
  );
}

function BandCard({ band }: { band: Band }) {
  const stageColor = STAGE_COLORS[band.stage] ?? 'var(--accent)';
  const initial = band.name.charAt(0).toUpperCase();

  return (
    <article className={styles.card}>
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
        </div>
      </div>
    </article>
  );
}
