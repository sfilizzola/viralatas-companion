import { Navigate } from 'react-router-dom';
import { useActiveFestival } from '../hooks/useActiveFestival';
import AuthBootstrapShell from './AuthBootstrapShell';

type Props = { children: React.ReactNode };

export default function FestivalGate({ children }: Props) {
  const { ready, memberships, activeFestivalId } = useActiveFestival();

  if (!ready) {
    return <AuthBootstrapShell />;
  }

  if (memberships.length === 0 || !activeFestivalId) {
    return <Navigate to="/festivals" replace />;
  }

  return <>{children}</>;
}
