import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  clearActiveFestivalId,
  getActiveFestivalId,
  loadFestivalCatalog,
  loadFestivalMemberships,
} from '../../lib/db/festivals';
import { useAuth } from '../../hooks/useAuth';
import { festivalsRepository } from '../../repositories/festivals';
import type { Festival, FestivalFeatures, FestivalMembership } from '../../types';

export type ActiveFestivalContextValue = {
  festival: Festival | null;
  features: FestivalFeatures;
  memberships: FestivalMembership[];
  catalog: Festival[];
  setActive: (festivalId: string) => Promise<void>;
  optIn: (festivalId: string) => Promise<void>;
  optOut: (festivalId: string) => Promise<void>;
  ready: boolean;
  activeFestivalId: string | null;
};

const DEFAULT_VALUE: ActiveFestivalContextValue = {
  festival: null,
  features: {},
  memberships: [],
  catalog: [],
  setActive: async () => {},
  optIn: async () => {},
  optOut: async () => {},
  ready: false,
  activeFestivalId: null,
};

export const ActiveFestivalContext = createContext<ActiveFestivalContextValue>(DEFAULT_VALUE);

export function ActiveFestivalProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [ready, setReady] = useState(false);
  const [catalog, setCatalog] = useState<Festival[]>([]);
  const [memberships, setMemberships] = useState<FestivalMembership[]>([]);
  const [activeFestivalId, setActiveFestivalIdState] = useState<string | null>(null);
  /** Prevents re-entrant pack switch while hydrate is already reconciling server active id. */
  const reconcilingActiveRef = useRef(false);

  const hydrate = useCallback(async (uid: string) => {
    let activeId = await getActiveFestivalId();
    // Offline-first: seed from IDB before (or instead of) network sync.
    let nextCatalog = await loadFestivalCatalog();
    let nextMemberships = await loadFestivalMemberships();

    try {
      [nextCatalog, nextMemberships] = await Promise.all([
        festivalsRepository.syncCatalog(),
        festivalsRepository.syncMyMemberships(uid),
      ]);
    } catch {
      // Offline / sync failure — keep IDB catalog + memberships.
    }

    if (
      typeof navigator !== 'undefined' &&
      navigator.onLine &&
      !reconcilingActiveRef.current
    ) {
      try {
        const serverId = await festivalsRepository.fetchServerActiveFestivalId(uid);
        if (serverId !== activeId) {
          if (serverId) {
            reconcilingActiveRef.current = true;
            try {
              // Full pack switch — do not meta-only update (would orphan empty pack).
              await festivalsRepository.setActiveFestival(uid, serverId);
              activeId = serverId;
            } finally {
              reconcilingActiveRef.current = false;
            }
          } else {
            await clearActiveFestivalId();
            activeId = null;
          }
        }
      } catch {
        // Keep IDB active id if server reconcile / pack switch fails.
        reconcilingActiveRef.current = false;
      }
    }

    setCatalog(nextCatalog);
    setMemberships(nextMemberships);
    setActiveFestivalIdState(activeId);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!userId) {
      setCatalog([]);
      setMemberships([]);
      setActiveFestivalIdState(null);
      setReady(true);
      return;
    }

    setReady(false);
    let cancelled = false;
    void hydrate(userId).catch(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, hydrate]);

  const setActive = useCallback(
    async (festivalId: string) => {
      if (!userId) return;
      await festivalsRepository.setActiveFestival(userId, festivalId);
      await hydrate(userId);
    },
    [userId, hydrate],
  );

  const optIn = useCallback(
    async (festivalId: string) => {
      if (!userId) return;
      await festivalsRepository.optIn(userId, festivalId);
      await hydrate(userId);
    },
    [userId, hydrate],
  );

  const optOut = useCallback(
    async (festivalId: string) => {
      if (!userId) return;
      await festivalsRepository.optOut(userId, festivalId);
      await hydrate(userId);
    },
    [userId, hydrate],
  );

  const festival = useMemo(
    () => (activeFestivalId ? (catalog.find((f) => f.id === activeFestivalId) ?? null) : null),
    [catalog, activeFestivalId],
  );

  const features = festival?.features ?? {};

  const contextValue = useMemo(
    () => ({
      festival,
      features,
      memberships,
      catalog,
      setActive,
      optIn,
      optOut,
      ready,
      activeFestivalId,
    }),
    [festival, features, memberships, catalog, setActive, optIn, optOut, ready, activeFestivalId],
  );

  return (
    <ActiveFestivalContext.Provider value={contextValue}>
      {children}
    </ActiveFestivalContext.Provider>
  );
}
