import { useRef, useCallback } from 'react';
import { useI18n } from '../../lib/i18n';
import styles from './TimelineScrubber.module.css';

interface Props {
  now: Date;
  previewTime: Date | null;
  windowStart: Date;
  windowEnd: Date;
  isActive: boolean;
  onPreview: (t: Date) => void;
  onClear: () => void;
}

/** Format a Date to HH:MM in CEST. */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  });
}

/** Convert a fractional position (0..1) to a Date within the window. */
export function timeFromFraction(
  fraction: number,
  windowStart: Date,
  windowEnd: Date,
): Date {
  const ms =
    windowStart.getTime() +
    Math.max(0, Math.min(1, fraction)) *
      (windowEnd.getTime() - windowStart.getTime());
  return new Date(ms);
}

/** Convert a Date to a fractional position (0..1) within the window. */
function fractionFromTime(date: Date, windowStart: Date, windowEnd: Date): number {
  const span = windowEnd.getTime() - windowStart.getTime();
  return (date.getTime() - windowStart.getTime()) / span;
}

/**
 * VikingSkull — 44×50px evil carved-bone skull handle.
 *
 * The "evil" comes from anatomy, not decoration:
 * - Angular eye sockets where inner corners angle DOWN (furrowed brow effect)
 * - Heavy brow ridge overlay pressing toward center
 * - Irregular, damaged teeth (not uniform lines)
 * - Multiple battle cracks
 * - Weathered bone palette, no golden softness
 */
function VikingSkull() {
  return (
    <svg width="44" height="50" viewBox="0 0 44 50" fill="none" aria-hidden="true">
      {/* ── Main skull silhouette ── */}
      <path
        d="M22 1.5 C11 1.5 3.5 9.5 3.5 18.5
           C3.5 25 6.5 30 11.5 32.5
           L11.5 35.5 C11.5 36.5 12.5 37 13.5 37
           L13.5 38 L14.5 38
           L14.5 46 L29.5 46
           L29.5 38 L30.5 38 L30.5 37
           C31.5 37 32.5 36.5 32.5 35.5
           L32.5 32.5 C37.5 30 40.5 25 40.5 18.5
           C40.5 9.5 33 1.5 22 1.5Z"
        fill="#9e8a4e"
        stroke="#0c0704"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* ── Temporal shadow — depth on sides ── */}
      <path d="M4.5 19 Q5.5 26 9.5 31 Q11 27.5 10.5 22Z" fill="#6e5420" opacity="0.4" />
      <path d="M39.5 19 Q38.5 26 34.5 31 Q33 27.5 33.5 22Z" fill="#6e5420" opacity="0.4" />

      {/* ── Brow ridge — the evil overhang ── */}
      {/* Dips to its lowest point at center (glabella), creating the angry V */}
      <path
        d="M5.5 18 Q8.5 13 15 13.5 Q18.5 14 19.5 16.5
           Q21 12.5 22 13 Q23 12.5 24.5 16.5
           Q25.5 14 29 13.5 Q35.5 13 38.5 18
           Q36 11.5 29.5 10.5 Q25.5 10 22 10.5
           Q18.5 10 14.5 10.5 Q8 11.5 5.5 18Z"
        fill="#6a4a1c"
        opacity="0.6"
      />

      {/* ── Left eye socket ── */}
      {/* Inner top corner (right side) is LOWER — the angry brow angle */}
      <path
        d="M9 18
           Q8.5 13.5 13.5 12.5
           Q17 12 19 15.5
           Q19.5 17.5 18.5 21
           Q17 24 12.5 23.5
           Q8.5 22.5 8.5 19.5
           Q8.8 18.5 9 18Z"
        fill="#060302"
      />
      {/* Left socket deep rim */}
      <path d="M9.5 15.5 Q13.5 13 18 14.5" stroke="#1a0c04" strokeWidth="1.5" fill="none" opacity="0.7" />

      {/* ── Right eye socket ── */}
      {/* Mirror: inner top corner (left side) is also LOWER */}
      <path
        d="M25 15.5
           Q27 12 30.5 12.5
           Q35.5 13 35.5 18
           Q35.5 18.5 35.5 19.5
           Q35 22.5 31.5 23.5
           Q27 24 25.5 21
           Q24.5 17.5 25 15.5Z"
        fill="#060302"
      />
      <path d="M26 14.5 Q30 13 34.5 14.5" stroke="#1a0c04" strokeWidth="1.5" fill="none" opacity="0.7" />

      {/* ── Nasal aperture — slightly asymmetric, more menacing ── */}
      <path
        d="M19.5 27 Q19 24 22 23.5 Q25 24 24.5 27
           Q24.5 30.5 22 31 Q19.5 30.5 19.5 27Z"
        fill="#060302"
      />
      {/* Nasal spine */}
      <line x1="22" y1="25.5" x2="22" y2="30" stroke="#9e8a4e" strokeWidth="0.6" opacity="0.3" />

      {/* ── Jaw suture ── */}
      <path d="M11.5 33 Q22 36 32.5 33" stroke="#6a4418" strokeWidth="0.9" fill="none" />

      {/* ── Teeth — irregular, some broken/missing chip ── */}
      {/* Outer left — short, chipped */}
      <line x1="15.5" y1="35" x2="14.5" y2="40.5" stroke="#5a3810" strokeWidth="1.4" strokeLinecap="round" />
      {/* Left center — tall */}
      <line x1="18.5" y1="35.5" x2="18" y2="46" stroke="#5a3810" strokeWidth="1.4" strokeLinecap="round" />
      {/* Center — dominant, slightly wider */}
      <line x1="22" y1="36" x2="22" y2="46" stroke="#5a3810" strokeWidth="1.8" strokeLinecap="round" />
      {/* Right center */}
      <line x1="25.5" y1="35.5" x2="26" y2="46" stroke="#5a3810" strokeWidth="1.4" strokeLinecap="round" />
      {/* Outer right — short, broken at angle */}
      <line x1="28.5" y1="35" x2="29.5" y2="40" stroke="#5a3810" strokeWidth="1.4" strokeLinecap="round" />

      {/* ── Battle damage — 3 cracks ── */}
      {/* Primary diagonal crack across forehead */}
      <path d="M20.5 2 L24 7.5 L21 13 L23.5 17.5" stroke="#4a2c08" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      {/* Left temporal crack */}
      <path d="M7 13 L9.5 18 L7.5 22" stroke="#4a2c08" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
      {/* Small chip — right parietal */}
      <path d="M33 8 L31 12 L33.5 16" stroke="#4a2c08" strokeWidth="0.6" strokeLinecap="round" opacity="0.5" />

      {/* ── Zygomatic arch lines (cheekbones) ── */}
      <path d="M5.5 21 Q7 27 10.5 30.5" stroke="#7a5820" strokeWidth="0.8" opacity="0.55" />
      <path d="M38.5 21 Q37 27 33.5 30.5" stroke="#7a5820" strokeWidth="0.8" opacity="0.55" />

      {/* ── Specular — top-left cranial */}
      <path d="M9.5 8 Q13 5 19.5 3.5" stroke="#d0be78" strokeWidth="1.1" strokeLinecap="round" opacity="0.22" />
    </svg>
  );
}

/** Padlock SVG for locked state. */
function Padlock() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden="true">
      <rect x="1" y="6" width="12" height="10" rx="2" fill="#1a0f1e" stroke="#120a18" strokeWidth="1.5" />
      <path d="M4 6 Q4 2 7 2 Q10 2 10 6" fill="none" stroke="#1e1220" strokeWidth="2" />
      <circle cx="7" cy="11" r="1.5" fill="#120a16" />
      <rect x="6.5" y="11" width="1" height="2.5" rx="0.5" fill="#120a16" />
    </svg>
  );
}

export default function TimelineScrubber({
  now,
  previewTime,
  windowStart,
  windowEnd,
  isActive,
  onPreview,
  onClear,
}: Props) {
  const { t } = useI18n('TimelineScrubber');
  const trackRef = useRef<HTMLDivElement>(null);

  const nowFraction = fractionFromTime(now, windowStart, windowEnd);
  const handleFraction = previewTime
    ? fractionFromTime(previewTime, windowStart, windowEnd)
    : nowFraction;

  const fractionFromPointer = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return nowFraction;
      const raw = (clientX - rect.left) / rect.width;
      return Math.max(nowFraction, Math.min(1, raw));
    },
    [nowFraction],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isActive) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const f = fractionFromPointer(e.clientX);
      onPreview(timeFromFraction(f, windowStart, windowEnd));
    },
    [isActive, fractionFromPointer, onPreview, windowStart, windowEnd],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const f = fractionFromPointer(e.clientX);
      onPreview(timeFromFraction(f, windowStart, windowEnd));
    },
    [fractionFromPointer, onPreview, windowStart, windowEnd],
  );

  const displayTime = previewTime ?? now;
  const isAtNow = previewTime === null;

  if (!isActive) {
    return (
      <div className={styles.lockedWrap}>
        <div className={styles.lockedHeader}>
          <span className={styles.lockedLabel}>{t('label')}</span>
          <Padlock />
        </div>
        <div className={styles.lockedInner}>
          <div className={styles.lockedBar} />
          <p className={styles.lockedText}>{t('locked')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* Row 1: label + back button */}
      <div className={styles.header}>
        <span className={styles.label}>{t('label')}</span>
        {!isAtNow && (
          <button type="button" className={styles.backBtn} onClick={onClear}>
            {t('backToNow')}
          </button>
        )}
      </div>

      {/* Row 2: now reference left — large preview time right */}
      <div className={styles.times}>
        <span className={styles.timeNow}>
          {t('nowLabel')} · {formatTime(now)}
        </span>
        <div className={styles.previewBlock}>
          <span className={styles.previewTime}>{formatTime(displayTime)}</span>
          <span className={isAtNow ? styles.previewTagLive : styles.previewTag}>
            {isAtNow ? t('live') : t('previewing')}
          </span>
        </div>
      </div>

      {/* Row 3: track */}
      <div className={styles.trackWrap}>
        <div
          ref={trackRef}
          className={styles.track}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
        >
          {/* Past fill — windowStart to now */}
          <div
            className={styles.fillPast}
            style={{ width: `${nowFraction * 100}%` }}
          />
          {/* Preview fill — now to handle */}
          {!isAtNow && (
            <div
              className={styles.fillPreview}
              style={{
                left: `${nowFraction * 100}%`,
                width: `${(handleFraction - nowFraction) * 100}%`,
              }}
            />
          )}
        </div>

        {/* Grip disc handle */}
        <div
          className={styles.handle}
          style={{ left: `calc(${handleFraction * 100}% - 22px)` }}
          role="slider"
          aria-label={t('handleAriaLabel')}
          aria-valuenow={Math.round(handleFraction * 100)}
          aria-valuemin={Math.round(nowFraction * 100)}
          aria-valuemax={100}
        >
          <VikingSkull />
        </div>
      </div>

      {/* Row 4: axis labels */}
      <div className={styles.axis}>
        <span className={styles.axisLabel}>{formatTime(windowStart)}</span>
        <span className={styles.axisLabel}>{formatTime(windowEnd)}</span>
      </div>
    </div>
  );
}
