import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserRole } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useGodlikeAdminI18n } from '../../lib/i18n';
import { announcementsRepository } from '../../repositories';
import { useCooldown } from '../../hooks/useCooldown';
import { Collapsible } from '../../ui';
import DuckButton from '../DuckButton';
import { DUCK_QUACK_EVENT } from '../../hooks/useDuckNotifications';
import TimeTravelSection from './TimeTravelSection';
import TestBadgeSection from './TestBadgeSection';
import ConsolidateBadgesSection from './ConsolidateBadgesSection';
import CacheResetSection from './CacheResetSection';
import FeatureFlagsSection from './FeatureFlagsSection';
import MetalPlaceAdminSection, { type MetalPlaceBridge } from './MetalPlaceAdminSection';
import LiveBandTestAdminSection from './LiveBandTestAdminSection';
import UserManagementSection from './UserManagementSection';
import styles from '../../pages/ProfilePage.module.css';

type GodlikeAdminPanelProps = {
  userId: string;
};

export default function GodlikeAdminPanel({ userId }: GodlikeAdminPanelProps) {
  const { ready, t, language } = useGodlikeAdminI18n();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [duckFeatureEnabled, setDuckFeatureEnabled] = useState(true);
  const previousTestModeRef = useRef(false);
  const [liveBandTestActiveBandId, setLiveBandTestActiveBandId] = useState<string | null>(null);
  const metalPlaceBridgeRef = useRef<MetalPlaceBridge | null>(null);
  const liveBandTestClearRef = useRef<(() => Promise<void>) | null>(null);

  const TEST_QUACK_COOLDOWN_MS = 15_000;
  const [testQuackCooldownUntil, setTestQuackCooldownUntil] = useState<number | null>(null);
  const isTestQuackOnCooldown = useCooldown(testQuackCooldownUntil);

  const [testPushLoading, setTestPushLoading] = useState(false);
  const [testPushResult, setTestPushResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    async function loadRole() {
      const role = await announcementsRepository.fetchCurrentUserRole(userId);
      setUserRole(role);
      setLoading(false);
    }
    loadRole();
  }, [userId]);

  useEffect(() => {
    if (!testQuackCooldownUntil) return;
    const remaining = testQuackCooldownUntil - Date.now();
    if (remaining <= 0) {
      setTestQuackCooldownUntil(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setTestQuackCooldownUntil(null);
      window.dispatchEvent(
        new CustomEvent(DUCK_QUACK_EVENT, {
          detail: { bandId: 'godlike-test-quack', bandName: 'Queen' },
        }),
      );
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [testQuackCooldownUntil]);

  const handleTestPush = useCallback(async () => {
    setTestPushLoading(true);
    setTestPushResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('send-test-push', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.error) {
        setTestPushResult({ ok: false, message: t('testPushError') });
        return;
      }

      const data = res.data as { sent?: number; failed?: number; error?: string };

      if (data.error === 'no_subscription') {
        setTestPushResult({ ok: false, message: t('testPushNoSubscription') });
      } else if (data.sent && data.sent > 0) {
        setTestPushResult({ ok: true, message: t('testPushSent') });
      } else {
        setTestPushResult({ ok: false, message: t('testPushFailed') });
      }
    } catch {
      setTestPushResult({ ok: false, message: t('testPushError') });
    } finally {
      setTestPushLoading(false);
      setTimeout(() => setTestPushResult(null), 6000);
    }
  }, [t]);

  const handleBridgeUpdate = useCallback((bridge: MetalPlaceBridge | null) => {
    metalPlaceBridgeRef.current = bridge;
  }, []);

  const handleRegisterClear = useCallback((clear: (() => Promise<void>) | null) => {
    liveBandTestClearRef.current = clear;
  }, []);

  const handleClearLiveBandTest = useCallback(async () => {
    await liveBandTestClearRef.current?.();
  }, []);

  if (loading || !ready || userRole !== 'godlike') return null;

  const toolsTrigger = (
    <span className={styles.adminTriggerInner}>
      <span className={`${styles.adminTriggerIcon} ${styles.godlikeTriggerIcon}`}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="M5 18 L7 4 L12 12 L17 4 L19 18 Z" />
        </svg>
      </span>
      <span className={`${styles.adminTriggerLabel} ${styles.godlikeTriggerLabel}`}>{t('godlikeToolsTrigger')}</span>
    </span>
  );

  const servantsTrigger = (
    <span className={styles.adminTriggerInner}>
      <span className={`${styles.adminTriggerIcon} ${styles.godlikeTriggerIcon}`}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <circle cx="9" cy="7" r="3" />
          <path d="M3 21v-2a4 4 0 0 1 4-4h4" />
          <circle cx="17" cy="11" r="3" />
          <path d="M13 21v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2" />
        </svg>
      </span>
      <span className={`${styles.adminTriggerLabel} ${styles.godlikeTriggerLabel}`}>{t('godlikeServantsTrigger')}</span>
    </span>
  );

  return (
    <div className={styles.godlikeSection}>
      <Collapsible trigger={toolsTrigger} className={styles.godlikeCollapsible}>
        <div className={styles.conflictsInner}>
          <div className={styles.godlikeSectionContent}>
            <CacheResetSection t={t} />
            <FeatureFlagsSection t={t} onDuckEnabledChange={setDuckFeatureEnabled} />
            <MetalPlaceAdminSection
              t={t}
              previousTestModeRef={previousTestModeRef}
              liveBandTestActiveBandId={liveBandTestActiveBandId}
              onClearLiveBandTest={handleClearLiveBandTest}
              onBridgeUpdate={handleBridgeUpdate}
            />
            <LiveBandTestAdminSection
              t={t}
              previousTestModeRef={previousTestModeRef}
              getMetalPlaceBridge={() => metalPlaceBridgeRef.current}
              onActiveBandIdChange={setLiveBandTestActiveBandId}
              onRegisterClear={handleRegisterClear}
            />

            <div className={styles.liveBandTestSection}>
              <h4 className={styles.liveBandTestSectionTitle}>{t('testQuackTitle')}</h4>
              <p className={styles.liveBandTestDescription}>{t('testQuackDescription')}</p>
              {!duckFeatureEnabled && (
                <p className={styles.testModeHint}>{t('testQuackDisabledHint')}</p>
              )}
              <DuckButton
                tile
                onDuck={() => {
                  if (isTestQuackOnCooldown) return;
                  setTestQuackCooldownUntil(Date.now() + TEST_QUACK_COOLDOWN_MS);
                }}
                cooldownUntil={testQuackCooldownUntil}
              />
            </div>

            <div className={styles.liveBandTestSection}>
              <h4 className={styles.liveBandTestSectionTitle}>{t('testPushTitle')}</h4>
              <p className={styles.liveBandTestDescription}>{t('testPushDescription')}</p>
              {testPushResult && (
                <p className={testPushResult.ok ? styles.resetMessage : styles.metalPlaceError}>
                  {testPushResult.message}
                </p>
              )}
              <button
                className={styles.saveButton}
                onClick={handleTestPush}
                disabled={testPushLoading}
                type="button"
              >
                {testPushLoading ? '⏳ …' : t('testPushButton')}
              </button>
            </div>

            <TimeTravelSection t={t} language={language} />
            <ConsolidateBadgesSection t={t} />
            <TestBadgeSection t={t} user={user!} />
          </div>
        </div>
      </Collapsible>

      <Collapsible trigger={servantsTrigger} className={styles.godlikeCollapsible}>
        <UserManagementSection t={t} />
      </Collapsible>
    </div>
  );
}
