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
import {
  buildNeatStackPoses,
  neatStackStyle,
  type NeatStackPose,
} from '../services/badges/neatStackLayout';
import { useBadgeContext } from '../hooks/useBadgeContext';
import { useI18n } from '../lib/i18n';
import {
  loadPatchesBackground,
  PATCHES_BG_CHANGED_EVENT,
  type PatchesBackground,
} from '../lib/patchesBackground';
import {
  loadPatchesLayout,
  PATCHES_LAYOUT_CHANGED_EVENT,
  type PatchesLayout,
} from '../lib/patchesLayout';
import BadgeDetailModal from './BadgeDetailModal';
import styles from './BadgesDisplay.module.css';

type BadgesDisplayProps = Readonly<{
  user: AuthUser;
}>;

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
  const [layout, setLayout] = useState<PatchesLayout>(() => loadPatchesLayout());

  useEffect(() => {
    function onBgChange(event: Event) {
      const next = (event as CustomEvent<PatchesBackground>).detail;
      if (next) setBg(next);
    }
    globalThis.addEventListener(PATCHES_BG_CHANGED_EVENT, onBgChange);
    return () => globalThis.removeEventListener(PATCHES_BG_CHANGED_EVENT, onBgChange);
  }, []);

  useEffect(() => {
    function onLayoutChange(event: Event) {
      const next = (event as CustomEvent<PatchesLayout>).detail;
      if (next) setLayout(next);
    }
    globalThis.addEventListener(PATCHES_LAYOUT_CHANGED_EVENT, onLayoutChange);
    return () => globalThis.removeEventListener(PATCHES_LAYOUT_CHANGED_EVENT, onLayoutChange);
  }, []);

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
    mode: 'stack' | 'grid' | 'neat',
    stackPose?: StackPose,
    neatPose?: NeatStackPose,
  ) {
    const isGlowing = glowingSlugs.has(badge.slug);
    const btnClass = [
      styles.patchBtn,
      mode === 'stack' ? styles.patchStackItem : '',
      mode === 'neat' ? styles.patchNeatItem : '',
      mode === 'grid' ? styles.patchGridItem : '',
      isGlowing ? styles.glowing : '',
    ].filter(Boolean).join(' ');

    const imgClass =
      mode === 'grid'
        ? styles.patchImg
        : mode === 'neat'
          ? styles.neatPatchImg
          : styles.stackPatchImg;
    const chipClass =
      mode === 'grid'
        ? styles.yearChip
        : mode === 'neat'
          ? styles.neatYearChip
          : styles.stackYearChip;

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

    if (mode === 'neat') {
      if (!neatPose) return null;
      return (
        <div
          key={badge.slug}
          className={btnClass}
          style={neatStackStyle(neatPose)}
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
  const collapsedPoses = spread || layout === 'neat'
    ? null
    : buildStackPoses(sortedEarned, scatterSeed, glowingSlugs);
  const neatLayout = spread || layout !== 'neat'
    ? null
    : buildNeatStackPoses(sortedEarned, glowingSlugs);

  const collapsedStackClass = spread
    ? `${styles.vestStack} ${styles.vestSpread} ${styles.patchesGrid}`
    : layout === 'neat'
      ? `${styles.vestStack} ${styles.vestNeat}${neatLayout?.metrics.needsScroll ? ` ${styles.vestNeatScroll}` : ''}`
      : styles.vestStack;

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
            if (spread && layout === 'chaotic') setScatterSeed(Math.random());
            setSpread((s) => !s);
          }}
          aria-expanded={spread}
        >
          {spread ? t('patchesCollapse') : t('patchesSpread')}
        </button>
      </div>

      <div className={collapsedStackClass} data-bg={bg}>
        {spread ? (
          sortedEarned.map((badge, index) =>
            renderPatchButton(badge, index, 'grid'),
          )
        ) : layout === 'neat' ? (
          <div className={styles.vestNeatRow}>
            {sortedEarned.map((badge, index) =>
              renderPatchButton(
                badge,
                index,
                'neat',
                undefined,
                neatLayout!.poses.get(badge.slug),
              ),
            )}
          </div>
        ) : (
          <div className={styles.vestStackMeadow}>
            {sortedEarned.map((badge, index) =>
              renderPatchButton(badge, index, 'stack', collapsedPoses!.get(badge.slug)),
            )}
          </div>
        )}
      </div>

      {selectedBadge && (
        <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedSlug(null)} />
      )}
    </>
  );
}
