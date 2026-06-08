import type { Band } from '../types';
import { buildStageScheduleSnapshot } from '../services/stageSchedule';
import { stageColor } from '../services/stageColors';
import { formatTime } from '../services/bandTime';
import { useI18n } from '../lib/i18n';
import styles from './StageScheduleSheet.module.css';

type Props = {
  bands: Band[];
  now: Date;
  previewTime?: Date | null;
  onClose: () => void;
  onBandSelect: (bandId: string) => void;
};

/** Stages where the stage color is bright enough to need dark ribbon text. */
const DARK_RIBBON_TEXT = new Set(['Harder', 'Wackinger', 'Welcome to the Jungle']);

function ribbonTextColor(stage: string): string {
  return DARK_RIBBON_TEXT.has(stage) ? '#111' : '#fff';
}

export default function StageScheduleSheet({ bands, now, previewTime, onClose, onBandSelect }: Props) {
  const { t } = useI18n('StageScheduleSheet');
  const entries = buildStageScheduleSnapshot(bands, now);
  const isPreview = previewTime != null;

  function handleTileClick(bandId: string) {
    onBandSelect(bandId);
    onClose();
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={t('sheetTitle')}
      >
        <div className={styles.handleRow}>
          <div className={styles.handle} />
        </div>

        <div className={isPreview ? `${styles.header} ${styles.headerPreview}` : styles.header}>
          <div>
            <div className={styles.title}>{t('sheetTitle')}</div>
            <div className={isPreview ? `${styles.subtitle} ${styles.subtitlePreview}` : styles.subtitle}>
              {isPreview
                ? t('sheetSubtitlePreview', { time: formatTime(previewTime.toISOString()) })
                : t('sheetSubtitle')}
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            type="button"
            aria-label={t('close')}
          >
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <line x1="1" y1="1" x2="9" y2="9" />
              <line x1="9" y1="1" x2="1" y2="9" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.grid}>
            {entries.map(({ stage, band, status }) => {
              const isLive = status === 'current';
              const color = stageColor(stage);

              return (
                <button
                  key={band.id}
                  className={`${styles.tile} ${isLive ? styles.tileLive : styles.tileNext}`}
                  style={{ '--tile-color': color, '--ribbon-text': ribbonTextColor(stage) } as React.CSSProperties}
                  onClick={() => handleTileClick(band.id)}
                  type="button"
                  aria-label={
                    isLive
                      ? t('tileAriaLive', { stage, band: band.name, start: formatTime(band.start_time), end: formatTime(band.end_time) })
                      : t('tileAriaNext', { stage, band: band.name, start: formatTime(band.start_time) })
                  }
                >
                  <div className={styles.tileBar} />

                  {isLive && (
                    <div className={styles.ribbonWrap} aria-hidden="true">
                      <div className={styles.ribbon}>{t('live')}</div>
                    </div>
                  )}

                  <div className={styles.tileBody}>
                    <div className={styles.stageName}>{stage}</div>
                    <div className={styles.bandName}>{band.name}</div>
                    <div className={styles.footer}>
                      {isLive ? (
                        <>
                          <span className={styles.liveDot} aria-hidden="true" />
                          <span className={styles.tileTime}>
                            {formatTime(band.start_time)} – {formatTime(band.end_time)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={styles.nextLabel}>{t('next')}</span>
                          <span className={styles.tileTime}>{formatTime(band.start_time)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
