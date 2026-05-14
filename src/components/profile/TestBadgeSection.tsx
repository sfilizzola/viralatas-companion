import { useState } from 'react';
import { BADGES } from '../../services/badges';
import type { BadgeConfig } from '../../services/badges/types';
import { useI18n } from '../../lib/i18n';
import { Collapsible, Modal } from '../../ui';
import profileStyles from '../../pages/ProfilePage.module.css';
import panelStyles from './GodlikeAdminPanel.module.css';

function yearSuffix(year: number): string {
  return String(year).slice(-2);
}

type TestBadgeSectionProps = {
  t: (key: string, values?: Record<string, string | number>) => string;
};

export default function TestBadgeSection({ t: _t }: TestBadgeSectionProps) {
  const { t } = useI18n('Badges');
  const [selectedBadge, setSelectedBadge] = useState<BadgeConfig | null>(null);

  const trigger = <h4 className={profileStyles.liveBandTestSectionTitle}>🎖️ Test Badges</h4>;

  return (
    <>
      <div className={profileStyles.liveBandTestSection}>
        <Collapsible trigger={trigger}>
          <div className={panelStyles.testBadgeGrid}>
            {BADGES.map((badge) => (
              <button
                key={badge.slug}
                className={panelStyles.testBadgeCell}
                onClick={() => setSelectedBadge(badge)}
                type="button"
                title={badge.slug}
              >
                <img src={badge.imagePath} alt={badge.slug} width={56} height={56} />
                <span className={panelStyles.testBadgeCaption}>{badge.slug}</span>
              </button>
            ))}
          </div>
        </Collapsible>
      </div>

      {selectedBadge && (
        <Modal
          onClose={() => setSelectedBadge(null)}
          contentClassName={panelStyles.testBadgeModalContent}
        >
          <div className={panelStyles.testBadgeModalPatch}>
            <img
              src={selectedBadge.imagePath}
              alt={t(selectedBadge.labelKey)}
              className={panelStyles.testBadgeModalImg}
            />
            {selectedBadge.year && (
              <span className={panelStyles.testBadgeModalYearChip}>
                {yearSuffix(selectedBadge.year)}
              </span>
            )}
          </div>
          <h3 className={panelStyles.testBadgeModalName}>{t(selectedBadge.labelKey)}</h3>
          <p className={panelStyles.testBadgeModalDesc}>{t(selectedBadge.descriptionKey)}</p>
        </Modal>
      )}
    </>
  );
}
