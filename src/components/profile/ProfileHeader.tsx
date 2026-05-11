import type { UserRole } from '../../types';
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

  return (
    <div className={styles.pfHead}>
      <div className={styles.pfAvatarWrap}>
        {avatarUrl ? (
          <img className={styles.pfAvatarImg} src={avatarUrl} alt="" />
        ) : (
          <span className={styles.pfAvatarInitial} aria-hidden>{initial}</span>
        )}
      </div>
      <h1 className={styles.pfName}>{displayName}</h1>
      <p className={styles.pfEmail}>{email}</p>
      <div className={styles.pfMeta}>
        {userRole && (
          <span className={`${styles.pfRoleChip} ${styles[`pfRole_${userRole}`]}`}>
            {roleLabel(userRole)}
          </span>
        )}
        {flag && <span className={styles.pfCountryFlag}>{flag}</span>}
        {savedWackenYears.length > 0 && (
          <span className={styles.pfYearsPill}>
            {savedWackenYears.length === 1 ? '1 Wacken' : `${savedWackenYears.length} Wackens`}
          </span>
        )}
      </div>
    </div>
  );
}
