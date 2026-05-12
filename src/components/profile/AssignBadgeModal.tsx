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

function yearSuffix(year: number): string {
  return String(year).slice(-2);
}

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
    <div className={styles.conflictModal} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.conflictModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.abmHeader}>
          <div className={styles.abmKicker}>{t('assignBadgeKicker')}</div>
          <h3 className={styles.abmTitle}>{name}</h3>
        </div>

        {error && <p className={styles.userRowError}>{error}</p>}

        {/* Assigned section */}
        <div className={styles.abmSection}>
          <div className={styles.abmSectionLabel}>
            {t('assignedPatches')}
            {assigned.length > 0 && (
              <span className={styles.abmCount}>{assigned.length}</span>
            )}
          </div>

          {assigned.length === 0 ? (
            <div className={styles.abmEmpty}>{t('noPatchesAssigned')}</div>
          ) : (
            <div className={styles.abmAssignedStrip}>
              {assigned.map((badge) => (
                <button
                  key={badge.slug}
                  className={`${styles.abmPatch} ${styles.abmPatchAssigned}`}
                  onClick={() => doAction(badge.slug, 'revoke')}
                  disabled={busy}
                  type="button"
                  title={`${tBadges(badge.labelKey)} — ${t('clickToRevoke')}`}
                >
                  <div className={styles.abmPatchImgWrap}>
                    <img src={badge.imagePath} alt="" className={styles.abmPatchImg} />
                    {badge.year && (
                      <span className={styles.abmYearChip}>{yearSuffix(badge.year)}</span>
                    )}
                    <span className={styles.abmRevokeOverlay}>✕</span>
                  </div>
                  <span className={styles.abmPatchName}>{tBadges(badge.labelKey)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Available section */}
        {available.length > 0 && (
          <div className={styles.abmSection}>
            <div className={styles.abmSectionLabel}>{t('availablePatches')}</div>
            <div className={styles.abmAvailableGrid}>
              {available.map((badge) => (
                <button
                  key={badge.slug}
                  className={styles.abmPatch}
                  onClick={() => doAction(badge.slug, 'assign')}
                  disabled={busy}
                  type="button"
                  title={`${tBadges(badge.labelKey)} — ${tBadges(badge.descriptionKey)}`}
                >
                  <div className={styles.abmPatchImgWrap}>
                    <img src={badge.imagePath} alt="" className={styles.abmPatchImg} />
                    {badge.year && (
                      <span className={styles.abmYearChip}>{yearSuffix(badge.year)}</span>
                    )}
                  </div>
                  <span className={styles.abmPatchName}>{tBadges(badge.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
