import type { MetalPlaceConfig } from '../../types';
import type {
  CrewLiveGroup,
  CrewLivePlan,
  LivePlan,
} from '../../services/livePreview';
import { formatFestivalTime } from '../../services/livePreview';
import { stageColor } from '../../services/stageColors';
import Icon from '../icons/Icon';
import styles from '../../pages/RightNowPage.module.css';

type TFn = (key: string, values?: Record<string, string | number>) => string;

function truncateDisplayName(name: string): string {
  if (name.length <= 17) return name;
  return name.slice(0, 17) + '...';
}

function groupTitle(group: CrewLiveGroup, t: TFn) {
  if (group.kind === 'band') return group.band.name;
  if (group.kind === 'metal_place') return t('metalPlaceGroupTitle');
  if (group.kind === 'camping') return t('campingGroupTitle');
  return t('lostGroupTitle');
}

function groupKicker(group: CrewLiveGroup, t: TFn, isUserHere: boolean) {
  if (group.kind === 'band') return isUserHere ? t('bandGroupKickerHere') : t('bandGroupKicker');
  if (group.kind === 'metal_place') {
    return isUserHere ? t('metalPlaceGroupKickerHere') : t('metalPlaceGroupKicker');
  }
  if (group.kind === 'camping') return isUserHere ? t('campingGroupKickerHere') : t('campingGroupKicker');
  return isUserHere ? t('lostGroupKickerHere') : t('lostGroupKicker');
}

function formatHmTime(value?: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}

function metalPlaceSubtitle(config: MetalPlaceConfig | null, t: TFn): string {
  const start = formatHmTime(config?.start_time);
  const end = formatHmTime(config?.end_time);
  if (start && end) return t('metalPlaceGroupSubtitleWithTime', { start, end });
  return t('metalPlaceGroupSubtitle');
}

function groupSubtitle(group: CrewLiveGroup, t: TFn, metalPlaceConfig?: MetalPlaceConfig | null) {
  if (group.kind === 'band') {
    return t('bandGroupSubtitle', {
      stage: group.band.stage,
      start: formatFestivalTime(group.band.start_time),
      end: formatFestivalTime(group.band.end_time),
    });
  }
  if (group.kind === 'metal_place') return metalPlaceSubtitle(metalPlaceConfig ?? null, t);
  if (group.kind === 'camping') return t('campingGroupSubtitle');
  return t('lostGroupSubtitle');
}

function emptyGroupMessage(group: CrewLiveGroup, t: (key: string) => string) {
  if (group.kind === 'metal_place') return t('metalPlaceGroupEmpty');
  return group.kind === 'camping' ? t('campingGroupEmpty') : t('lostGroupEmpty');
}

function CrewMember({ crew, isCurrentUser }: { crew: CrewLivePlan; isCurrentUser: boolean }) {
  const hasNext = !crew.plan.band && !!crew.plan.nextBand;
  return (
    <li className={`${styles.memberPill} ${isCurrentUser ? styles.me : ''}`}>
      <span className={styles.avatar}>
        {crew.avatar_url ? (
          <img className={styles.avatarImg} src={crew.avatar_url} alt="" loading="lazy" />
        ) : (
          <span aria-hidden>{crew.label.charAt(0).toUpperCase()}</span>
        )}
      </span>
      {hasNext ? (
        <span className={styles.memberText}>
          <span className={styles.crewName}>{truncateDisplayName(crew.label)}</span>
          <span className={styles.memberMeta}>
            {formatFestivalTime(crew.plan.nextBand!.start_time)} · {crew.plan.nextBand!.name}
          </span>
        </span>
      ) : (
        <span className={styles.crewName}>{truncateDisplayName(crew.label)}</span>
      )}
    </li>
  );
}

type CrewGroupsSectionProps = {
  crewGroups: CrewLiveGroup[];
  crewPlans: CrewLivePlan[];
  userId: string | null;
  myPlan: LivePlan;
  metalPlaceConfig: MetalPlaceConfig | null;
  onSkip: () => Promise<void>;
  t: TFn;
};

export default function CrewGroupsSection({
  crewGroups,
  crewPlans,
  userId,
  myPlan,
  metalPlaceConfig,
  onSkip,
  t,
}: CrewGroupsSectionProps) {
  if (crewPlans.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Icon name="friend" size={24} aria-hidden />
        {t('crewEmpty')}
      </div>
    );
  }

  return (
    <section className={styles.crewGroups} aria-label={t('crewGridLabel')}>
      {crewGroups.map((group) => {
        const isUserHere = !!userId && group.members.some((crew) => crew.id === userId);
        const showWeakButton =
          isUserHere &&
          group.kind === 'band' &&
          myPlan.status === 'current' &&
          myPlan.band?.id === group.band.id;

        return (
          <article
            className={`${styles.groupCard} ${styles[group.kind]} ${
              isUserHere ? styles.youAreHere : ''
            }`}
            key={group.kind === 'band' ? group.band.id : group.kind}
          >
            <div
              className={styles.locStrip}
              style={group.kind === 'band' ? { background: stageColor(group.band.stage) } : undefined}
            />
            <div className={styles.groupHeader}>
              <div>
                <span className={styles.groupKicker}>
                  {group.kind === 'band' && isUserHere && (
                    <span className={styles.liveDot} aria-hidden />
                  )}
                  {groupKicker(group, t, isUserHere)}
                </span>
                <h3 className={styles.groupTitle}>{groupTitle(group, t)}</h3>
                <p className={styles.groupSubtitle}>{groupSubtitle(group, t, metalPlaceConfig)}</p>
                {isUserHere && group.kind === 'band' && myPlan.nextBand && (
                  <p className={styles.groupNextUp}>
                    {t('nextUp')} → {myPlan.nextBand.name}
                  </p>
                )}
              </div>
              <div className={styles.groupCount}>
                {group.members.length}
                <small className={styles.locCountLabel}>{t('crewCountLabel')}</small>
              </div>
            </div>
            {group.members.length > 0 ? (
              <ul className={styles.memberList}>
                {group.members.map((crew) => (
                  <CrewMember crew={crew} isCurrentUser={crew.id === userId} key={crew.id} />
                ))}
              </ul>
            ) : (
              <p className={styles.groupEmpty}>{emptyGroupMessage(group, t)}</p>
            )}
            {showWeakButton && (
              <div className={styles.groupActions}>
                <button className={styles.skipButton} onClick={onSkip}>
                  {t('souFraco')}
                </button>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
