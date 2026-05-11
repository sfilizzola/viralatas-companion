import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '../lib/i18n';
import { stageColor } from '../services/stageColors';
import Icon from './icons/Icon';
import type { BandFilterValue } from './bandFilterValue';
import styles from './BandFilters.module.css';

type DayOption = { date: string; label: string };

type Props = {
  value: BandFilterValue;
  onChange: (next: BandFilterValue) => void;
  days: DayOption[];
  stages: string[];
  genres: string[];
  filteredCount: number;
};

export default function BandFilters({
  value,
  onChange,
  days,
  stages,
  genres,
  filteredCount,
}: Props) {
  const { t } = useI18n('SchedulePage');
  const [sheetOpen, setSheetOpen] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);

  const activeDrawerCount =
    value.stage.length + (value.genre ? 1 : 0) + (value.upcoming ? 1 : 0);
  const hasAnyActive =
    activeDrawerCount > 0 || value.day !== null || value.query.trim().length > 0;

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
    const has = value.stage.includes(stage);
    update('stage', has ? value.stage.filter((s) => s !== stage) : [...value.stage, stage]);
  }

  function clearAll() {
    onChange({
      query: '',
      day: null,
      stage: [],
      genre: null,
      upcoming: false,
    });
  }

  function clearDrawer() {
    onChange({ ...value, stage: [], genre: null, upcoming: false });
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

  return (
    <>
      <div className={styles.stickyBar}>
        <div className={styles.controls}>
          <button
            className={styles.filterTrigger}
            onClick={() => setSheetOpen(true)}
            aria-label={t('filtros')}
          >
            <FunnelIcon />
            <span>{t('filtros')}</span>
            {activeDrawerCount > 0 && (
              <span className={styles.triggerCount}>{activeDrawerCount}</span>
            )}
          </button>

          <input
            className={styles.searchInput}
            type="search"
            placeholder={t('searchPlaceholder')}
            value={value.query}
            onChange={(e) => update('query', e.target.value)}
            aria-label={t('searchPlaceholder')}
          />

          {hasAnyActive && (
            <button className={styles.clearLink} onClick={clearAll}>
              {t('limpar')}
            </button>
          )}
        </div>

        {days.length > 0 && (
          <div className={styles.dayTabs} role="tablist" aria-label={t('dia')}>
            {days.map(({ label, date }, idx) => {
              const d = new Date(date);
              const dayNum = String(d.getUTCDate()).padStart(2, '0');
              const isActive = value.day === date;
              return (
                <button
                  key={date}
                  role="tab"
                  aria-selected={isActive}
                  className={`${styles.dayTab} ${isActive ? styles.dayTabActive : ''}`}
                  onClick={() => toggleDay(date)}
                >
                  <span className={styles.dayTabLabel}>D{idx + 1}</span>
                  <span className={styles.dayTabDate}>{dayNum}</span>
                  <span className={styles.dayTabDow}>{label}</span>
                </button>
              );
            })}
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
            className={styles.drawer}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.grab} />

            <div className={styles.drawerContent}>
              <div className={styles.sectionHead}>
                <h4 className={styles.sectionTitle}>{t('palco')}</h4>
                {value.stage.length > 0 && (
                  <button
                    className={styles.sectionClear}
                    onClick={() => update('stage', [])}
                  >
                    {t('limpar')}
                  </button>
                )}
              </div>
              <div className={styles.pillRow}>
                {stages.map((stage) => {
                  const on = value.stage.includes(stage);
                  const color = stageColor(stage);
                  return (
                    <button
                      key={stage}
                      className={`${styles.stagePill} ${on ? styles.stagePillOn : ''}`}
                      style={{ color: on ? '#fff' : color, background: on ? color : 'transparent' }}
                      onClick={() => toggleStage(stage)}
                      aria-pressed={on}
                    >
                      {stage}
                    </button>
                  );
                })}
              </div>

              {genres.length > 0 && (
                <>
                  <div className={styles.sectionHead}>
                    <h4 className={styles.sectionTitle}>{t('genero')}</h4>
                    {value.genre && (
                      <button
                        className={styles.sectionClear}
                        onClick={() => update('genre', null)}
                      >
                        {t('limpar')}
                      </button>
                    )}
                  </div>
                  <select
                    className={styles.genreSelect}
                    value={value.genre ?? ''}
                    onChange={(e) => update('genre', e.target.value || null)}
                    aria-label={t('genero')}
                  >
                    <option value="">{t('todosGeneros')}</option>
                    {genres.map((genre) => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                </>
              )}

              <div className={styles.sectionHead}>
                <h4 className={styles.sectionTitle}>{t('upcomingBands')}</h4>
              </div>
              <button
                className={`${styles.genrePill} ${value.upcoming ? styles.genrePillOn : ''}`}
                onClick={() => update('upcoming', !value.upcoming)}
                aria-pressed={value.upcoming}
              >
                {t('upcomingBands')}
              </button>

              <div className={styles.drawerActions}>
                {activeDrawerCount > 0 && (
                  <button className={styles.resetBtn} onClick={clearDrawer}>
                    {t('limpar')}
                  </button>
                )}
                <button className={styles.applyBtn} onClick={() => setSheetOpen(false)}>
                  {t('verBandasCount', { count: filteredCount })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FunnelIcon() {
  return <Icon name="filter" size={16} />;
}
