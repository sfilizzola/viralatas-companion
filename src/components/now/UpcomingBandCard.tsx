import { useState, type MouseEvent } from 'react';
import { useI18n } from '../../lib/i18n';
import QuackStrip from '../QuackStrip';
import type { Band } from '../../types';
import type { CrewLivePlan } from '../../services/livePreview';
import { formatFestivalTime } from '../../services/livePreview';
import { stageColor } from '../../services/stageColors';
import styles from './UpcomingBandCard.module.css';

type UpcomingBandCardProps = {
  nextBand: Band;
  crewMembers: CrewLivePlan[];
  userId: string | null;
  onDismiss: (bandId: string) => void;
  onDuck?: () => void;
  duckCooldownUntil: number | null;
};

export default function UpcomingBandCard({
  nextBand,
  crewMembers,
  userId,
  onDismiss,
  onDuck,
  duckCooldownUntil,
}: UpcomingBandCardProps) {
  const { t } = useI18n('UpcomingBandCard');
  const [isExpanded, setIsExpanded] = useState(false);

  function handleCardClick() {
    setIsExpanded((v) => !v);
  }

  function handleDismiss(e: MouseEvent) {
    e.stopPropagation();
    onDismiss(nextBand.id);
  }

  const stageColorValue = stageColor(nextBand.stage);

  return (
    <div className={styles.wrapper}>
      {/* ── Collapsed banner ── */}
      <div
        className={`${styles.card} ${!onDuck ? styles.cardNoStrip : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((v) => !v);
          }
        }}
      >
        {/* Stage-colour left stripe */}
        <div className={styles.stripe} style={{ backgroundColor: stageColorValue }} />

        {/* Band info */}
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <h3 className={styles.bandName}>{nextBand.name}</h3>
            <span className={styles.badge}>{t('upcomingLabel')}</span>
          </div>
          <div className={styles.metaRow}>
            <span
              className={styles.stageBadge}
              style={{ backgroundColor: stageColorValue }}
            >
              {nextBand.stage}
            </span>
            <span className={styles.time}>
              <span className={styles.timeAt}>{t('atLabel')}</span>
              {formatFestivalTime(nextBand.start_time)}
            </span>
            {crewMembers.length > 0 && (
              <span className={styles.going}>
                <b>{crewMembers.length}</b> {t('goingLabel')}
              </span>
            )}
          </div>
        </div>

        {/* X dismiss — absolute top-right */}
        <button
          type="button"
          className={styles.dismissButton}
          onClick={handleDismiss}
          aria-label={t('dismissLabel')}
        >
          ✕
        </button>
      </div>

      {/* ── Expanded crew list — drawer-style rows ── */}
      {isExpanded && (
        <div
          className={styles.crewList}
          style={{ '--sheet-accent': stageColorValue } as React.CSSProperties}
        >
          {crewMembers.map((member) => {
            const isCurrentUser = member.id === userId;
            return (
              <div key={member.id} className={styles.memberRow}>
                <div className={`${styles.avatar} ${isCurrentUser ? styles.avatarYou : ''}`}>
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" loading="lazy" />
                  ) : (
                    <span aria-hidden>{member.label.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>
                    {member.label}
                    {isCurrentUser && <span className={styles.youTag}>you</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── QuackStrip — only when duck is enabled ── */}
      {onDuck && <QuackStrip onDuck={onDuck} cooldownUntil={duckCooldownUntil} />}
    </div>
  );
}
