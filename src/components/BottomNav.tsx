import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  return (
    <nav className={styles.nav}>
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
        <span>Agenda</span>
      </NavLink>

      <NavLink
        to="/profile"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        <span>Perfil</span>
      </NavLink>
    </nav>
  );
}
