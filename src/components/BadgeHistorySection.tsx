import { useMemo, useState } from 'react';
import type { BadgeConfig } from '../services/badges/types';
import { useUserBadgeHistory } from '../hooks/useUserBadgeHistory';
import { useI18n } from '../lib/i18n';
import Icon from './icons/Icon';
import BadgeDetailModal from './BadgeDetailModal';
import { badgeYearSuffix } from './badges/PatchTile';
import styles from './BadgeHistorySection.module.css';

type BadgeHistorySectionProps = Readonly<{
  userId: string;
}>;

function historyRowToBadge(row: {
  slug: string;
  image_path: string;
  label_key: string;
  festival_year: number;
}): BadgeConfig {
  return {
    slug: row.slug,
    imagePath: row.image_path,
    labelKey: row.label_key,
    descriptionKey: row.label_key,
    condition: { type: 'assigned' },
    year: row.festival_year,
  };
}

export default function BadgeHistorySection({ userId }: BadgeHistorySectionProps) {
  const { t } = useI18n('ProfilePage');
  const { t: tBadges } = useI18n('Badges');
  const { rows, loading } = useUserBadgeHistory(userId);
  const [open, setOpen] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<BadgeConfig | null>(null);

  const grouped = useMemo(() => {
    const byYear = new Map<number, typeof rows>();
    for (const row of rows) {
      const list = byYear.get(row.festival_year) ?? [];
      list.push(row);
      byYear.set(row.festival_year, list);
    }
    return [...byYear.entries()].sort(([a], [b]) => b - a);
  }, [rows]);

  if (loading || rows.length === 0) return null;

  const toggleLabel = open ? t('badgeHistoryCollapse') : t('badgeHistoryExpand');

  return (
    <section className={styles.section} aria-label={t('badgeHistoryTitle')}>
      <button
        type="button"
        className={styles.headerBtn}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className={styles.titleWrap}>
          <span className={styles.title}>{t('badgeHistoryTitle')}</span>
          <span className={styles.count}>· {rows.length}</span>
        </span>
        <span className={styles.headerMeta}>
          <span className={styles.toggleHint}>{toggleLabel}</span>
          <span className={[styles.chevron, open ? styles.chevronOpen : ''].filter(Boolean).join(' ')}>
            <Icon name="chevron" size={14} />
          </span>
        </span>
      </button>

      {open && (
        <div className={styles.body}>
          {grouped.map(([year, yearRows]) => (
            <div key={year} className={styles.yearGroup}>
              <h3 className={styles.yearHeading}>{t('badgeHistoryYear', { year })}</h3>
              <div className={styles.grid}>
                {yearRows.map((row) => {
                  const badge = historyRowToBadge(row);
                  const label = tBadges(badge.labelKey);
                  return (
                    <button
                      key={`${row.festival_year}-${row.slug}`}
                      type="button"
                      className={styles.patchBtn}
                      onClick={() => setSelectedBadge(badge)}
                      aria-label={label}
                      title={label}
                    >
                      <span className={styles.imgWrapper}>
                        <img src={badge.imagePath} alt="" className={styles.patchImg} />
                        <span className={styles.yearChip}>{badgeYearSuffix(year)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          onClose={() => setSelectedBadge(null)}
          showDescription={false}
          showZoom={false}
        />
      )}
    </section>
  );
}
