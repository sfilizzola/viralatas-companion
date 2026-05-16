import type { UserRole } from '../../types';
import { Avatar, Chip } from '../../ui';
import styles from '../../pages/ProfilePage.module.css';

function countryFlag(code: string | null | undefined): string {
  const flags: Record<string, string> = {
    br: '🇧🇷', de: '🇩🇪', us: '🇺🇸', be: '🇧🇪', co: '🇨🇴', es: '🇪🇸',
  };
  return code ? (flags[code] ?? '') : '';
}

export function roleLabel(role: string): string {
  if (role === 'godlike') return 'Godlike';
  if (role === 'manager') return 'Manager';
  return 'Vira-latas';
}

type ProfileHeaderProps = {
  displayName: string;
  initial: string;
  avatarUrl: string | null;
  email: string;
  userRole: UserRole | null;
  savedCountry: string | null;
  savedWackenYears: number[];
  t: (key: string, values?: Record<string, string | number>) => string;
};

export default function ProfileHeader({
  displayName,
  initial,
  avatarUrl,
  email,
  userRole,
  savedCountry,
  savedWackenYears,
  t,
}: ProfileHeaderProps) {
  const flag = countryFlag(savedCountry);
  const roleVariant =
    userRole === 'godlike'
      ? 'role-godlike'
      : userRole === 'manager'
        ? 'role-manager'
        : 'role-normal';
  const wackenCount = savedWackenYears.length;
  const wackenLabel =
    wackenCount === 1
      ? t('wackenCountSingular', { count: wackenCount })
      : t('wackenCountPlural', { count: wackenCount });
  const sortedYears = [...savedWackenYears].sort((a, b) => a - b);
  const wackenTooltip = t('wackenCountTooltip', { years: sortedYears.join(', ') });

  return (
    <div className={styles.pfHead}>
      <Avatar size={56} src={avatarUrl} initial={initial} />
      <h1 className={styles.pfName}>{displayName}</h1>
      <p className={styles.pfEmail}>{email}</p>
      <div className={styles.pfMeta}>
        {userRole && (
          <Chip variant={roleVariant as 'role-godlike' | 'role-manager' | 'role-normal'}>
            {roleLabel(userRole)}
          </Chip>
        )}
        {flag && <span className={styles.pfCountryFlag}>{flag}</span>}
        {wackenCount > 0 && (
          <Chip className={styles.pfWackenChip}>
            <span title={wackenTooltip}>{wackenLabel}</span>
          </Chip>
        )}
      </div>
    </div>
  );
}
