import { Navigate } from 'react-router-dom';
import { useActiveFestival } from '../hooks/useActiveFestival';
import { hasFestivalFeature } from '../lib/festivalFeatures';
import type { FestivalFeatureKey } from '../types/festival';
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

type FeatureRouteProps = {
  feature: FestivalFeatureKey;
  children: React.ReactNode;
};

/** Redirects to /now when the Active Festival lacks the given feature flag. */
export function FeatureRoute({ feature, children }: FeatureRouteProps) {
  const { festival } = useActiveFestival();
  if (!hasFestivalFeature(festival, feature)) {
    return <Navigate to="/now" replace />;
  }
  return <>{children}</>;
}
