import { NavLink } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const { t } = useI18n('BottomNav');

  return (
    <nav className={styles.nav}>
      <NavLink
        to="/now"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span>{t('now')}</span>
      </NavLink>

      <NavLink
        to="/schedule"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{t('schedule')}</span>
      </NavLink>

      <NavLink
        to="/my-picks"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" />
        </svg>
        <span>{t('picks')}</span>
      </NavLink>

      <NavLink
        to="/popular"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M3 21h18" />
          <path d="M7 17V9" />
          <path d="M12 17V5" />
          <path d="M17 17v-6" />
        </svg>
        <span>{t('popular')}</span>
      </NavLink>

      <NavLink
        to="/announcements"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M3 11l19-9-9 19-2-8-8-2z" />
        </svg>
        <span>{t('mural')}</span>
      </NavLink>

      <NavLink
        to="/profile"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        <span>{t('profile')}</span>
      </NavLink>
    </nav>
  );
}
