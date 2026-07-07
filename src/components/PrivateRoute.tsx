import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthBootstrapShell from './AuthBootstrapShell';
import PwaInstallAutoPrompt from './PwaInstallAutoPrompt';

type Props = { children: React.ReactNode };

export default function PrivateRoute({ children }: Props) {
  const { session, loading, sessionExpired } = useAuth();

  if (loading) {
    return <AuthBootstrapShell />;
  }

  if (session || sessionExpired) {
    return (
      <>
        {session && <PwaInstallAutoPrompt />}
        {children}
      </>
    );
  }

  return <Navigate to="/login" replace />;
}
