import { useState } from 'react';
import { useI18n } from '../../lib/i18n';
import { BADGES } from '../../services/badges';
import PatchTile from '../badges/PatchTile';
import badgeStyles from '../BadgesDisplay.module.css';
import { Modal } from '../../ui';
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

  const assignedSlugs = new Set(targetUser.special_badges);
  const assigned = ASSIGNABLE_BADGES.filter((b) => assignedSlugs.has(b.slug));
  const available = ASSIGNABLE_BADGES.filter((b) => !assignedSlugs.has(b.slug));

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
    <Modal onClose={onClose} contentClassName={styles.assignBadgeModal}>
      <div className={styles.abmHeader}>
        <div className={badgeStyles.patchesHeading}>{t('assignBadgeKicker')}</div>
        <h3 className={styles.abmTitle}>{name}</h3>
      </div>

      {error && <p className={styles.userRowError}>{error}</p>}

      <div className={styles.abmSection}>
        <div className={badgeStyles.patchesHeading}>
          {t('assignedPatches')}
          {assigned.length > 0 && (
            <span className={styles.abmCount}>{assigned.length}</span>
          )}
        </div>

        {assigned.length === 0 ? (
          <div className={styles.abmEmpty}>{t('noPatchesAssigned')}</div>
        ) : (
          <div className={`${badgeStyles.patchesGrid} ${styles.abmAssignedGrid}`} data-bg="steel">
            {assigned.map((badge, index) => (
              <PatchTile
                key={badge.slug}
                badge={badge}
                gridIndex={index}
                animate={false}
                className={styles.abmAssignedTile}
                disabled={busy}
                onClick={() => doAction(badge.slug, 'revoke')}
                ariaLabel={`${tBadges(badge.labelKey)} — ${t('clickToRevoke')}`}
                title={`${tBadges(badge.labelKey)} — ${t('clickToRevoke')}`}
                overlay={<span className={styles.abmRevokeOverlay}>✕</span>}
              />
            ))}
          </div>
        )}
      </div>

      {available.length > 0 && (
        <div className={styles.abmSection}>
          <div className={badgeStyles.patchesHeading}>{t('availablePatches')}</div>
          <div className={`${badgeStyles.patchesGrid} ${styles.abmAvailableGrid}`} data-bg="steel">
            {available.map((badge, index) => (
              <PatchTile
                key={badge.slug}
                badge={badge}
                gridIndex={index}
                disabled={busy}
                onClick={() => doAction(badge.slug, 'assign')}
                ariaLabel={tBadges(badge.labelKey)}
                title={`${tBadges(badge.labelKey)} — ${tBadges(badge.descriptionKey)}`}
              />
            ))}
          </div>
        </div>
      )}

      <button
        className={badgeStyles.spreadBtn}
        onClick={onClose}
        type="button"
      >
        {t('close')}
      </button>
    </Modal>
  );
}
