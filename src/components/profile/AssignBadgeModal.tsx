import { useState } from 'react';
import { useI18n } from '../../lib/i18n';
import { BADGES } from '../../services/badges';
import type { UserWithLoading } from './types';
import styles from '../../pages/ProfilePage.module.css';

const ASSIGNABLE_BADGES = BADGES.filter((b) => b.condition.type === 'assigned');

type AssignBadgeModalProps = {
  targetUser: UserWithLoading;
  onAssign: (targetUserId: string, badgeSlug: string, action: 'assign' | 'revoke') => Promise<void>;
  onClose: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
};

export default function AssignBadgeModal({ targetUser, onAssign, onClose, t }: AssignBadgeModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t: tBadges } = useI18n('Badges');
  const name = targetUser.display_name || targetUser.email;

  async function doAction(slug: string, action: 'assign' | 'revoke') {
    setBusy(true);
    setError(null);
    try {
      await onAssign(targetUser.id, slug, action);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('assignBadgeError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.conflictModal} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.conflictModalContent} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.conflictModalTitle}>{t('assignBadgeModalTitle', { name })}</h3>

        {error && <p className={styles.userRowError}>{error}</p>}

        <div className={styles.assignBadgeGrid}>
          {ASSIGNABLE_BADGES.map((badge) => {
            const assigned = targetUser.special_badges.includes(badge.slug);
            return (
              <button
                key={badge.slug}
                className={`${styles.assignBadgeOption} ${assigned ? styles.assignBadgeOptionOwned : ''}`}
                onClick={() => doAction(badge.slug, assigned ? 'revoke' : 'assign')}
                disabled={busy}
                type="button"
                title={tBadges(badge.descriptionKey)}
              >
                <div className={styles.assignBadgeImgWrap}>
                  <img src={badge.imagePath} alt="" className={styles.assignBadgeImg} />
                  {assigned && <span className={styles.revokeX}>✕</span>}
                </div>
                <span>{tBadges(badge.labelKey)}</span>
              </button>
            );
          })}
        </div>

        <button
          className={`${styles.conflictButton} ${styles.conflictCloseButton}`}
          onClick={onClose}
          type="button"
        >
          {t('close')}
        </button>
      </div>
    </div>
  );
}
