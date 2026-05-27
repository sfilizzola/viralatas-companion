import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useFestivalWrapStats } from '../hooks/useFestivalWrapStats';
import { loadPatchesBackground } from '../lib/patchesBackground';
import { useI18n } from '../lib/i18n';
import { BADGES } from '../services/badges/registry';
import { buildStackPoses, stackStyle } from '../services/badges/stackLayout';
import { stageColorVar } from '../services/stageColors';
import WrapProgress from '../components/wrap/WrapProgress';
import styles from './WrapPage.module.css';

const WEAK_SKIP_METER_MAX = 20;
const CONFLICT_METER_MAX = 10;
const BADGE_METER_MAX = 15;

function meterWidth(value: number, max: number): string {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return `${pct}%`;
}

export default function WrapPage() {
  const { t } = useI18n('WrapPage');
  const { session } = useAuth();
  const userId = session?.user?.id ?? '';
  const { stats, loading } = useFestivalWrapStats(userId);
  const [activeSection, setActiveSection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const patchesBg = loadPatchesBackground();

  const earnedBadges = useMemo(() => {
    if (!stats?.hasPicks) return [];
    const slugs = new Set(stats.personal.earnedBadgeSlugs);
    return BADGES.filter((b) => slugs.has(b.slug));
  }, [stats]);

  const stackPoses = useMemo(
    () => (earnedBadges.length > 0 ? buildStackPoses(earnedBadges, 42, new Set()) : new Map()),
    [earnedBadges],
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
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length === 0) return;
        const index = Number(visible[0].target.getAttribute('data-wrap-index'));
        if (!Number.isNaN(index)) setActiveSection(index);
      },
      { root, threshold: [0.35, 0.5, 0.65] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [stats?.hasPicks]);

  if (loading || !stats) {
    return (
      <div className={styles.page}>
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
      <WrapProgress activeIndex={activeSection} />
      <div className={styles.scrollContainer} ref={containerRef}>
        <section
          className={styles.section}
          data-wrap-section
          data-wrap-index={0}
          aria-label={t('sectionHero')}
        >
          <div className={styles.card}>
            <div className={styles.stageBar} />
            <span className={styles.kicker}>{t('heroKicker')}</span>
            <div className={styles.heroNumber}>{personal.bandsSeen}</div>
            <div className={styles.heroLabel}>{t('heroSeenLabel')}</div>
            <div className={styles.heroRow}>
              <span>{t('heroPicked', { count: personal.bandsPicked })}</span>
              <span>·</span>
              <span>{t('heroSkipped', { count: personal.bandsSkipped })}</span>
              <span>·</span>
              <span>{t('heroStages', { count: personal.stageDiversity })}</span>
            </div>
          </div>
        </section>

        <section
          className={styles.section}
          data-wrap-section
          data-wrap-index={1}
          aria-label={t('sectionPersonality')}
        >
          <div className={styles.card}>
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
        </section>

        <section
          className={styles.section}
          data-wrap-section
          data-wrap-index={2}
          aria-label={t('sectionChaos')}
        >
          <div className={styles.card}>
            <div className={styles.stageBar} />
            <span className={styles.kicker}>{t('chaosKicker')}</span>
            <div className={styles.meterRow}>
              <span className={styles.meterLabel}>{t('chaosWeakSkips')}</span>
              <div className={styles.meterTrack}>
                <div
                  className={styles.meterFill}
                  style={{ width: meterWidth(personal.weakSkips, WEAK_SKIP_METER_MAX) }}
                />
              </div>
              <span className={styles.meterValue}>{personal.weakSkips}</span>
            </div>
            <div className={styles.meterRow}>
              <span className={styles.meterLabel}>{t('chaosHardConflicts')}</span>
              <div className={styles.meterTrack}>
                <div
                  className={styles.meterFill}
                  style={{ width: meterWidth(personal.hardConflicts, CONFLICT_METER_MAX) }}
                />
              </div>
              <span className={styles.meterValue}>{personal.hardConflicts}</span>
            </div>
            <div className={styles.meterRow}>
              <span className={styles.meterLabel}>{t('chaosBadges')}</span>
              <div className={styles.meterTrack}>
                <div
                  className={styles.meterFill}
                  style={{ width: meterWidth(personal.badgesEarnedCount, BADGE_METER_MAX) }}
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
        </section>

        <section
          className={styles.section}
          data-wrap-section
          data-wrap-index={3}
          aria-label={t('sectionCrew')}
        >
          <div className={styles.card}>
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
        </section>

        <section
          className={styles.section}
          data-wrap-section
          data-wrap-index={4}
          aria-label={t('sectionPatches')}
        >
          <div className={styles.card}>
            <div className={styles.stageBar} />
            <span className={styles.kicker}>{t('patchesKicker')}</span>
            <p className={styles.patchesCount}>
              {t('patchesCount', { count: personal.badgesEarnedCount })}
            </p>
            <div className={styles.vestFinale} data-bg={patchesBg}>
              <div className={styles.vestMeadow}>
                {earnedBadges.map((badge) => {
                  const pose = stackPoses.get(badge.slug);
                  if (!pose) return null;
                  return (
                    <img
                      key={badge.slug}
                      src={badge.imagePath}
                      alt=""
                      className={styles.vestPatch}
                      style={stackStyle(pose)}
                      draggable={false}
                    />
                  );
                })}
              </div>
            </div>
            <Link to="/profile" className={styles.openVest}>
              {t('openVest')}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
