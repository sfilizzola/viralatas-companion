import { useI18n } from '../../lib/i18n';
import { formatTime } from '../../services/bandTime';
import { stageColor } from '../../services/stageColors';
import type { StageRadarEntry } from '../../services/stageRadar';
import styles from './StageRadarSheet.module.css';

type Props = {
  entry: StageRadarEntry;
  userId: string | null;
  onClose: () => void;
};

export default function StageRadarSheet({ entry, userId, onClose }: Props) {
  const { t } = useI18n('StageRadar');
  const band = entry.band;
  if (!band) return null;

  const accent = stageColor(entry.stage);
  const statusLabel = entry.status === 'live' ? t('live') : t('next');
  const timeLabel =
    entry.status === 'live'
      ? t('timeRange', {
          start: formatTime(band.start_time),
          end: formatTime(band.end_time),
        })
      : t('nextFoot', { time: formatTime(band.start_time) });

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={band.name}
        style={
          {
            '--sheet-accent': accent,
            '--sheet-accent-pulse': accent,
            '--sheet-bg': 'var(--bg-surface)',
            '--sheet-header-bg': 'color-mix(in srgb, var(--bg-surface) 85%, transparent)',
            '--sheet-handle': 'rgba(255,255,255,0.15)',
            '--sheet-title': 'rgba(255,255,255,0.95)',
            '--sheet-member-name': 'rgba(255,255,255,0.85)',
            '--sheet-avatar-bg': 'rgba(255,255,255,0.08)',
            '--sheet-avatar-border': 'rgba(255,255,255,0.12)',
            '--sheet-you-bg': 'rgba(255,255,255,0.08)',
          } as React.CSSProperties
        }
      >
        <div className={styles.handleRow}>
          <div className={styles.handle} />
        </div>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <div className={styles.kicker}>
              <span className={styles.stageDot} aria-hidden="true" />
              {statusLabel} · {entry.stage}
            </div>
            <div className={styles.title}>{band.name}</div>
            <div className={styles.subtitle}>{timeLabel}</div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t('close')}>
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <line x1="1" y1="1" x2="9" y2="9" />
              <line x1="9" y1="1" x2="1" y2="9" />
            </svg>
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.goingLabel}>{t('sheetGoing', { count: entry.pickerCount })}</div>
          {entry.pickers.length === 0 ? (
            <div className={styles.emptyPickers}>{t('going', { count: 0 })}</div>
          ) : (
            <ul className={styles.pickerList}>
              {entry.pickers.map((p) => {
                const isYou = p.userId === userId;
                const initial = p.label.charAt(0).toUpperCase();
                return (
                  <li key={p.userId} className={styles.pickerRow}>
                    <div className={`${styles.avatar} ${isYou ? styles.avatarYou : ''}`}>
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" loading="lazy" />
                      ) : (
                        <span aria-hidden>{initial}</span>
                      )}
                    </div>
                    <span className={styles.pickerName}>
                      {p.label}
                      {isYou && <span className={styles.youTag}>{t('you')}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
