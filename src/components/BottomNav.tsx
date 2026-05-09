import { NavLink } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import Icon from './icons/Icon';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const { t } = useI18n('BottomNav');

  return (
    <nav className={styles.nav}>
      <NavLink
        to="/now"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        {({ isActive }) => (
          <>
            <Icon name="live" size={18} filled={isActive} />
            <span>{t('now')}</span>
          </>
        )}
      </NavLink>

      <NavLink
        to="/schedule"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        {({ isActive }) => (
          <>
            <Icon name="schedule" size={18} filled={isActive} />
            <span>{t('schedule')}</span>
          </>
        )}
      </NavLink>

      <NavLink
        to="/my-picks"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        {({ isActive }) => (
          <>
            <Icon name="pick" size={18} filled={isActive} />
            <span>{t('picks')}</span>
          </>
        )}
      </NavLink>

      <NavLink
        to="/popular"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        {({ isActive }) => (
          <>
            <Icon name="popular" size={18} filled={isActive} />
            <span>{t('popular')}</span>
          </>
        )}
      </NavLink>

      <NavLink
        to="/announcements"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        {({ isActive }) => (
          <>
            <Icon name="mural" size={18} filled={isActive} />
            <span>{t('mural')}</span>
          </>
        )}
      </NavLink>

      <NavLink
        to="/profile"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        {({ isActive }) => (
          <>
            <Icon name="profile" size={18} filled={isActive} />
            <span>{t('profile')}</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
