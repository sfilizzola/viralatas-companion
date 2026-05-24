import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import SchedulePage from './pages/SchedulePage';
import MyPicksPage from './pages/MyPicksPage';
import PopularPage from './pages/PopularPage';
import RightNowPage from './pages/RightNowPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
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
      </DuckEnabledProvider>
    </BrowserRouter>
  );
}
