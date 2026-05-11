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
};

export default function ProfileHeader({
  displayName,
  initial,
  avatarUrl,
  email,
  userRole,
  savedCountry,
  savedWackenYears,
}: ProfileHeaderProps) {
  const flag = countryFlag(savedCountry);
  const roleVariant =
    userRole === 'godlike'
      ? 'role-godlike'
      : userRole === 'manager'
        ? 'role-manager'
        : 'role-normal';

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
        {savedWackenYears.length > 0 && (
          <Chip>
            {savedWackenYears.length === 1 ? '1 Wacken' : `${savedWackenYears.length} Wackens`}
          </Chip>
        )}
      </div>
    </div>
  );
}
