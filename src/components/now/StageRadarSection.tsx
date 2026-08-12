import { useI18n } from '../../lib/i18n';
import { formatTime } from '../../services/bandTime';
import { stageColor } from '../../services/stageColors';
import type { StageRadarEntry } from '../../services/stageRadar';
import styles from './StageRadarSection.module.css';

type Props = {
  entries: StageRadarEntry[];
  onSelect: (entry: StageRadarEntry) => void;
};

/** Stages where the ribbon needs dark text (same set as StageScheduleSheet). */
const DARK_RIBBON_TEXT = new Set(['Harder', 'Wackinger', 'Welcome to the Jungle']);

export default function StageRadarSection({ entries, onSelect }: Props) {
  const { t } = useI18n('StageRadar');

  if (entries.length === 0) return null;

  return (
    <section className={styles.section} aria-label={t('sectionTitle')}>
      <h2 className={styles.title}>{t('sectionTitle')}</h2>
      <ul className={styles.grid}>
        {entries.map((entry) => {
          const color = stageColor(entry.stage);
          const isDone = entry.status === 'done';
          const isLive = entry.status === 'live';
          const ribbonText = DARK_RIBBON_TEXT.has(entry.stage) ? '#111' : '#fff';

          const footTime =
            isLive && entry.band
              ? t('timeRange', {
                  start: formatTime(entry.band.start_time),
                  end: formatTime(entry.band.end_time),
                })
              : entry.status === 'next' && entry.band
                ? t('nextFoot', { time: formatTime(entry.band.start_time) })
                : null;

          const aria =
            isLive && entry.band
              ? t('rowAriaLive', {
                  stage: entry.stage,
                  band: entry.band.name,
                  count: entry.pickerCount,
                })
              : entry.status === 'next' && entry.band
                ? t('rowAriaNext', {
                    stage: entry.stage,
                    band: entry.band.name,
                    time: formatTime(entry.band.start_time),
                    count: entry.pickerCount,
                  })
                : t('rowAriaDone', { stage: entry.stage });

          const tileClass = [
            styles.tile,
            isLive ? styles.tileLive : '',
            entry.status === 'next' ? styles.tileNext : '',
            isDone ? styles.tileDone : '',
          ]
            .filter(Boolean)
            .join(' ');

          const style = {
            '--tile-color': color,
            '--ribbon-text': ribbonText,
          } as React.CSSProperties;

          const inner = (
            <>
              <div className={styles.bar} />
              {isLive && (
                <div className={styles.ribbonWrap} aria-hidden="true">
                  <div className={styles.ribbon}>{t('live')}</div>
                </div>
              )}
              <div className={styles.inner}>
                <div className={styles.stageName}>{entry.stage}</div>
                {entry.band ? (
                  <div className={styles.bandName}>{entry.band.name}</div>
                ) : (
                  <div className={styles.doneEmpty}>{t('doneEmpty')}</div>
                )}
                <div className={styles.footer}>
                  {footTime ? (
                    <span className={styles.footTime}>
                      {isLive && <span className={styles.liveDot} aria-hidden="true" />}
                      {footTime}
                    </span>
                  ) : (
                    <span />
                  )}
                  {!isDone && (
                    <span className={styles.going}>{t('going', { count: entry.pickerCount })}</span>
                  )}
                </div>
              </div>
            </>
          );

          return (
            <li key={entry.stage} className={styles.item}>
              {isDone ? (
                <div className={tileClass} style={style} aria-label={aria}>
                  {inner}
                </div>
              ) : (
                <button
                  type="button"
                  className={tileClass}
                  style={style}
                  aria-label={aria}
                  onClick={() => onSelect(entry)}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
