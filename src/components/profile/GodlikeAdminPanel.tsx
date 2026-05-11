import { useState, useEffect, useCallback, useRef } from 'react';
import type { Band, LiveBandTestConfig, UserRole } from '../../types';
import { supabase } from '../../lib/supabase';
import { announcementsRepository, bandsRepository, presenceRepository } from '../../repositories';
import { loadBands, loadAllUserPicks, loadLiveBandTestConfig, loadMetalPlaceConfig } from '../../lib/db';
import { getRegistrationEnabled, setRegistrationEnabled } from '../../lib/appSettings';
import { saveLiveBandTestConfigRemote } from '../../services/liveBandTest';
import Icon from '../icons/Icon';
import TimeTravelSection from './TimeTravelSection';
import AssignBadgeModal from './AssignBadgeModal';
import type { UserWithLoading } from './types';
import { roleLabel } from './ProfileHeader';
import styles from '../../pages/ProfilePage.module.css';

type GodlikeAdminPanelProps = {
  userId: string;
  t: (key: string, values?: Record<string, string | number>) => string;
};

function getInitial(displayName: string | null, email: string): string {
  if (displayName) return displayName.charAt(0).toUpperCase();
  return email.charAt(0).toUpperCase();
}

export default function GodlikeAdminPanel({ userId, t }: GodlikeAdminPanelProps) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<UserWithLoading[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [blockedPosters, setBlockedPosters] = useState<Array<{ user_id: string }>>([]);
  const [registrationEnabled, setRegistrationEnabledState] = useState(true);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [metalPlaceLoading, setMetalPlaceLoading] = useState(true);
  const [metalPlaceSaving, setMetalPlaceSaving] = useState(false);
  const [metalPlaceError, setMetalPlaceError] = useState<string | null>(null);
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [metalPlaceDay, setMetalPlaceDay] = useState<number | ''>(1);
  const [metalPlaceStartTime, setMetalPlaceStartTime] = useState('12:00');
  const [metalPlaceEndTime, setMetalPlaceEndTime] = useState('23:00');
  const previousTestModeRef = useRef(false);
  const [liveBandTestLoading, setLiveBandTestLoading] = useState(true);
  const [liveBandTestSaving, setLiveBandTestSaving] = useState(false);
  const [liveBandTestError, setLiveBandTestError] = useState<string | null>(null);
  const [liveBandTestSelectedId, setLiveBandTestSelectedId] = useState<string>('');
  const [liveBandTestEnabled, setLiveBandTestEnabled] = useState(false);
  const [liveBandTestActiveBandId, setLiveBandTestActiveBandId] = useState<string | null>(null);
  const [bandsByPopularity, setBandsByPopularity] = useState<Array<Band & { pickCount: number }>>([]);
  const [assignModalUser, setAssignModalUser] = useState<UserWithLoading | null>(null);

  useEffect(() => {
    async function loadRole() {
      const role = await announcementsRepository.fetchCurrentUserRole(userId);
      setUserRole(role);
      setLoading(false);
    }
    loadRole();
  }, [userId]);

  useEffect(() => {
    async function loadUsers() {
      try {
        const [users, blocked] = await Promise.all([
          announcementsRepository.fetchAllUsers(),
          announcementsRepository.fetchBlockedPostersWithUserDetails(),
        ]);
        setAllUsers(users.map((u) => ({ ...u, special_badges: u.special_badges ?? [] })) as UserWithLoading[]);
        setBlockedPosters(blocked.map((b) => ({ user_id: b.user_id })));
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setUsersLoading(false);
      }
    }
    if (userRole === 'godlike') loadUsers();
  }, [userRole]);

  useEffect(() => {
    async function loadRegistrationStatus() {
      try {
        const enabled = await getRegistrationEnabled();
        setRegistrationEnabledState(enabled);
      } catch (error) {
        console.error('Failed to load registration status:', error);
      }
    }
    if (userRole === 'godlike') loadRegistrationStatus();
  }, [userRole]);

  useEffect(() => {
    async function loadMetalPlaceConfigFromDB() {
      try {
        const config = await loadMetalPlaceConfig();
        if (config) {
          setMetalPlaceDay(config.festival_day || '');
          setMetalPlaceStartTime(config.start_time || '12:00');
          setMetalPlaceEndTime(config.end_time || '23:00');
          const isTestModeOn = config.test_override_day !== null && config.test_override_day !== undefined;
          setTestModeEnabled(isTestModeOn);
          previousTestModeRef.current = isTestModeOn;
        }
      } catch (error) {
        console.error('Failed to load Metal Place config:', error);
      } finally {
        setMetalPlaceLoading(false);
      }
    }
    if (userRole === 'godlike') loadMetalPlaceConfigFromDB();
  }, [userRole]);

  useEffect(() => {
    async function loadLiveBandTest() {
      try {
        const [allBands, allPicks, config] = await Promise.all([
          loadBands(),
          loadAllUserPicks(),
          loadLiveBandTestConfig(),
        ]);
        const counts = new Map<string, number>();
        for (const pick of allPicks) {
          counts.set(pick.band_id, (counts.get(pick.band_id) ?? 0) + 1);
        }
        const sorted = allBands
          .map((b) => ({ ...b, pickCount: counts.get(b.id) ?? 0 }))
          .sort((a, b) => {
            if (b.pickCount !== a.pickCount) return b.pickCount - a.pickCount;
            return a.name.localeCompare(b.name);
          });
        setBandsByPopularity(sorted);
        if (config) {
          setLiveBandTestSelectedId(config.band_id ?? '');
          setLiveBandTestEnabled(config.enabled ?? false);
          setLiveBandTestActiveBandId(config.enabled && config.band_id ? config.band_id : null);
        }
      } catch (error) {
        console.error('Failed to load Live Band Test config:', error);
      } finally {
        setLiveBandTestLoading(false);
      }
    }
    if (userRole === 'godlike') loadLiveBandTest();
  }, [userRole]);

  const handleResetAllData = useCallback(async () => {
    if (!window.confirm(t('resetConfirm'))) return;
    setResetting(true);
    setResetMessage(null);
    try {
      await bandsRepository.invalidateCacheForAllUsers();
      setResetMessage(t('resetSuccess'));
      setTimeout(() => setResetMessage(null), 4000);
    } catch (error) {
      console.error('Reset failed:', error);
      setResetMessage(t('resetError'));
      setTimeout(() => setResetMessage(null), 4000);
    } finally {
      setResetting(false);
    }
  }, [t]);

  const handleToggleRegistration = useCallback(async () => {
    setRegistrationLoading(true);
    setRegistrationError(null);
    try {
      const newValue = !registrationEnabled;
      await setRegistrationEnabled(newValue);
      setRegistrationEnabledState(newValue);
    } catch (error) {
      console.error('Failed to toggle registration:', error);
      setRegistrationError(t('registrationToggleError'));
      setTimeout(() => setRegistrationError(null), 3000);
    } finally {
      setRegistrationLoading(false);
    }
  }, [registrationEnabled, t]);

  const handlePromoteOrDemote = useCallback(
    async (targetUserId: string, currentRole: string) => {
      const newRole = currentRole === 'normal' ? 'manager' : 'normal';
      setAllUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, loading: true, error: undefined } : u)),
      );
      const originalUsers = [...allUsers];
      setAllUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u)),
      );
      try {
        await announcementsRepository.setUserRole(targetUserId, newRole as 'normal' | 'manager');
      } catch (error) {
        console.error('Failed to update user role:', error);
        setAllUsers(originalUsers);
        setAllUsers((prev) =>
          prev.map((u) =>
            u.id === targetUserId ? { ...u, role: currentRole, error: t('erroRole') } : u,
          ),
        );
        setTimeout(() => {
          setAllUsers((prev) =>
            prev.map((u) => (u.id === targetUserId ? { ...u, error: undefined } : u)),
          );
        }, 3000);
      } finally {
        setAllUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, loading: false } : u)),
        );
      }
    },
    [allUsers, t],
  );

  const handleUnblock = useCallback(
    async (targetUserId: string) => {
      if (!window.confirm(t('unblockConfirm'))) return;
      setAllUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, loading: true, error: undefined } : u)),
      );
      try {
        await announcementsRepository.unblockUser(targetUserId);
        setBlockedPosters((prev) => prev.filter((bp) => bp.user_id !== targetUserId));
      } catch (error) {
        console.error('Unblock failed:', error);
        setAllUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, error: t('unblockError') } : u)),
        );
        setTimeout(() => {
          setAllUsers((prev) =>
            prev.map((u) => (u.id === targetUserId ? { ...u, error: undefined } : u)),
          );
        }, 3000);
      } finally {
        setAllUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, loading: false } : u)),
        );
      }
    },
    [t],
  );

  const handleBadgeAssign = useCallback(
    async (targetUserId: string, badgeSlug: string, action: 'assign' | 'revoke') => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('assign-badge', {
        body: { targetUserId, badgeSlug, action },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      const updated: string[] = (res.data as { special_badges: string[] }).special_badges;
      setAllUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, special_badges: updated } : u)),
      );
      if (assignModalUser?.id === targetUserId) {
        setAssignModalUser((prev) => prev ? { ...prev, special_badges: updated } : prev);
      }
    },
    [assignModalUser],
  );

  if (loading || userRole !== 'godlike') return null;

  return (
    <div className={styles.godlikeSection}>
      <div className={styles.collapsibleCard}>
        <button
          className={styles.pfCollapseRow}
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          aria-expanded={isOpen}
        >
          <h3 className={styles.godlikeTitle}>🤘 GODLIKE POWERS</h3>
          <span className={`${styles.pfCollapseChevron} ${isOpen ? styles.open : ''}`}>
            <Icon name="chevron" size={14} />
          </span>
        </button>
        <div className={`${styles.pfCollapseContent} ${isOpen ? styles.open : ''}`}>
          <div className={styles.conflictsInner}>
            <div className={styles.godlikeSectionContent}>
              <button
                className={`${styles.resetButton} ${resetting ? styles.resetting : ''}`}
                onClick={handleResetAllData}
                disabled={resetting}
                type="button"
              >
                {resetting ? `${t('resetting')} ⏳` : t('resetAllData')}
              </button>

              {resetMessage && <p className={styles.resetMessage}>{resetMessage}</p>}

              <div className={styles.registrationControlContainer}>
                <label className={styles.registrationControlLabel}>
                  {t('registrationToggle')}
                  <button
                    className={`${styles.registrationToggleButton} ${registrationEnabled ? styles.enabled : styles.disabled}`}
                    onClick={handleToggleRegistration}
                    disabled={registrationLoading}
                    type="button"
                  >
                    {registrationLoading
                      ? t('registrationLoading')
                      : registrationEnabled
                        ? t('registrationEnabled')
                        : t('registrationDisabled')}
                  </button>
                </label>
                {registrationError && <p className={styles.registrationError}>{registrationError}</p>}
              </div>

              {!metalPlaceLoading && (
                <div className={styles.metalPlaceSection}>
                  <h4 className={styles.metalPlaceSectionTitle}>{t('metalPlaceTitle')}</h4>
                  {metalPlaceError && <div className={styles.metalPlaceError}>⚠️ {metalPlaceError}</div>}
                  <div className={styles.metalPlaceForm}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('metalPlaceFestivalDay')}</label>
                      <select
                        value={metalPlaceDay}
                        onChange={(e) => setMetalPlaceDay(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                        className={styles.formInput}
                        disabled={metalPlaceSaving}
                      >
                        <option value="">{t('metalPlaceDayUnset')}</option>
                        <option value={1}>{t('metalPlaceDay1')}</option>
                        <option value={2}>{t('metalPlaceDay2')}</option>
                        <option value={3}>{t('metalPlaceDay3')}</option>
                        <option value={4}>{t('metalPlaceDay4')}</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('metalPlaceStartTime')}</label>
                      <input
                        type="time"
                        value={metalPlaceStartTime}
                        onChange={(e) => setMetalPlaceStartTime(e.target.value)}
                        className={styles.formInput}
                        disabled={metalPlaceSaving}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('metalPlaceEndTime')}</label>
                      <input
                        type="time"
                        value={metalPlaceEndTime}
                        onChange={(e) => setMetalPlaceEndTime(e.target.value)}
                        className={styles.formInput}
                        disabled={metalPlaceSaving}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={testModeEnabled}
                          onChange={(e) => setTestModeEnabled(e.target.checked)}
                          disabled={metalPlaceSaving}
                        />
                        {t('metalPlaceTestMode')}
                      </label>
                      {testModeEnabled && (
                        <p className={styles.testModeHint}>{t('metalPlaceTestModeHint')}</p>
                      )}
                    </div>
                    <button
                      className={styles.saveButton}
                      onClick={async () => {
                        setMetalPlaceSaving(true);
                        setMetalPlaceError(null);
                        try {
                          const wasTestModeOn = previousTestModeRef.current;
                          const isTestModeNowOff = !testModeEnabled && wasTestModeOn;
                          const enablingTestMode = testModeEnabled && !wasTestModeOn;
                          const festivalDay = metalPlaceDay === '' ? null : metalPlaceDay;

                          if (enablingTestMode && liveBandTestActiveBandId) {
                            const ok = window.confirm(t('liveBandTestConflictWithMetalPlace'));
                            if (!ok) {
                              setMetalPlaceSaving(false);
                              return;
                            }
                            await saveLiveBandTestConfigRemote({ id: 1, band_id: null, enabled: false });
                            setLiveBandTestSelectedId('');
                            setLiveBandTestEnabled(false);
                            setLiveBandTestActiveBandId(null);
                          }

                          await presenceRepository.saveMetalPlaceConfigRemote({
                            id: 1,
                            festival_day: festivalDay,
                            start_time: metalPlaceStartTime || null,
                            end_time: metalPlaceEndTime || null,
                            test_override_day: testModeEnabled ? (festivalDay ?? 1) : null,
                          });

                          if (isTestModeNowOff) {
                            await presenceRepository.autoCheckoutAllUsers();
                          }

                          previousTestModeRef.current = testModeEnabled;
                        } catch (err) {
                          setMetalPlaceError(err instanceof Error ? err.message : t('metalPlaceSaveError'));
                        } finally {
                          setMetalPlaceSaving(false);
                        }
                      }}
                      disabled={metalPlaceSaving}
                    >
                      {metalPlaceSaving ? t('metalPlaceSaving') : t('metalPlaceSave')}
                    </button>
                  </div>
                </div>
              )}

              {!liveBandTestLoading && (
                <div className={styles.liveBandTestSection}>
                  <h4 className={styles.liveBandTestSectionTitle}>{t('liveBandTestTitle')}</h4>
                  <p className={styles.liveBandTestDescription}>{t('liveBandTestDescription')}</p>
                  {liveBandTestActiveBandId && (
                    <p className={styles.liveBandTestActive}>
                      {t('liveBandTestActive', {
                        band: bandsByPopularity.find((b) => b.id === liveBandTestActiveBandId)?.name ?? '?',
                      })}
                    </p>
                  )}
                  {liveBandTestError && <div className={styles.metalPlaceError}>⚠️ {liveBandTestError}</div>}
                  <div className={styles.metalPlaceForm}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{t('liveBandTestSelect')}</label>
                      <select
                        value={liveBandTestSelectedId}
                        onChange={(e) => setLiveBandTestSelectedId(e.target.value)}
                        className={styles.formInput}
                        disabled={liveBandTestSaving}
                      >
                        <option value="">{t('liveBandTestUnset')}</option>
                        {bandsByPopularity.map((band) => (
                          <option key={band.id} value={band.id}>
                            {band.name} — {band.pickCount}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={liveBandTestEnabled}
                          onChange={(e) => setLiveBandTestEnabled(e.target.checked)}
                          disabled={liveBandTestSaving || !liveBandTestSelectedId}
                        />
                        {t('liveBandTestEnable')}
                      </label>
                    </div>
                    <div className={styles.liveBandTestButtonRow}>
                      <button
                        className={styles.saveButton}
                        onClick={async () => {
                          setLiveBandTestSaving(true);
                          setLiveBandTestError(null);
                          try {
                            const enabling = liveBandTestEnabled && !!liveBandTestSelectedId;
                            if (enabling && previousTestModeRef.current) {
                              const ok = window.confirm(t('liveBandTestConflictWithMetalPlace'));
                              if (!ok) {
                                setLiveBandTestSaving(false);
                                return;
                              }
                              const festivalDay = metalPlaceDay === '' ? null : metalPlaceDay;
                              await presenceRepository.saveMetalPlaceConfigRemote({
                                id: 1,
                                festival_day: festivalDay,
                                start_time: metalPlaceStartTime || null,
                                end_time: metalPlaceEndTime || null,
                                test_override_day: null,
                              });
                              setTestModeEnabled(false);
                              previousTestModeRef.current = false;
                              await presenceRepository.autoCheckoutAllUsers();
                            }

                            const config: LiveBandTestConfig = {
                              id: 1,
                              band_id: liveBandTestSelectedId || null,
                              enabled: enabling,
                            };
                            await saveLiveBandTestConfigRemote(config);
                            setLiveBandTestActiveBandId(enabling ? liveBandTestSelectedId : null);
                          } catch (err) {
                            setLiveBandTestError(
                              err instanceof Error ? err.message : t('liveBandTestSaveError'),
                            );
                          } finally {
                            setLiveBandTestSaving(false);
                          }
                        }}
                        disabled={liveBandTestSaving}
                      >
                        {liveBandTestSaving ? t('metalPlaceSaving') : t('liveBandTestSave')}
                      </button>
                      <button
                        className={styles.liveBandTestClearButton}
                        onClick={async () => {
                          setLiveBandTestSaving(true);
                          setLiveBandTestError(null);
                          try {
                            await saveLiveBandTestConfigRemote({ id: 1, band_id: null, enabled: false });
                            setLiveBandTestSelectedId('');
                            setLiveBandTestEnabled(false);
                            setLiveBandTestActiveBandId(null);
                          } catch (err) {
                            setLiveBandTestError(
                              err instanceof Error ? err.message : t('liveBandTestSaveError'),
                            );
                          } finally {
                            setLiveBandTestSaving(false);
                          }
                        }}
                        disabled={liveBandTestSaving}
                        type="button"
                      >
                        {t('liveBandTestClear')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <TimeTravelSection />

              <div className={styles.userManagementSection}>
                <h4 className={styles.userManagementTitle}>{t('registeredUsers')}</h4>
                {usersLoading ? (
                  <p className={styles.userListLoading}>{t('registeredUsersLoading')}</p>
                ) : allUsers.length === 0 ? (
                  <p className={styles.emptyUserList}>{t('registeredUsersEmpty')}</p>
                ) : (
                  <div className={styles.userList}>
                    {allUsers.map((user) => (
                      <div key={user.id} className={styles.userRow}>
                        <div className={styles.userInfo}>
                          <div className={styles.userAvatar}>
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className={styles.userAvatarImg} />
                            ) : (
                              <span>{getInitial(user.display_name, user.email)}</span>
                            )}
                          </div>
                          <div className={styles.userDetails}>
                            <div className={styles.userDisplayName}>
                              {user.display_name || user.email}
                            </div>
                            <div className={styles.userEmail}>{user.email}</div>
                          </div>
                        </div>

                        <div className={styles.userActionArea}>
                          <div className={`${styles.roleBadge} ${styles[`roleBadge_${user.role}`]}`}>
                            {roleLabel(user.role)}
                          </div>

                          {user.special_badges.length > 0 && (
                            <span className={styles.assignedBadgeChip}>
                              {t('assignedBadgeCount', { count: user.special_badges.length })}
                            </span>
                          )}

                          <button
                            className={`${styles.userActionButton} ${styles.secondaryAction}`}
                            onClick={() => setAssignModalUser(user)}
                            type="button"
                          >
                            {t('assignBadgeBtn')}
                          </button>

                          {user.role !== 'godlike' && (
                            <button
                              className={`${styles.userActionButton} ${
                                user.role === 'manager' ? styles.secondaryAction : ''
                              } ${user.loading ? styles.loading : ''}`}
                              onClick={() => handlePromoteOrDemote(user.id, user.role)}
                              disabled={user.loading}
                              type="button"
                            >
                              {user.loading ? (
                                <span className={styles.spinner}>⏳</span>
                              ) : user.role === 'normal' ? (
                                t('promoverManager')
                              ) : (
                                t('removerManager')
                              )}
                            </button>
                          )}

                          {blockedPosters.some((bp) => bp.user_id === user.id) && (
                            <button
                              className={`${styles.userActionButton} ${styles.secondaryAction} ${
                                user.loading ? styles.loading : ''
                              }`}
                              onClick={() => handleUnblock(user.id)}
                              disabled={user.loading}
                              type="button"
                            >
                              {user.loading ? (
                                <span className={styles.spinner}>⏳</span>
                              ) : (
                                t('unblockUser')
                              )}
                            </button>
                          )}
                        </div>

                        {user.error && <p className={styles.userRowError}>{user.error}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {assignModalUser && (
        <AssignBadgeModal
          targetUser={assignModalUser}
          onAssign={handleBadgeAssign}
          onClose={() => setAssignModalUser(null)}
          t={t}
        />
      )}
    </div>
  );
}
