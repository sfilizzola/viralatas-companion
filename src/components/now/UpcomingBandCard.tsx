import { useState, type MouseEvent } from 'react';
import { useI18n } from '../../lib/i18n';
import Avatar from '../../ui/Avatar';
import QuackStrip from '../QuackStrip';
import type { Band } from '../../types';
import type { CrewLivePlan } from '../../services/livePreview';
import { formatFestivalTime } from '../../services/livePreview';
import { stageColor } from '../../services/stageColors';
import styles from './UpcomingBandCard.module.css';

type UpcomingBandCardProps = {
  nextBand: Band;
  crewMembers: CrewLivePlan[];
  onDismiss: (bandId: string) => void;
  onDuck: () => void;
  duckCooldownUntil: number | null;
};

export default function UpcomingBandCard({
  nextBand,
  crewMembers,
  onDismiss,
  onDuck,
  duckCooldownUntil,
}: UpcomingBandCardProps) {
  const { t } = useI18n('UpcomingBandCard');
  const [isExpanded, setIsExpanded] = useState(false);

  function handleCardClick(e: MouseEvent) {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }

  function handleDismiss(e: MouseEvent) {
    e.stopPropagation();
    onDismiss(nextBand.id);
  }

  const visibleAvatars = crewMembers.slice(0, 5);
  const overflow = crewMembers.length - visibleAvatars.length;
  const stageColorValue = stageColor(nextBand.stage);

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className={styles.stripe} style={{ backgroundColor: stageColorValue }} />

        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.badge}>{t('upcomingLabel')}</span>
              <h3 className={styles.bandName}>{nextBand.name}</h3>
            </div>
            <button
              type="button"
              className={styles.dismissButton}
              onClick={handleDismiss}
              aria-label={t('dismissLabel')}
            >
              ✕
            </button>
          </div>

          <div className={styles.details}>
            <span className={styles.stage}>{nextBand.stage}</span>
            <span className={styles.time}>{formatFestivalTime(nextBand.start_time)}</span>
          </div>

          <div className={styles.avatarsSection}>
            <div className={styles.avatars}>
              {visibleAvatars.map((member) => (
                <Avatar
                  key={member.id}
                  size={32}
                  src={member.avatar_url}
                  initial={member.label.charAt(0).toUpperCase()}
                  className={styles.avatar}
                />
              ))}
              {overflow > 0 && (
                <span className={styles.overflow}>+{overflow}</span>
              )}
            </div>
          </div>

          {isExpanded && (
            <div className={styles.crewList}>
              {crewMembers.map((member) => (
                <div key={member.id} className={styles.crewMember}>
                  <Avatar
                    size={24}
                    src={member.avatar_url}
                    initial={member.label.charAt(0).toUpperCase()}
                  />
                  <span className={styles.crewName}>{member.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <QuackStrip onDuck={onDuck} cooldownUntil={duckCooldownUntil} />
    </div>
  );
}
