import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useFestivalWrapStats } from '../hooks/useFestivalWrapStats';
import { loadPatchesBackground } from '../lib/patchesBackground';
import { useI18n } from '../lib/i18n';
import { BADGES } from '../services/badges/registry';
import { badgeYearSuffix } from '../components/badges/PatchTile';
import { buildStackPoses, stackStyle } from '../services/badges/stackLayout';
import { stageColorVar } from '../services/stageColors';
import WrapProgress from '../components/wrap/WrapProgress';
import styles from './WrapPage.module.css';

const WEAK_SKIP_METER_MAX = 20;
const CONFLICT_METER_MAX = 10;
const BADGE_METER_MAX = 15;

const SECTION = {
  welcome: 0,
  hero: 1,
  personality: 2,
  chaos: 3,
  crew: 4,
  assigned: 5,
} as const;

function meterWidth(value: number, max: number): string {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return `${pct}%`;
}

function portraitInitial(name: string | null | undefined): string {
  const trimmed = (name ?? '?').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

type PickTwinPortraitProps = {
  src: string | null;
  name: string;
  tag: string;
  revealed: boolean;
};

function PickTwinPortrait({ src, name, tag, revealed }: PickTwinPortraitProps) {
  return (
    <figure
      className={styles.twinSpotlight}
      data-revealed={revealed ? 'true' : 'false'}
    >
      <div className={styles.twinSpotlightFrame} aria-hidden="true">
        <div className={styles.twinPortrait}>
          {src ? (
            <img src={src} alt="" className={styles.twinPortraitImg} draggable={false} />
          ) : (
            <span className={styles.twinPortraitInitial}>{portraitInitial(name)}</span>
          )}
        </div>
      </div>
      <figcaption className={styles.twinSpotlightCaption}>
        <span className={styles.twinSpotlightTag}>{tag}</span>
        <span className={styles.twinSpotlightName}>{name}</span>
      </figcaption>
    </figure>
  );
}

function WrapAmbient() {
  return (
    <div className={styles.ambient} aria-hidden="true">
      <div className={styles.ambientOrbPrimary} />
      <div className={styles.ambientOrbAccent} />
      <div className={styles.ambientGrain} />
    </div>
  );
}

export default function WrapPage() {
  const { t } = useI18n('WrapPage');
  const { t: tBadges } = useI18n('Badges');
  const { session } = useAuth();
  const userId = session?.user?.id ?? '';
  const { stats, loading } = useFestivalWrapStats(userId);
  const [activeSection, setActiveSection] = useState(0);
  const [revealedSections, setRevealedSections] = useState<Set<number>>(() => new Set());
  const [heroCount, setHeroCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const patchesBg = loadPatchesBackground();

  const earnedBadges = useMemo(() => {
    if (!stats?.hasPicks) return [];
    const slugs = new Set(stats.personal.earnedBadgeSlugs);
    return BADGES.filter((b) => slugs.has(b.slug));
  }, [stats]);

  const assignedBadges = useMemo(() => {
    if (!stats?.hasPicks) return [];
    const slugs = new Set(stats.personal.assignedBadgeSlugs);
    return BADGES.filter((b) => slugs.has(b.slug));
  }, [stats]);

  const hasAssignedSection = assignedBadges.length > 0;
  const patchesSectionIndex = hasAssignedSection ? 6 : 5;
  const finaleSectionIndex = patchesSectionIndex + 1;
  const totalSections = finaleSectionIndex + 1;

  const stackPoses = useMemo(
    () => (earnedBadges.length > 0 ? buildStackPoses(earnedBadges, 42, new Set()) : new Map()),
    [earnedBadges],
  );

  const sectionClass = useCallback(
    (index: number) =>
      [styles.section, revealedSections.has(index) ? styles.sectionRevealed : '']
        .filter(Boolean)
        .join(' '),
    [revealedSections],
  );

  useEffect(() => {
    if (!stats?.hasPicks) return;
    const topStage = stats.personal.topStage;
    document.documentElement.style.setProperty(
      '--stage',
      topStage ? stageColorVar(topStage) : 'var(--accent)',
    );
    return () => {
      document.documentElement.style.removeProperty('--stage');
    };
  }, [stats]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !stats?.hasPicks) return;

    const sections = root.querySelectorAll<HTMLElement>('[data-wrap-section]');
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setRevealedSections((prev) => {
          let next: Set<number> | null = null;
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const index = Number(entry.target.getAttribute('data-wrap-index'));
            if (Number.isNaN(index) || prev.has(index)) continue;
            if (!next) next = new Set(prev);
            next.add(index);
          }
          return next ?? prev;
        });

        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length === 0) return;
        const index = Number(visible[0].target.getAttribute('data-wrap-index'));
        if (!Number.isNaN(index)) setActiveSection(index);
      },
      { root, threshold: [0.2, 0.35, 0.5, 0.65] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [stats?.hasPicks]);

  useEffect(() => {
    if (!stats?.hasPicks || !revealedSections.has(SECTION.hero)) return;

    const target = stats.personal.bandsSeen;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setHeroCount(target);
      return;
    }

    const start = performance.now();
    const duration = 900;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setHeroCount(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    setHeroCount(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [revealedSections, stats]);

  if (loading || !stats) {
    return (
      <div className={styles.page}>
        <WrapAmbient />
        <div className={styles.stateCard}>
          <span className={styles.kicker}>{t('loadingKicker')}</span>
          <p className={styles.stateBody}>{t('loadingBody')}</p>
        </div>
      </div>
    );
  }

  if (!stats.hasPicks) {
    return (
      <div className={styles.page}>
        <WrapAmbient />
        <div className={styles.stateCard}>
          <h1 className={styles.emptyTitle}>{t('emptyTitle')}</h1>
          <p className={styles.stateBody}>{t('emptyBody')}</p>
        </div>
      </div>
    );
  }

  const { personal, crew } = stats;

  return (
    <div className={styles.page}>
      <WrapAmbient />
      <WrapProgress activeIndex={activeSection} total={totalSections} />
      <div className={styles.scrollContainer} ref={containerRef}>
        <section
          className={sectionClass(SECTION.welcome)}
          data-wrap-section
          data-wrap-index={SECTION.welcome}
          aria-label={t('sectionWelcome')}
        >
          <div className={styles.welcomeGate}>
            <span className={styles.welcomeKicker}>{t('welcomeKicker')}</span>
            <h1 className={styles.welcomeTitle}>{t('welcomeTitle')}</h1>
            <p className={styles.welcomePhrase}>{t('welcomePhrase')}</p>
            <p className={styles.welcomeScrollHint}>{t('welcomeScrollHint')}</p>
          </div>
        </section>

        <section
          className={sectionClass(SECTION.hero)}
          data-wrap-section
          data-wrap-index={SECTION.hero}
          aria-label={t('sectionHero')}
        >
          <div className={styles.sectionFrame}>
            <p className={styles.sectionEpigraph}>{t('heroPhrase')}</p>
            <div className={styles.card}>
              <div className={styles.cardGlow} aria-hidden="true" />
              <div className={styles.heroSparks} aria-hidden="true">
                <span className={styles.heroSpark} />
                <span className={styles.heroSpark} />
                <span className={styles.heroSpark} />
                <span className={styles.heroSpark} />
              </div>
              <div className={styles.stageBar} />
              <span className={styles.kicker}>{t('heroKicker')}</span>
              <div className={styles.heroNumber}>
                {revealedSections.has(SECTION.hero) ? heroCount : personal.bandsSeen}
              </div>
              <div className={styles.heroLabel}>{t('heroSeenLabel')}</div>
              <div className={styles.heroRow}>
                <span className={styles.heroChip}>{t('heroPicked', { count: personal.bandsPicked })}</span>
                <span className={styles.heroChip}>{t('heroSkipped', { count: personal.bandsSkipped })}</span>
                <span className={styles.heroChip}>{t('heroStages', { count: personal.stageDiversity })}</span>
              </div>
            </div>
          </div>
        </section>

        <section
          className={sectionClass(SECTION.personality)}
          data-wrap-section
          data-wrap-index={SECTION.personality}
          aria-label={t('sectionPersonality')}
        >
          <div className={styles.sectionFrame}>
            <p className={styles.sectionEpigraph}>{t('personalityPhrase')}</p>
            <div className={styles.card}>
              <div className={styles.cardGlow} aria-hidden="true" />
              <div className={styles.stageBar} />
              <span className={styles.kicker}>{t('personalityKicker')}</span>
              <div className={styles.personalityBlock}>
                <span className={styles.personalityLabel}>{t('personalityGenre')}</span>
                <span className={styles.personalityValue}>{personal.topGenre ?? '—'}</span>
              </div>
              <div className={styles.personalityBlock}>
                <span className={styles.personalityLabel}>{t('personalityStage')}</span>
                <span className={styles.personalityValue}>{personal.topStage ?? '—'}</span>
              </div>
              {personal.topStage && (
                <span className={styles.stagePill}>
                  {t('stagePill', { stage: personal.topStage, count: personal.topStageVisitCount })}
                </span>
              )}
            </div>
          </div>
        </section>

        <section
          className={sectionClass(SECTION.chaos)}
          data-wrap-section
          data-wrap-index={SECTION.chaos}
          aria-label={t('sectionChaos')}
        >
          <div className={styles.sectionFrame}>
            <p className={styles.sectionEpigraph}>{t('chaosPhrase')}</p>
            <div className={styles.card}>
              <div className={styles.cardGlow} aria-hidden="true" />
              <div className={styles.stageBar} />
              <span className={styles.kicker}>{t('chaosKicker')}</span>
              <div className={styles.meterRow}>
              <span className={styles.meterLabel}>{t('chaosWeakSkips')}</span>
              <div className={styles.meterTrack}>
                <div
                  className={styles.meterFill}
                  style={{
                    width: meterWidth(personal.weakSkips, WEAK_SKIP_METER_MAX),
                    ['--meter-delay' as string]: '0s',
                  }}
                />
              </div>
              <span className={styles.meterValue}>{personal.weakSkips}</span>
            </div>
            <div className={styles.meterRow}>
              <span className={styles.meterLabel}>{t('chaosHardConflicts')}</span>
              <div className={styles.meterTrack}>
                <div
                  className={styles.meterFill}
                  style={{
                    width: meterWidth(personal.hardConflicts, CONFLICT_METER_MAX),
                    ['--meter-delay' as string]: '0.1s',
                  }}
                />
              </div>
              <span className={styles.meterValue}>{personal.hardConflicts}</span>
            </div>
            <div className={styles.meterRow}>
              <span className={styles.meterLabel}>{t('chaosBadges')}</span>
              <div className={styles.meterTrack}>
                <div
                  className={styles.meterFill}
                  style={{
                    width: meterWidth(personal.badgesEarnedCount, BADGE_METER_MAX),
                    ['--meter-delay' as string]: '0.2s',
                  }}
                />
              </div>
              <span className={styles.meterValue}>{personal.badgesEarnedCount}</span>
            </div>
            {personal.locationVisitsTotal !== null && personal.locationVisitsTotal > 0 && (
              <p className={styles.metaLine}>
                {t('locationVisits', { count: personal.locationVisitsTotal })}
              </p>
            )}
            </div>
          </div>
        </section>

        <section
          className={sectionClass(SECTION.crew)}
          data-wrap-section
          data-wrap-index={SECTION.crew}
          aria-label={t('sectionCrew')}
        >
          <div className={styles.sectionFrame}>
            <p className={styles.sectionEpigraph}>{t('crewPhrase')}</p>
            {crew.pickTwinDisplayName && crew.pickTwinOverlapPct !== null && (
              <PickTwinPortrait
                src={crew.pickTwinAvatarUrl}
                name={crew.pickTwinDisplayName}
                tag={t('crewPickTwinTag')}
                revealed={revealedSections.has(SECTION.crew)}
              />
            )}
            <div className={styles.card}>
              <div className={styles.cardGlow} aria-hidden="true" />
              <div className={styles.stageBar} />
              <span className={styles.kicker}>{t('crewKicker')}</span>
              <div className={styles.crewBlock}>
              <span className={styles.crewLabel}>{t('crewPickTwin')}</span>
              {crew.pickTwinDisplayName && crew.pickTwinOverlapPct !== null ? (
                <span className={styles.crewValue}>
                  {t('crewPickTwinPct', {
                    name: crew.pickTwinDisplayName,
                    pct: crew.pickTwinOverlapPct,
                  })}
                </span>
              ) : (
                <span className={styles.crewMuted}>{t('crewNoTwin')}</span>
              )}
            </div>
            <div className={styles.crewBlock}>
              <span className={styles.crewLabel}>{t('crewTopBand')}</span>
              {crew.topBandName ? (
                <span className={styles.crewValue}>
                  {t('crewTopBandDetail', {
                    name: crew.topBandName,
                    count: crew.topBandPickCount,
                    active: crew.activeViraLatas,
                  })}
                </span>
              ) : (
                <span className={styles.crewMuted}>{t('crewNoTopBand')}</span>
              )}
            </div>
            </div>
          </div>
        </section>

        {hasAssignedSection && (
          <section
            className={sectionClass(SECTION.assigned)}
            data-wrap-section
            data-wrap-index={SECTION.assigned}
            aria-label={t('sectionAssigned')}
          >
            <div className={styles.sectionFrame}>
              <p className={styles.sectionEpigraph}>{t('assignedPhrase')}</p>
              <div className={styles.card}>
                <div className={styles.cardGlow} aria-hidden="true" />
                <div className={styles.stageBar} />
                <span className={styles.kicker}>{t('assignedKicker')}</span>
                <p className={styles.assignedCount}>
                {t('assignedCount', { count: assignedBadges.length })}
              </p>
              <div className={styles.assignedGrid}>
                {assignedBadges.map((badge, index) => (
                  <div
                    key={badge.slug}
                    className={styles.assignedTile}
                    style={{ ['--assigned-i' as string]: index }}
                  >
                    <div className={styles.assignedImgWrap}>
                      <img
                        src={badge.imagePath}
                        alt=""
                        className={styles.assignedImg}
                        draggable={false}
                      />
                      {badge.year != null && (
                        <span className={styles.assignedYear}>
                          {badgeYearSuffix(badge.year)}
                        </span>
                      )}
                    </div>
                    <span className={styles.assignedLabel}>{tBadges(badge.labelKey)}</span>
                  </div>
                ))}
              </div>
              </div>
            </div>
          </section>
        )}

        <section
          className={sectionClass(patchesSectionIndex)}
          data-wrap-section
          data-wrap-index={patchesSectionIndex}
          aria-label={t('sectionPatches')}
        >
          <div className={styles.sectionFrame}>
            <p className={styles.sectionEpigraph}>{t('patchesPhrase')}</p>
            <div className={styles.card}>
              <div className={styles.cardGlow} aria-hidden="true" />
              <div className={styles.stageBar} />
              <span className={styles.kicker}>{t('patchesKicker')}</span>
              <p className={styles.patchesCount}>
              {t('patchesCount', { count: personal.badgesEarnedCount })}
            </p>
            <div className={styles.vestFinale} data-bg={patchesBg}>
              <div className={styles.vestMeadow}>
                {earnedBadges.map((badge, index) => {
                  const pose = stackPoses.get(badge.slug);
                  if (!pose) return null;
                  return (
                    <img
                      key={badge.slug}
                      src={badge.imagePath}
                      alt=""
                      className={styles.vestPatch}
                      style={{
                        ...stackStyle(pose),
                        ['--patch-i' as string]: index,
                      }}
                      draggable={false}
                    />
                  );
                })}
              </div>
            </div>
            <Link to="/profile?vest=open#vest" className={styles.openVest}>
              {t('openVest')}
            </Link>
            </div>
          </div>
        </section>

        <section
          className={sectionClass(finaleSectionIndex)}
          data-wrap-section
          data-wrap-index={finaleSectionIndex}
          aria-label={t('sectionFinale')}
        >
          <div className={styles.finaleGate}>
            <span className={styles.finaleKicker}>{t('finaleKicker')}</span>
            <h2 className={styles.finaleTitle}>{t('finaleTitle')}</h2>
            <p className={styles.finalePhrase}>{t('finalePhrase')}</p>
            <p className={styles.finaleSeeYou}>{t('finaleSeeYou')}</p>
            <Link to="/now" className={styles.finaleCta}>
              {t('finaleCta')}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
