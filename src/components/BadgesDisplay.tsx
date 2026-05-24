import { useEffect, useRef, useState } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
  BADGES,
  evaluateBadge,
  type BadgeConfig,
} from '../services/badges';
import {
  buildStackPoses,
  stackStyle,
  type StackPose,
} from '../services/badges/stackLayout';
import { useBadgeContext } from '../hooks/useBadgeContext';
import { useI18n } from '../lib/i18n';
import {
  loadPatchesBackground,
  PATCHES_BG_CHANGED_EVENT,
  type PatchesBackground,
} from '../lib/patchesBackground';
import { Modal } from '../ui';
import styles from './BadgesDisplay.module.css';

type BadgesDisplayProps = {
  user: AuthUser;
  /** @deprecated Kicker is rendered internally */
  heading?: string;
};

function yearSuffix(year: number): string {
  return String(year).slice(-2);
}

export default function BadgesDisplay({ user }: BadgesDisplayProps) {
  const { t } = useI18n('Badges');
  const { ctx, loading } = useBadgeContext(user);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [spread, setSpread] = useState(false);
  const [scatterSeed, setScatterSeed] = useState(() => Math.random());
  const [bg, setBg] = useState<PatchesBackground>(() => loadPatchesBackground());

  useEffect(() => {
    function onBgChange(event: Event) {
      const next = (event as CustomEvent<PatchesBackground>).detail;
      if (next) setBg(next);
    }
    window.addEventListener(PATCHES_BG_CHANGED_EVENT, onBgChange);
    return () => window.removeEventListener(PATCHES_BG_CHANGED_EVENT, onBgChange);
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const earned = BADGES.filter((b) => evaluateBadge(b, ctx));
  const selectedBadge: BadgeConfig | null = selectedSlug
    ? (earned.find((b) => b.slug === selectedSlug) ?? null)
    : null;

  const acknowledgedRef = useRef<Set<string>>(
    new Set(JSON.parse(localStorage.getItem('badgeAcknowledged') ?? '[]') as string[]),
  );
  const [glowingSlugs, setGlowingSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const earnedNow = BADGES.filter((b) => evaluateBadge(b, ctx));
    const ack = acknowledgedRef.current;
    const unacked = earnedNow.filter((b) => !ack.has(b.slug)).map((b) => b.slug);
    setGlowingSlugs(new Set(unacked));
  }, [ctx]);

  function handleBadgeClick(slug: string) {
    acknowledgedRef.current.add(slug);
    localStorage.setItem('badgeAcknowledged', JSON.stringify([...acknowledgedRef.current]));
    setGlowingSlugs((prev) => { const s = new Set(prev); s.delete(slug); return s; });
    setSelectedSlug(slug);
  }

  function renderPatchButton(
    badge: BadgeConfig,
    index: number,
    mode: 'stack' | 'grid',
    stackPose?: StackPose,
  ) {
    const isGlowing = glowingSlugs.has(badge.slug);
    const btnClass = [
      styles.patchBtn,
      mode === 'stack' ? styles.patchStackItem : styles.patchGridItem,
      isGlowing ? styles.glowing : '',
    ].filter(Boolean).join(' ');

    const imgClass = mode === 'stack' ? styles.stackPatchImg : styles.patchImg;
    const chipClass = mode === 'stack' ? styles.stackYearChip : styles.yearChip;

    const patchContent = (
      <span className={styles.imgWrapper}>
        <img src={badge.imagePath} alt="" className={imgClass} />
        {badge.year && (
          <span className={chipClass}>{yearSuffix(badge.year)}</span>
        )}
      </span>
    );

    if (mode === 'stack') {
      if (!stackPose) return null;
      return (
        <div
          key={badge.slug}
          className={btnClass}
          style={stackStyle(stackPose)}
          aria-hidden="true"
        >
          {patchContent}
        </div>
      );
    }

    return (
      <button
        key={badge.slug}
        className={btnClass}
        style={{ ['--settle-i' as string]: index }}
        onClick={() => handleBadgeClick(badge.slug)}
        type="button"
        aria-label={t(badge.labelKey)}
      >
        {patchContent}
      </button>
    );
  }

  if (loading) {
    return (
      <>
        <div className={styles.patchesHeader}>
          <div className={styles.patchesHeading}>{t('patchesKicker')}</div>
        </div>
        <div
          className={`${styles.vestStack} ${styles.vestStackSkeleton}`}
          data-bg={bg}
          aria-hidden="true"
        >
          <div className={styles.vestStackMeadow}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={styles.skeletonStackPatch}
                style={{
                  left: `${14 + i * 13}%`,
                  top: `${22 + (i % 2) * 28}%`,
                }}
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (earned.length === 0) return null;

  const sortedEarned = earned;
  const collapsedPoses = spread
    ? null
    : buildStackPoses(sortedEarned, scatterSeed, glowingSlugs);

  return (
    <>
      <div className={styles.patchesHeader}>
        <div className={styles.patchesHeading}>
          {t('patchesKicker')}
          <span className={styles.patchesCount}>· {earned.length}</span>
        </div>
        <button
          type="button"
          className={styles.spreadBtn}
          onClick={() => {
            if (spread) setScatterSeed(Math.random());
            setSpread((s) => !s);
          }}
          aria-expanded={spread}
        >
          {spread ? t('patchesCollapse') : t('patchesSpread')}
        </button>
      </div>

      <div
        className={
          spread
            ? `${styles.vestStack} ${styles.vestSpread} ${styles.patchesGrid}`
            : styles.vestStack
        }
        data-bg={bg}
      >
        {spread ? (
          sortedEarned.map((badge, index) =>
            renderPatchButton(badge, index, 'grid'),
          )
        ) : (
          <div className={styles.vestStackMeadow}>
            {sortedEarned.map((badge, index) =>
              renderPatchButton(badge, index, 'stack', collapsedPoses!.get(badge.slug)),
            )}
          </div>
        )}
      </div>

      {selectedBadge && (
        <Modal onClose={() => { setSelectedSlug(null); setIsFullscreen(false); }} contentClassName={styles.modalContent}>
          <div className={styles.modalPatch}>
            <img
              src={selectedBadge.imagePath}
              alt={t(selectedBadge.labelKey)}
              className={styles.modalImg}
            />
            {selectedBadge.year && (
              <span className={styles.modalYearChip}>{yearSuffix(selectedBadge.year)}</span>
            )}
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => setIsFullscreen(true)}
              aria-label="View badge fullscreen"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.8"/>
                <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <h3 className={styles.modalName}>{t(selectedBadge.labelKey)}</h3>
          <p className={styles.modalDesc}>{t(selectedBadge.descriptionKey)}</p>
        </Modal>
      )}

      {isFullscreen && selectedBadge && (
        <button
          type="button"
          className={styles.fullscreenOverlay}
          onClick={() => setIsFullscreen(false)}
          aria-label={`Close fullscreen view of ${t(selectedBadge.labelKey)}`}
        >
          <img
            src={selectedBadge.imagePath}
            alt={t(selectedBadge.labelKey)}
            className={styles.fullscreenImg}
          />
          {selectedBadge.year && (
            <span className={styles.fullscreenYearChip}>{yearSuffix(selectedBadge.year)}</span>
          )}
          <span className={styles.fullscreenClose} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <line x1="2" y1="2" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="2" x2="2" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
        </button>
      )}
    </>
  );
}
