import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type Props = { children: React.ReactNode };

export default function PrivateRoute({ children }: Props) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>Carregando...</span>
      </div>
    );
  }

  return session ? <>{children}</> : <Navigate to="/login" replace />;
}
