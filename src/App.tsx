import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import LineupPage from './pages/LineupPage';
import MyWackenPage from './pages/MyWackenPage';
import PopularPage from './pages/PopularPage';
import RightNowPage from './pages/RightNowPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import WrapPage from './pages/WrapPage';
import MapPage from './pages/MapPage';
import PrivateRoute from './components/PrivateRoute';
import SyncToast from './components/SyncToast';
import DuckToast from './components/DuckToast';
import { SyncOrchestration } from './components/sync';
import { DuckEnabledProvider } from './contexts/DuckEnabledContext';

export default function App() {
  return (
    <BrowserRouter>
      <DuckEnabledProvider>
        <SpeedInsights />
        <SyncOrchestration />
        <SyncToast />
        <DuckToast />
        <Routes>
          <Route path="/" element={<Navigate to="/now" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/schedule"
            element={
              <PrivateRoute>
                <LineupPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-picks"
            element={
              <PrivateRoute>
                <MyWackenPage />
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
            path="/wrap"
            element={
              <PrivateRoute>
                <WrapPage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/now" replace />} />
        </Routes>
      </DuckEnabledProvider>
    </BrowserRouter>
  );
}
