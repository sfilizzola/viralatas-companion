import type { MetalPlaceConfig } from '../../types';
import { findActiveMetalPlaceWindow } from '../../services/metalPlaceValidation';
import type {
  CrewLiveGroup,
  CrewLivePlan,
  LivePlan,
} from '../../services/livePreview';
import { formatFestivalTime } from '../../services/livePreview';
import { stageColor } from '../../services/stageColors';
import Avatar from '../../ui/Avatar';
import Icon from '../icons/Icon';
import QuackStrip from '../QuackStrip';
import styles from '../../pages/RightNowPage.module.css';

type TFn = (key: string, values?: Record<string, string | number>) => string;

function clusterCountLabel(kind: string, count: number, t: TFn): string {
  if (kind === 'band') return `${count} ${t('crewCountLabel')}`;
  if (kind === 'metal_place') return `${count} ${t('metalPlaceCountLabel')}`;
  if (kind === 'camping') return `${count} ${t('campingCountLabel')}`;
  return `${count} ${t('lostCountLabel')}`;
}

function ClusterRow({
  members,
  kind,
  t,
}: {
  members: CrewLivePlan[];
  kind: string;
  t: TFn;
}) {
  const visible = members.slice(0, 5);
  const overflow = members.length - visible.length;
  return (
    <div className={styles.clusterRow}>
      <div className={styles.clusterAvatars}>
        {visible.map((m) => (
          <Avatar
            key={m.id}
            size={24}
            src={m.avatar_url}
            initial={m.label.charAt(0).toUpperCase()}
            className={styles.clusterAvatar}
          />
        ))}
        {overflow > 0 && (
          <span className={styles.clusterOverflow}>+{overflow}</span>
        )}
      </div>
      <span className={styles.clusterCount}>
        {clusterCountLabel(kind, members.length, t)}
      </span>
    </div>
  );
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

function metalPlaceSubtitle(config: MetalPlaceConfig | null, now: Date, t: TFn): string {
  const active = findActiveMetalPlaceWindow(config?.windows ?? [], now);
  const start = formatHmTime(active?.start_time);
  const end = formatHmTime(active?.end_time);
  if (start && end) return t('metalPlaceGroupSubtitleWithTime', { start, end });
  return t('metalPlaceGroupSubtitle');
}

function groupSubtitle(
  group: CrewLiveGroup,
  t: TFn,
  metalPlaceConfig: MetalPlaceConfig | null | undefined,
  now: Date,
) {
  if (group.kind === 'band') {
    return t('bandGroupSubtitle', {
      stage: group.band.stage,
      start: formatFestivalTime(group.band.start_time),
      end: formatFestivalTime(group.band.end_time),
    });
  }
  if (group.kind === 'metal_place') return metalPlaceSubtitle(metalPlaceConfig ?? null, now, t);
  if (group.kind === 'camping') return t('campingGroupSubtitle');
  return t('lostGroupSubtitle');
}

function emptyGroupMessage(group: CrewLiveGroup, t: (key: string) => string) {
  if (group.kind === 'metal_place') return t('metalPlaceGroupEmpty');
  return group.kind === 'camping' ? t('campingGroupEmpty') : t('lostGroupEmpty');
}


type CrewGroupsSectionProps = {
  crewGroups: CrewLiveGroup[];
  crewPlans: CrewLivePlan[];
  userId: string | null;
  myPlan: LivePlan;
  metalPlaceConfig: MetalPlaceConfig | null;
  now: Date;
  onSkip: () => Promise<void>;
  onDuck?: () => void;
  duckCooldownUntil?: number | null;
  onGroupSelect: (group: CrewLiveGroup) => void;
  t: TFn;
};

export default function CrewGroupsSection({
  crewGroups,
  crewPlans,
  userId,
  myPlan,
  metalPlaceConfig,
  now,
  onSkip,
  onDuck,
  duckCooldownUntil,
  onGroupSelect,
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
        const showStrip = showWeakButton && !!onDuck;
        const key = group.kind === 'band' ? group.band.id : group.kind;

        const card = (
          <article
            className={`${styles.groupCard} ${styles[group.kind]} ${
              isUserHere ? styles.youAreHere : ''
            } ${showStrip ? styles.groupCardAboveStrip : ''}`}
            onClick={() => onGroupSelect(group)}
            style={{ cursor: 'pointer' }}
          >
            <div
              className={styles.locStrip}
              style={group.kind === 'band' ? { background: stageColor(group.band.stage) } : undefined}
            />
            <div className={styles.groupBody}>
              <div className={styles.groupMain}>
                <div className={styles.groupLeft}>
                  <span className={styles.groupKicker}>
                    {isUserHere && <span className={styles.liveDot} aria-hidden />}
                    {groupKicker(group, t, isUserHere)}
                  </span>
                  <h3 className={styles.groupTitle} data-text={groupTitle(group, t)}>{groupTitle(group, t)}</h3>
                  <p className={styles.groupSubtitle}>{groupSubtitle(group, t, metalPlaceConfig, now)}</p>
                  {isUserHere && group.kind === 'band' && myPlan.nextBand && (
                    <p className={styles.groupNextUp}>
                      {t('nextUp')} → {myPlan.nextBand.name}
                    </p>
                  )}
                  {group.members.length > 0 ? (
                    <ClusterRow members={group.members} kind={group.kind} t={t} />
                  ) : (
                    <p className={styles.groupEmpty}>{emptyGroupMessage(group, t)}</p>
                  )}
                </div>
                <div className={styles.groupCountCol}>
                  <div className={styles.groupCount}>
                    {group.members.length}
                    <small className={styles.locCountLabel}>{t('crewCountLabel')}</small>
                  </div>
                </div>
              </div>
              {showWeakButton && (
                <div className={styles.groupActions}>
                  <button className={styles.skipButton} onClick={(e) => { e.stopPropagation(); void onSkip(); }}>
                    {t('souFraco')}
                  </button>
                </div>
              )}
            </div>
          </article>
        );

        return (
          <div key={key}>
            {card}
            {showStrip && (
              <QuackStrip onDuck={onDuck!} cooldownUntil={duckCooldownUntil ?? null} />
            )}
          </div>
        );
      })}
    </section>
  );
}
