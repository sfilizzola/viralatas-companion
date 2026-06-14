import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '../lib/i18n';
import { sortFilterGenres } from '../services/genreGuide';
import { stageColor } from '../services/stageColors';
import GenreGuideCollapsible from './GenreGuideCollapsible';
import ViraLataFilterSelect from './ViraLataFilterSelect';
import Icon, { type IconName } from './icons/Icon';
import type { BandFilterValue } from './bandFilterValue';
import type { BandAttendee } from '../hooks/useBandAttendees';
import styles from './BandFilters.module.css';

type DayOption = { date: string; label: string };

type Props = {
  value: BandFilterValue;
  onChange: (next: BandFilterValue) => void;
  days: DayOption[];
  stages: string[];
  genres: string[];
  filteredCount: number;
  crewWithPicks: BandAttendee[];
  crewPickCounts: Record<string, number>;
  viewedUserPickCount: number;
};

const SORT_ICONS: Record<BandFilterValue['sortOrder'], IconName> = {
  'time-asc': 'sort-time-asc',
  'time-desc': 'sort-time-desc',
  'alpha': 'sort-alpha',
};

const DISPLAY_NAME_MAX = 20;

function trimDisplayName(name: string, maxLen = DISPLAY_NAME_MAX): string {
  if (name.length <= maxLen) return name;
  return `${name.slice(0, maxLen - 1)}…`;
}

export default function BandFilters({
  value,
  onChange,
  days,
  stages,
  genres,
  filteredCount,
  crewWithPicks,
  crewPickCounts,
  viewedUserPickCount,
}: Props) {
  const { t } = useI18n('SchedulePage');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const sortWrapperRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);

  const activeDrawerCount =
    value.stage.length + (value.genre ? 1 : 0) + (value.upcoming ? 1 : 0) + (value.userId ? 1 : 0);
  const hasAnyActive =
    activeDrawerCount > 0 || value.day !== null || value.query.trim().length > 0;
  const hasNonDefaultSort = value.sortOrder !== 'time-asc';

  useEffect(() => {
    if (!sheetOpen) return;
    const handleEsc = (e: Event) => {
      const ke = e as unknown as KeyboardEvent;
      if (ke.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [sheetOpen]);

  useEffect(() => {
    if (!sheetOpen) return;
    const main = document.querySelector('main');
    const prevMainOverflow = main?.style.overflow ?? '';
    const prevBodyOverflow = document.body.style.overflow;
    if (main) main.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      if (main) main.style.overflow = prevMainOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [sheetOpen]);

  useEffect(() => {
    if (!sortOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (sortWrapperRef.current && !sortWrapperRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [sortOpen]);

  function update<K extends keyof BandFilterValue>(key: K, next: BandFilterValue[K]) {
    onChange({ ...value, [key]: next });
  }

  function toggleDay(date: string) {
    const next = value.day === date ? null : date;
    update('day', next);
    const idx = days.findIndex((d) => d.date === (next ?? date));
    if (next && idx !== -1) {
      globalThis.history.replaceState(null, '', `#day-${idx + 1}`);
    } else {
      globalThis.history.replaceState(null, '', globalThis.location.pathname + globalThis.location.search);
    }
  }

  function toggleStage(stage: string) {
    const has = value.stage.includes(stage);
    update('stage', has ? value.stage.filter((s) => s !== stage) : [...value.stage, stage]);
  }

  function toggleGenre(genre: string) {
    update('genre', value.genre === genre ? null : genre);
  }

  const sortedGenres = sortFilterGenres(genres);

  function clearAll() {
    onChange({
      query: '',
      day: null,
      stage: [],
      genre: null,
      upcoming: false,
      sortOrder: value.sortOrder,
      userId: null,
    });
  }

  function clearDrawer() {
    onChange({ ...value, stage: [], genre: null, upcoming: false, userId: null });
  }

  function selectSort(order: BandFilterValue['sortOrder']) {
    update('sortOrder', order);
    setSortOpen(false);
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

  const viewedUser = crewWithPicks.find((u) => u.id === value.userId);

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

          <div className={styles.searchWrap}>
            <input
              className={styles.searchInput}
              type="search"
              placeholder={t('searchPlaceholder')}
              value={value.query}
              onChange={(e) => update('query', e.target.value)}
              aria-label={t('searchPlaceholder')}
            />
            {value.query.trim().length > 0 && (
              <button
                className={styles.searchClear}
                type="button"
                aria-label={t('limpar')}
                onClick={() => update('query', '')}
              >
                ×
              </button>
            )}
          </div>

          {hasAnyActive && (
            <button className={styles.clearLink} onClick={clearAll}>
              {t('limpar')}
            </button>
          )}
        </div>

        {viewedUser && (
          <div className={styles.viewingBanner}>
            <span className={styles.viewingBannerName} title={viewedUser.label}>
              {t('viewingPicksOf', { name: trimDisplayName(viewedUser.label) })}
            </span>
            <span className={styles.viewingBannerCount}>
              {t('viraLataPickCount', { count: viewedUserPickCount })}
            </span>
          </div>
        )}

        {days.length > 0 && (
          <div className={styles.dayTabsRow}>
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

            <div className={styles.sortWrapper} ref={sortWrapperRef}>
              <button
                className={`${styles.sortBtn} ${hasNonDefaultSort ? styles.sortBtnActive : ''}`}
                onClick={() => setSortOpen((o) => !o)}
                aria-label={t('sortLabel')}
                aria-expanded={sortOpen}
              >
                <Icon name={SORT_ICONS[value.sortOrder]} size={18} />
                {hasNonDefaultSort && <span className={styles.sortDot} aria-hidden="true" />}
              </button>

              {sortOpen && (
                <div className={styles.sortPopover} role="listbox" aria-label={t('sortLabel')}>
                  <button
                    className={`${styles.sortOption} ${value.sortOrder === 'time-asc' ? styles.sortOptionActive : ''}`}
                    onClick={() => selectSort('time-asc')}
                    aria-label={t('sortTimeAsc')}
                    role="option"
                    aria-selected={value.sortOrder === 'time-asc'}
                  >
                    <Icon name="sort-time-asc" size={20} />
                  </button>
                  <button
                    className={`${styles.sortOption} ${value.sortOrder === 'time-desc' ? styles.sortOptionActive : ''}`}
                    onClick={() => selectSort('time-desc')}
                    aria-label={t('sortTimeDesc')}
                    role="option"
                    aria-selected={value.sortOrder === 'time-desc'}
                  >
                    <Icon name="sort-time-desc" size={20} />
                  </button>
                  <button
                    className={`${styles.sortOption} ${value.sortOrder === 'alpha' ? styles.sortOptionActive : ''}`}
                    onClick={() => selectSort('alpha')}
                    aria-label={t('sortAlpha')}
                    role="option"
                    aria-selected={value.sortOrder === 'alpha'}
                  >
                    <Icon name="sort-alpha" size={20} />
                  </button>
                </div>
              )}
            </div>
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
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.grab} />

            <div className={styles.drawerContent}>
              {crewWithPicks.length > 0 && (
                <>
                  <div className={styles.sectionHead}>
                    <h4 className={styles.sectionTitle}>{t('viraLata')}</h4>
                    {value.userId && (
                      <button
                        className={styles.sectionClear}
                        onClick={() => update('userId', null)}
                      >
                        {t('limpar')}
                      </button>
                    )}
                  </div>
                  <div className={styles.viraLataField}>
                    <ViraLataFilterSelect
                      value={value.userId}
                      onChange={(userId) => update('userId', userId)}
                      members={crewWithPicks}
                      pickCounts={crewPickCounts}
                    />
                  </div>
                </>
              )}

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
                  <div className={styles.pillRow}>
                    {sortedGenres.map((genre) => {
                      const on = value.genre === genre;
                      return (
                        <button
                          key={genre}
                          className={`${styles.genrePill} ${on ? styles.genrePillOn : ''}`}
                          onClick={() => toggleGenre(genre)}
                          aria-pressed={on}
                        >
                          {genre}
                        </button>
                      );
                    })}
                  </div>
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

              {genres.length > 0 && <GenreGuideCollapsible />}
            </div>

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
      )}
    </>
  );
}

function FunnelIcon() {
  return <Icon name="filter" size={16} />;
}
