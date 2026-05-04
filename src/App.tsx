import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import SchedulePage from './pages/SchedulePage';
import PrivateRoute from './components/PrivateRoute';
import { useAuth } from './hooks/useAuth';
import { syncBands } from './lib/sync';

function BandSync() {
  const { session } = useAuth();
  useEffect(() => {
    if (session) {
      syncBands().catch(() => {}); // swallow offline errors; bands stay in IndexedDB
    }
  }, [session?.user?.id]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <BandSync />
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
