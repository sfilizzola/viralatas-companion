import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { usersRepository } from '../../repositories';
import { Avatar, Switch } from '../../ui';
import AssignBadgeModal from './AssignBadgeModal';
import { roleLabel } from './ProfileHeader';
import type { UserWithLoading } from './types';
import styles from '../../pages/ProfilePage.module.css';

type UserManagementSectionProps = {
  t: (key: string, values?: Record<string, string | number>) => string;
};

function getInitial(displayName: string | null, email: string): string {
  if (displayName) return displayName.charAt(0).toUpperCase();
  return email.charAt(0).toUpperCase();
}

function assignButtonLabel(t: UserManagementSectionProps['t'], badgeCount: number): string {
  if (badgeCount <= 0) return t('assignBadgeBtn');
  return `${t('assignBadgeBtn')} · ${badgeCount}`;
}

type UserRowProps = {
  user: UserWithLoading;
  isBlocked: boolean;
  t: UserManagementSectionProps['t'];
  onAssign: (user: UserWithLoading) => void;
  onToggleManager: (userId: string, currentRole: string) => void;
  onToggleFriend: (userId: string, isFriend: boolean | null | undefined) => void;
  onUnblock: (userId: string) => void;
};

function UserRow({
  user,
  isBlocked,
  t,
  onAssign,
  onToggleManager,
  onToggleFriend,
  onUnblock,
}: UserRowProps) {
  const isManager = user.role === 'manager';
  const isFriend = user.is_friend === true;
  const showToggles = user.role !== 'godlike';

  return (
    <div className={styles.userRow}>
      <div className={styles.userInfo}>
        <Avatar
          size={40}
          src={user.avatar_url}
          initial={getInitial(user.display_name, user.email)}
        />
        <div className={styles.userDetails}>
          <div className={styles.userDisplayName}>{user.display_name || user.email}</div>
          <div className={styles.userEmail}>{user.email}</div>
        </div>
        <div className={`${styles.roleBadge} ${styles[`roleBadge_${user.role}`]}`}>
          {roleLabel(user.role)}
        </div>
      </div>

      {showToggles && (
        <>
          <div className={styles.userStatusStrip}>
            <span
              className={[
                styles.userStatusPill,
                styles.userStatusPillManager,
                isManager ? styles.userStatusPillOn : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.userStatusDot} aria-hidden="true" />
              {t('statusManager')}
            </span>
            <span
              className={[
                styles.userStatusPill,
                styles.userStatusPillFriend,
                isFriend ? styles.userStatusPillOn : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.userStatusDot} aria-hidden="true" />
              {t('statusFriend')}
            </span>
            {isBlocked && (
              <span
                className={[
                  styles.userStatusPill,
                  styles.userStatusPillBlocked,
                  styles.userStatusPillOn,
                ].join(' ')}
              >
                <span className={styles.userStatusDot} aria-hidden="true" />
                {t('statusBlocked')}
              </span>
            )}
          </div>

          <div className={styles.userControlsBlock}>
            <div className={styles.userSwitchRow}>
              <div className={styles.userSwitchCopy}>
                <strong>{t('managerSwitchTitle')}</strong>
                <span>{isManager ? t('managerSwitchOn') : t('managerSwitchHint')}</span>
              </div>
              <Switch
                tone="manager"
                checked={isManager}
                disabled={user.loading}
                ariaLabel={t('managerSwitchTitle')}
                onChange={() => onToggleManager(user.id, user.role)}
              />
            </div>
            <div className={styles.userSwitchRow}>
              <div className={styles.userSwitchCopy}>
                <strong>{t('friendSwitchTitle')}</strong>
                <span>{isFriend ? t('friendSwitchOn') : t('friendSwitchHint')}</span>
              </div>
              <Switch
                tone="friend"
                checked={isFriend}
                disabled={user.loading}
                ariaLabel={t('friendSwitchTitle')}
                onChange={() => onToggleFriend(user.id, user.is_friend)}
              />
            </div>
          </div>
        </>
      )}

      <div className={styles.userActionSectionLabel}>{t('oneShotActions')}</div>
      <div className={styles.userActionToolbar}>
        <button
          className={`${styles.userActionButton} ${styles.actionBadge} ${user.loading ? styles.loading : ''}`}
          onClick={() => onAssign(user)}
          disabled={user.loading}
          type="button"
        >
          {assignButtonLabel(t, user.special_badges.length)}
        </button>
        {isBlocked && (
          <button
            className={`${styles.userActionButton} ${styles.actionUnblock} ${user.loading ? styles.loading : ''}`}
            onClick={() => onUnblock(user.id)}
            disabled={user.loading}
            type="button"
          >
            {user.loading ? <span className={styles.spinner}>⏳</span> : t('unblockUser')}
          </button>
        )}
      </div>

      {user.error && <p className={styles.userRowError}>{user.error}</p>}
    </div>
  );
}

export default function UserManagementSection({ t }: UserManagementSectionProps) {
  const [allUsers, setAllUsers] = useState<UserWithLoading[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [blockedPosters, setBlockedPosters] = useState<Array<{ user_id: string }>>([]);
  const [assignModalUser, setAssignModalUser] = useState<UserWithLoading | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const [users, blocked] = await Promise.all([
          usersRepository.fetchAllUsers(),
          usersRepository.fetchBlockedPostersWithUserDetails(),
        ]);
        setAllUsers(users.map((u) => ({ ...u, special_badges: u.special_badges ?? [] })) as UserWithLoading[]);
        setBlockedPosters(blocked.map((b) => ({ user_id: b.user_id })));
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setUsersLoading(false);
      }
    }
    loadUsers();
  }, []);

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
        await usersRepository.setUserRole(targetUserId, newRole as 'normal' | 'manager');
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

  const handleToggleFriend = useCallback(
    async (targetUserId: string, currentValue: boolean | null | undefined) => {
      const newValue = currentValue === true ? null : true;
      setAllUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, loading: true, error: undefined } : u)),
      );
      try {
        const { error } = await supabase
          .from('users')
          .update({ is_friend: newValue })
          .eq('id', targetUserId);
        if (error) throw error;
        setAllUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, is_friend: newValue } : u)),
        );
      } catch (error) {
        console.error('Failed to toggle friend flag:', error);
        setAllUsers((prev) =>
          prev.map((u) =>
            u.id === targetUserId ? { ...u, error: t('erroRole') } : u,
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
    [t],
  );

  const handleUnblock = useCallback(
    async (targetUserId: string) => {
      if (!window.confirm(t('unblockConfirm'))) return;
      setAllUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, loading: true, error: undefined } : u)),
      );
      try {
        await usersRepository.unblockUser(targetUserId);
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
        setAssignModalUser((prev) => (prev ? { ...prev, special_badges: updated } : prev));
      }
      await usersRepository.syncCrew();
    },
    [assignModalUser],
  );

  return (
    <>
      <div className={styles.userManagementSection}>
        {usersLoading ? (
          <p className={styles.userListLoading}>{t('registeredUsersLoading')}</p>
        ) : allUsers.length === 0 ? (
          <p className={styles.emptyUserList}>{t('registeredUsersEmpty')}</p>
        ) : (
          <div className={styles.userList}>
            {allUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isBlocked={blockedPosters.some((bp) => bp.user_id === user.id)}
                t={t}
                onAssign={setAssignModalUser}
                onToggleManager={handlePromoteOrDemote}
                onToggleFriend={handleToggleFriend}
                onUnblock={handleUnblock}
              />
            ))}
          </div>
        )}
      </div>

      {assignModalUser && (
        <AssignBadgeModal
          targetUser={assignModalUser}
          onAssign={handleBadgeAssign}
          onClose={() => setAssignModalUser(null)}
          t={t}
        />
      )}
    </>
  );
}
