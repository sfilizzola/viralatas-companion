import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getDuckEnabled } from '../lib/appSettings';

type DuckEnabledContextValue = {
  duckEnabled: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

// Default to `true` so the duck UI stays available while the initial fetch is
// in flight or if the Context is consumed outside the Provider (e.g. tests).
// The "next load" propagation rule means a one-time stale read is acceptable.
const DEFAULT_VALUE: DuckEnabledContextValue = {
  duckEnabled: true,
  loading: true,
  refresh: async () => {},
};

const DuckEnabledContext = createContext<DuckEnabledContextValue>(DEFAULT_VALUE);

export function DuckEnabledProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [duckEnabled, setDuckEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const value = await getDuckEnabled();
    setDuckEnabled(value);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      setLoading(false);
    });
  }, [refresh]);

  const contextValue = useMemo(
    () => ({ duckEnabled, loading, refresh }),
    [duckEnabled, loading, refresh],
  );

  return (
    <DuckEnabledContext.Provider value={contextValue}>
      {children}
    </DuckEnabledContext.Provider>
  );
}

export function useDuckEnabled(): boolean {
  return useContext(DuckEnabledContext).duckEnabled;
}

export function useRefreshDuckEnabled(): () => Promise<void> {
  return useContext(DuckEnabledContext).refresh;
}

export { DuckEnabledContext };
