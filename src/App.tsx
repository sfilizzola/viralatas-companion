import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import SchedulePage from './pages/SchedulePage';
import MyPicksPage from './pages/MyPicksPage';
import PopularPage from './pages/PopularPage';
import PrivateRoute from './components/PrivateRoute';
import { useAuth } from './hooks/useAuth';
import { syncBands } from './lib/sync';
import { flushOfflineQueue, syncCrewPicks } from './lib/picks';

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
      await flushOfflineQueue();
      await syncCrewPicks();
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
      <BandSync />
      <PickSync />
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
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/schedule" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
