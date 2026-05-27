import { useMemo, useState } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import { BADGES, evaluateBadge, isLiveVestBadge } from '../../services/badges';
import type { BadgeConfig } from '../../services/badges/types';
import {
  buildEarnedYearPreviewRows,
  buildSamplePreviewRows,
} from '../../services/badges/archivePreviewSeed';
import { getCurrentFestivalYear } from '../../services/badges/currentFestivalYear';
import { isArchivePreviewActive } from '../../lib/archivePreviewMode';
import { useBadgeContext } from '../../hooks/useBadgeContext';
import { badgeHistoryRepository } from '../../repositories/badgeHistoryRepository';
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
  user: AuthUser;
};

export default function TestBadgeSection({ t, user }: TestBadgeSectionProps) {
  const { t: tBadges } = useI18n('Badges');
  const { ctx } = useBadgeContext(user);
  const [selectedBadge, setSelectedBadge] = useState<BadgeConfig | null>(null);
  const [previewLanguage, setPreviewLanguage] = useState<Language>('br');
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveMessage, setArchiveMessage] = useState<string | null>(null);

  const festivalYear = getCurrentFestivalYear();
  const earnedYearBadges = useMemo(
    () => BADGES.filter((badge) => isLiveVestBadge(badge) && evaluateBadge(badge, ctx)),
    [ctx],
  );
  const earnedYearCount = earnedYearBadges.filter((badge) => badge.year === festivalYear).length;
  const previewActive = isArchivePreviewActive(user.id);

  const trigger = <h4 className={profileStyles.liveBandTestSectionTitle}>🎖️ Test Badges</h4>;

  function openBadge(badge: BadgeConfig) {
    setSelectedBadge(badge);
  }

  async function seedArchive(buildRows: () => ReturnType<typeof buildSamplePreviewRows>) {
    setArchiveBusy(true);
    setArchiveMessage(null);
    try {
      const rows = buildRows();
      if (rows.length === 0) {
        setArchiveMessage(t('archivePreviewEmpty'));
        return;
      }
      await badgeHistoryRepository.seedLocalPreview(user.id, rows);
      setArchiveMessage(t('archivePreviewSeeded', { count: rows.length, year: festivalYear }));
    } catch {
      setArchiveMessage(t('archivePreviewError'));
    } finally {
      setArchiveBusy(false);
    }
  }

  async function clearArchivePreview() {
    setArchiveBusy(true);
    setArchiveMessage(null);
    try {
      await badgeHistoryRepository.clearLocalPreview(user.id);
      setArchiveMessage(t('archivePreviewCleared'));
    } catch {
      setArchiveMessage(t('archivePreviewError'));
    } finally {
      setArchiveBusy(false);
    }
  }

  return (
    <>
      <div className={profileStyles.liveBandTestSection}>
        <Collapsible trigger={trigger}>
          <div className={panelStyles.testBadgePanel}>
            <div className={badgeStyles.patchesHeader}>
              <div className={badgeStyles.patchesHeading}>
                {tBadges('patchesKicker')}
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
                  ariaLabel={tBadges(badge.labelKey)}
                  title={`${tBadges(badge.labelKey)} (${badge.slug})`}
                />
              ))}
            </div>

            <div className={panelStyles.archivePreviewBlock}>
              <h5 className={panelStyles.archivePreviewTitle}>{t('archivePreviewTitle')}</h5>
              <p className={profileStyles.liveBandTestDescription}>{t('archivePreviewDescription')}</p>
              {previewActive && (
                <p className={profileStyles.testModeHint}>{t('archivePreviewActiveHint')}</p>
              )}
              {archiveMessage && (
                <p className={profileStyles.resetMessage}>{archiveMessage}</p>
              )}
              <div className={panelStyles.archivePreviewActions}>
                <button
                  type="button"
                  className={profileStyles.saveButton}
                  disabled={archiveBusy || earnedYearCount === 0}
                  onClick={() => void seedArchive(() =>
                    buildEarnedYearPreviewRows(user.id, earnedYearBadges, festivalYear),
                  )}
                >
                  {t('archivePreviewFromVest', { count: earnedYearCount, year: festivalYear })}
                </button>
                <button
                  type="button"
                  className={profileStyles.saveButton}
                  disabled={archiveBusy}
                  onClick={() => void seedArchive(() =>
                    buildSamplePreviewRows(user.id, festivalYear),
                  )}
                >
                  {t('archivePreviewSample', { year: festivalYear })}
                </button>
                <button
                  type="button"
                  className={profileStyles.pfSignOutBtn}
                  disabled={archiveBusy || !previewActive}
                  onClick={() => void clearArchivePreview()}
                >
                  {t('archivePreviewClear')}
                </button>
              </div>
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
