import { useState, useEffect, useCallback } from 'react';
import type { UserRole } from '../../types';
import { announcementsRepository } from '../../repositories';
import { Avatar, Button, Collapsible } from '../../ui';
import type { UserWithLoading } from './types';
import styles from '../../pages/ProfilePage.module.css';

type ManagerAdminPanelProps = {
  userId: string;
  t: (key: string, values?: Record<string, string | number>) => string;
};

function getInitial(displayName: string | null, email: string): string {
  if (displayName) return displayName.charAt(0).toUpperCase();
  return email.charAt(0).toUpperCase();
}

export default function ManagerAdminPanel({ userId, t }: ManagerAdminPanelProps) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<UserWithLoading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRole() {
      const role = await announcementsRepository.fetchCurrentUserRole(userId);
      setUserRole(role);
    }
    loadRole();
  }, [userId]);

  useEffect(() => {
    async function loadBlocked() {
      if (userRole === 'manager' || userRole === 'godlike') {
        try {
          const blocked = await announcementsRepository.fetchBlockedPostersWithUserDetails();
          setBlockedUsers(
            blocked.map((bp) => ({
              id: bp.user_id,
              email: bp.user_email,
              display_name: bp.user_display_name,
              avatar_url: bp.user_avatar_url,
              role: 'blocked',
              special_badges: [],
            })),
          );
        } catch (error) {
          console.error('Failed to load blocked users:', error);
        } finally {
          setLoading(false);
        }
      }
    }
    loadBlocked();
  }, [userRole]);

  const handleUnblock = useCallback(
    async (blockedUserId: string) => {
      if (!window.confirm(t('unblockConfirm'))) return;
      setBlockedUsers((prev) =>
        prev.map((u) => (u.id === blockedUserId ? { ...u, loading: true, error: undefined } : u)),
      );
      try {
        await announcementsRepository.unblockUser(blockedUserId);
        setBlockedUsers((prev) => prev.filter((u) => u.id !== blockedUserId));
      } catch (error) {
        console.error('Unblock failed:', error);
        setBlockedUsers((prev) =>
          prev.map((u) => (u.id === blockedUserId ? { ...u, error: t('unblockError') } : u)),
        );
        setTimeout(() => {
          setBlockedUsers((prev) =>
            prev.map((u) => (u.id === blockedUserId ? { ...u, error: undefined } : u)),
          );
        }, 3000);
      } finally {
        setBlockedUsers((prev) =>
          prev.map((u) => (u.id === blockedUserId ? { ...u, loading: false } : u)),
        );
      }
    },
    [t],
  );

  if (loading || userRole !== 'manager') return null;

  const trigger = <h3 className={styles.managerTitle}>MANAGER POWERS</h3>;

  return (
    <div className={styles.managerSection}>
      <Collapsible trigger={trigger}>
        <div className={styles.conflictsInner}>
          <div className={styles.managerSectionContent}>
            <div className={styles.blockedUsersSection}>
              <h4 className={styles.blockedUsersTitle}>{t('blockedUsers')}</h4>
              {blockedUsers.length === 0 ? (
                <p className={styles.emptyBlockedList}>{t('noBlockedUsers')}</p>
              ) : (
                <div className={styles.blockedUserList}>
                  {blockedUsers.map((user) => (
                    <div key={user.id} className={styles.blockedUserRow}>
                      <div className={styles.userInfo}>
                        <Avatar
                          size={40}
                          src={user.avatar_url}
                          initial={getInitial(user.display_name, user.email)}
                        />
                        <div className={styles.userDetails}>
                          <div className={styles.userDisplayName}>
                            {user.display_name || user.email}
                          </div>
                          <div className={styles.userEmail}>{user.email}</div>
                        </div>
                      </div>

                      {user.id === userId ? (
                        <div className={styles.cantUnblockSelf}>
                          {t('cantUnblockSelf') || 'Ask another manager'}
                        </div>
                      ) : (
                        <button
                          className={`${styles.userActionButton} ${user.loading ? styles.loading : ''}`}
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

                      {user.error && <p className={styles.userRowError}>{user.error}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Collapsible>
    </div>
  );
}
