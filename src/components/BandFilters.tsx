import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '../lib/i18n';
import { stageColor } from '../lib/stageColors';
import type { BandFilterValue } from './bandFilterValue';
import styles from './BandFilters.module.css';

type DayOption = { date: string; label: string };

type Props = {
  value: BandFilterValue;
  onChange: (next: BandFilterValue) => void;
  days: DayOption[];
  stages: string[];
  genres: string[];
};

export default function BandFilters({ value, onChange, days, stages, genres }: Props) {
  const { t } = useI18n('SchedulePage');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);

  const hasActive =
    value.day || value.stage || value.genre || value.upcoming || value.query.trim().length > 0;

  useEffect(() => {
    if (!sheetOpen) return;
    const handleEsc = (e: Event) => {
      const ke = e as unknown as KeyboardEvent;
      if (ke.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [sheetOpen]);

  function update<K extends keyof BandFilterValue>(key: K, next: BandFilterValue[K]) {
    onChange({ ...value, [key]: next });
  }

  function toggleDay(date: string) {
    update('day', value.day === date ? null : date);
  }

  function toggleStage(stage: string) {
    update('stage', value.stage === stage ? null : stage);
  }

  function toggleGenre(genre: string) {
    update('genre', value.genre === genre ? null : genre);
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) setSheetOpen(false);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const endY = e.changedTouches[0].clientY;
    if (endY > touchStartY.current + 50) setSheetOpen(false);
  }

  function getActiveTags() {
    const tags: string[] = [];
    if (value.day) {
      const label = days.find((d) => d.date === value.day)?.label;
      if (label) tags.push(label);
    }
    if (value.stage) tags.push(value.stage);
    if (value.genre) tags.push(value.genre);
    if (value.upcoming) tags.push(t('upcomingBands'));
    if (value.query.trim()) tags.push(`"${value.query.trim()}"`);
    return tags;
  }

  return (
    <>
      <div className={styles.stickyBar}>
        <button className={styles.filtersButton} onClick={() => setSheetOpen(true)}>
          <FunnelIcon />
          <span>{t('filtros')}</span>
        </button>

        <input
          className={styles.searchInput}
          type="search"
          placeholder={t('searchPlaceholder')}
          value={value.query}
          onChange={(e) => update('query', e.target.value)}
          aria-label={t('searchPlaceholder')}
        />

        {hasActive && (
          <button
            className={styles.clearLink}
            onClick={() =>
              onChange({
                query: '',
                day: null,
                stage: null,
                genre: null,
                upcoming: false,
              })
            }
          >
            {t('limpar')}
          </button>
        )}

        {hasActive && (
          <div className={styles.activeTags}>
            {getActiveTags().map((tag, i) => (
              <span key={i} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
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
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.sheetHandle} />

            <div className={styles.sheetContent}>
              <h2 className={styles.sectionTitle}>{t('dia')}</h2>
              <div className={styles.chipRow}>
                <button
                  className={`${styles.pill} ${!value.day ? styles.pillActive : ''}`}
                  onClick={() => update('day', null)}
                >
                  {t('todos')}
                </button>
                {days.map(({ label, date }) => (
                  <button
                    key={date}
                    className={`${styles.pill} ${value.day === date ? styles.pillActive : ''}`}
                    onClick={() => toggleDay(date)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <h2 className={styles.sectionTitle}>{t('palco')}</h2>
              <div className={styles.stageRow}>
                {stages.map((stage) => (
                  <button
                    key={stage}
                    className={`${styles.pill} ${value.stage === stage ? styles.pillActive : ''}`}
                    style={
                      value.stage === stage
                        ? { background: stageColor(stage), borderColor: 'transparent' }
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
                  {genres.length > 0 && (
                    <>
                      <h2 className={styles.sectionTitle}>{t('genero')}</h2>
                      <div className={styles.genreScroll}>
                        {genres.map((genre) => (
                          <button
                            key={genre}
                            className={`${styles.pill} ${value.genre === genre ? styles.pillActive : ''}`}
                            onClick={() => toggleGenre(genre)}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <h2 className={styles.sectionTitle}>{t('upcomingBands')}</h2>
                  <button
                    className={`${styles.pill} ${value.upcoming ? styles.pillActive : ''}`}
                    onClick={() => update('upcoming', !value.upcoming)}
                  >
                    {t('upcomingBands')}
                  </button>
                </div>
              )}

              <button className={styles.applyBtn} onClick={() => setSheetOpen(false)}>
                {t('verBandas')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
