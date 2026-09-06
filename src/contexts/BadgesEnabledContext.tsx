import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getBadgesEnabled } from '../lib/appSettings';

type BadgesEnabledContextValue = {
  badgesEnabled: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  setEnabled: (value: boolean) => void;
};

// Fail-hidden: default to `false` so badges stay hidden while the initial fetch
// is in flight, when the fetch fails, or when the Context is consumed outside
// the Provider. A user must never see a badge flash before the flag is known.
const DEFAULT_VALUE: BadgesEnabledContextValue = {
  badgesEnabled: false,
  loading: true,
  refresh: async () => {},
  setEnabled: () => {},
};

const BadgesEnabledContext = createContext<BadgesEnabledContextValue>(DEFAULT_VALUE);

export function BadgesEnabledProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [badgesEnabled, setBadgesEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Monotonic request id. Every fetch claims the next id, and only the holder of
  // the current id may write state. This makes the newest request authoritative
  // regardless of resolution order (a slow initial fetch can never clobber a
  // newer refresh), and unmount cleanup bumps the id to drop every request still
  // in flight.
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    const requestId = (requestIdRef.current += 1);

    // setState happens only in the promise callbacks below, never synchronously
    // in the effect body, so this does not trigger cascading renders.
    getBadgesEnabled().then(
      (value) => {
        if (requestId !== requestIdRef.current) return;
        setBadgesEnabled(value);
        setLoading(false);
      },
      () => {
        if (requestId !== requestIdRef.current) return;
        // Fail-hidden: leave badgesEnabled false, just stop loading.
        setLoading(false);
      },
    );

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  const refresh = useCallback(async () => {
    const requestId = (requestIdRef.current += 1);
    try {
      const value = await getBadgesEnabled();
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setBadgesEnabled(value);
      setLoading(false);
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setLoading(false);
    }
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    if (!mountedRef.current) return;
    // A confirmed write is newer than every read already in flight. Invalidate
    // those requests so an offline/defaulted response cannot clobber it.
    requestIdRef.current += 1;
    setBadgesEnabled(value);
    setLoading(false);
  }, []);

  const contextValue = useMemo(
    () => ({ badgesEnabled, loading, refresh, setEnabled }),
    [badgesEnabled, loading, refresh, setEnabled],
  );

  return (
    <BadgesEnabledContext.Provider value={contextValue}>
      {children}
    </BadgesEnabledContext.Provider>
  );
}

export function useBadgesEnabled(): boolean {
  return useContext(BadgesEnabledContext).badgesEnabled;
}

export function useRefreshBadgesEnabled(): () => Promise<void> {
  return useContext(BadgesEnabledContext).refresh;
}

export function useSetBadgesEnabled(): (value: boolean) => void {
  return useContext(BadgesEnabledContext).setEnabled;
}

export { BadgesEnabledContext };
