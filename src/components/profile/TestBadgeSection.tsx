import { useState } from 'react';
import { BADGES } from '../../services/badges';
import type { BadgeConfig } from '../../services/badges/types';
import { I18nContext, useI18n, type Language } from '../../lib/i18n';
import BadgeDetailModal from '../BadgeDetailModal';
import PatchTile from '../badges/PatchTile';
import badgeStyles from '../BadgesDisplay.module.css';
import { Collapsible, SegmentedControl } from '../../ui';
import profileStyles from '../../pages/ProfilePage.module.css';
import panelStyles from './GodlikeAdminPanel.module.css';

const PREVIEW_LANG_OPTIONS = [
  { value: 'br', label: 'PT' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'de', label: 'DE' },
];

type TestBadgeSectionProps = {
  t: (key: string, values?: Record<string, string | number>) => string;
};

export default function TestBadgeSection({ t: _t }: TestBadgeSectionProps) {
  const { t } = useI18n('Badges');
  const [selectedBadge, setSelectedBadge] = useState<BadgeConfig | null>(null);
  const [previewLanguage, setPreviewLanguage] = useState<Language>('br');

  const trigger = <h4 className={profileStyles.liveBandTestSectionTitle}>🎖️ Test Badges</h4>;

  function openBadge(badge: BadgeConfig) {
    setSelectedBadge(badge);
  }

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
                  onClick={() => openBadge(badge)}
                  ariaLabel={t(badge.labelKey)}
                  title={`${t(badge.labelKey)} (${badge.slug})`}
                />
              ))}
            </div>
          </div>
        </Collapsible>
      </div>

      {selectedBadge && (
        <I18nContext.Provider
          value={{
            language: previewLanguage,
            setLanguage: setPreviewLanguage,
          }}
        >
          <BadgeDetailModal
            badge={selectedBadge}
            onClose={() => setSelectedBadge(null)}
            footer={
              <div className={panelStyles.previewLangRow}>
                <span className={panelStyles.previewLangLabel}>Preview</span>
                <SegmentedControl
                  options={PREVIEW_LANG_OPTIONS}
                  value={previewLanguage}
                  onChange={(value) => setPreviewLanguage(value as Language)}
                  className={panelStyles.previewLangControl}
                />
              </div>
            }
          />
        </I18nContext.Provider>
      )}
    </>
  );
}
