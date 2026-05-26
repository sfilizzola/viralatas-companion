import { useState } from 'react';
import { BADGES } from '../../services/badges';
import type { BadgeConfig } from '../../services/badges/types';
import { useI18n } from '../../lib/i18n';
import BadgeDetailModal from '../BadgeDetailModal';
import PatchTile from '../badges/PatchTile';
import badgeStyles from '../BadgesDisplay.module.css';
import { Collapsible } from '../../ui';
import profileStyles from '../../pages/ProfilePage.module.css';
import panelStyles from './GodlikeAdminPanel.module.css';

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
          <div className={panelStyles.testBadgePanel}>
            <div className={badgeStyles.patchesHeader}>
              <div className={badgeStyles.patchesHeading}>
                {t('patchesKicker')}
                <span className={badgeStyles.patchesCount}>· {BADGES.length}</span>
              </div>
            </div>
            <div className={`${badgeStyles.patchesGrid} ${panelStyles.testBadgeGridScroll}`} data-bg="steel">
              {BADGES.map((badge, index) => (
                <PatchTile
                  key={badge.slug}
                  badge={badge}
                  gridIndex={index}
                  onClick={() => setSelectedBadge(badge)}
                  ariaLabel={t(badge.labelKey)}
                  title={`${t(badge.labelKey)} (${badge.slug})`}
                />
              ))}
            </div>
          </div>
        </Collapsible>
      </div>

      {selectedBadge && (
        <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </>
  );
}
