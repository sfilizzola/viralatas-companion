import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import SchedulePage from './pages/SchedulePage';
import MyPicksPage from './pages/MyPicksPage';
import PopularPage from './pages/PopularPage';
import RightNowPage from './pages/RightNowPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import PrivateRoute from './components/PrivateRoute';
import SyncToast, { SYNC_COMPLETE_EVENT } from './components/SyncToast';
import { useAuth } from './hooks/useAuth';
import { syncBands } from './lib/sync';
import { flushOfflineQueue, syncCrewPicks } from './lib/picks';
import { syncCrewUsers } from './lib/users';
import { flushPresenceQueue, syncCrewPresence } from './lib/presence';
import { flushPendingAnnouncements, syncAnnouncements } from './lib/announcements';
import { checkAndApplyCacheVersion } from './lib/cache';

function emitSyncComplete() {
  window.dispatchEvent(new Event(SYNC_COMPLETE_EVENT));
}

function CacheVersionCheck() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      checkAndApplyCacheVersion().catch(() => {});
    }
  }, [userId]);

  return null;
}

function BandSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      syncBands().catch(() => {}); // swallow offline errors; bands stay in IndexedDB
    }
  }, [userId]);

  return null;
}

function PickSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    async function syncNow() {
      const [picksFlushed, presenceFlushed] = await Promise.all([
        flushOfflineQueue(),
        flushPresenceQueue(),
      ]);
      if (picksFlushed + presenceFlushed > 0) emitSyncComplete();
      await Promise.all([syncCrewPicks(), syncCrewUsers(), syncCrewPresence()]);
    }

    syncNow().catch(() => {});

    function handleOnline() {
      syncNow().catch(() => {});
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId]);

  return null;
}

function AnnouncementSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    async function syncNow() {
      const flushed = await flushPendingAnnouncements();
      if (flushed > 0) emitSyncComplete();
      await syncAnnouncements();
    }

    syncNow().catch(() => {});

    function handleOnline() {
      syncNow().catch(() => {});
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <CacheVersionCheck />
      <BandSync />
      <PickSync />
      <AnnouncementSync />
      <SyncToast />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/schedule"
          element={
            <PrivateRoute>
              <SchedulePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/my-picks"
          element={
            <PrivateRoute>
              <MyPicksPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/popular"
          element={
            <PrivateRoute>
              <PopularPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/now"
          element={
            <PrivateRoute>
              <RightNowPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/announcements"
          element={
            <PrivateRoute>
              <AnnouncementsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/now" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
