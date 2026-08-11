import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearActiveFestivalId,
  getActiveFestivalId,
  setActiveFestivalId,
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

  const hydrate = useCallback(async (uid: string) => {
    let activeId = await getActiveFestivalId();

    let nextCatalog: Festival[] = [];
    let nextMemberships: FestivalMembership[] = [];
    try {
      [nextCatalog, nextMemberships] = await Promise.all([
        festivalsRepository.syncCatalog(),
        festivalsRepository.syncMyMemberships(uid),
      ]);
    } catch {
      // Offline / sync failure — still finish hydrate with IDB active id.
    }

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const serverId = await festivalsRepository.fetchServerActiveFestivalId(uid);
        if (serverId !== activeId) {
          if (serverId) {
            await setActiveFestivalId(serverId);
          } else {
            await clearActiveFestivalId();
          }
          activeId = serverId;
        }
      } catch {
        // Keep IDB active id if server reconcile fails.
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
