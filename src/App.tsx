import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import LineupPage from './pages/LineupPage';
import MyPicksPage from './pages/MyPicksPage';
import PopularPage from './pages/PopularPage';
import RightNowPage from './pages/RightNowPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import WrapPage from './pages/WrapPage';
import MapPage from './pages/MapPage';
import FestivalsPage from './pages/FestivalsPage';
import PrivateRoute from './components/PrivateRoute';
import FestivalGate from './components/FestivalGate';
import AuthBootstrapShell from './components/AuthBootstrapShell';
import SessionExpiredBanner from './components/SessionExpiredBanner';
import SyncToast from './components/SyncToast';
import DuckToast from './components/DuckToast';
import { SyncOrchestration } from './components/sync';
import { ActiveFestivalProvider } from './components/festival/ActiveFestivalProvider';
import { DuckEnabledProvider } from './contexts/DuckEnabledContext';
import { useAuth } from './hooks/useAuth';

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <AuthBootstrapShell />;
  }

  return (
    <ActiveFestivalProvider>
      <SyncOrchestration />
      <SyncToast />
      <DuckToast />
      <SessionExpiredBanner />
      <Routes>
        <Route path="/" element={<Navigate to="/now" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/schedule"
          element={
            <PrivateRoute>
              <FestivalGate>
                <LineupPage />
              </FestivalGate>
            </PrivateRoute>
          }
        />
        <Route
          path="/my-picks"
          element={
            <PrivateRoute>
              <FestivalGate>
                <MyPicksPage />
              </FestivalGate>
            </PrivateRoute>
          }
        />
        <Route
          path="/popular"
          element={
            <PrivateRoute>
              <FestivalGate>
                <PopularPage />
              </FestivalGate>
            </PrivateRoute>
          }
        />
        <Route
          path="/now"
          element={
            <PrivateRoute>
              <FestivalGate>
                <RightNowPage />
              </FestivalGate>
            </PrivateRoute>
          }
        />
        <Route
          path="/announcements"
          element={
            <PrivateRoute>
              <FestivalGate>
                <AnnouncementsPage />
              </FestivalGate>
            </PrivateRoute>
          }
        />
        <Route
          path="/map"
          element={
            <PrivateRoute>
              <MapPage />
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
        <Route
          path="/festivals"
          element={
            <PrivateRoute>
              <FestivalsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/wrap"
          element={
            <PrivateRoute>
              <WrapPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/now" replace />} />
      </Routes>
    </ActiveFestivalProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DuckEnabledProvider>
        <SpeedInsights />
        <AppRoutes />
      </DuckEnabledProvider>
    </BrowserRouter>
  );
}
