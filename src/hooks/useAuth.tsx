import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import {
  clearSessionExpiredBannerDismissed,
  clearUserInitiatedSignOut,
  isUserInitiatedSignOut,
} from '../lib/authSessionFlags';
import { readSessionFromIdb } from '../lib/authStorage';
import {
  refreshAuthSessionInBackground,
  watchOnlineAuthRefresh,
} from '../lib/backgroundAuthRefresh';
import { supabase } from '../lib/supabase';

export type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  hadIdbSession: boolean;
  sessionExpired: boolean;
};

const defaultState: AuthState = {
  session: null,
  user: null,
  loading: true,
  hadIdbSession: false,
  sessionExpired: false,
};

const AuthContext = createContext<AuthState>(defaultState);

function handleAuthStateChange(
  event: AuthChangeEvent,
  session: Session | null,
  hadIdbSessionRef: { current: boolean },
  setState: React.Dispatch<React.SetStateAction<AuthState>>,
) {
  if (event === 'SIGNED_IN') {
    clearUserInitiatedSignOut();
    setState({
      session,
      user: session?.user ?? null,
      loading: false,
      hadIdbSession: !!session,
      sessionExpired: false,
    });
    return;
  }

  if (
    event === 'SIGNED_OUT' &&
    hadIdbSessionRef.current &&
    !isUserInitiatedSignOut()
  ) {
    setState((prev) => ({
      ...prev,
      sessionExpired: true,
      loading: false,
    }));
    return;
  }

  // Supabase INITIAL_SESSION is often null before async IDB storage resolves — keep IDB bootstrap.
  if (event === 'INITIAL_SESSION' && !session && hadIdbSessionRef.current) {
    setState((prev) => ({ ...prev, loading: false }));
    return;
  }

  setState((prev) => ({
    session,
    user: session?.user ?? null,
    loading: false,
    hadIdbSession: prev.hadIdbSession || !!session,
    sessionExpired: false,
  }));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(defaultState);
  const hadIdbSessionRef = useRef(false);

  useEffect(() => {
    let active = true;
    let unsubscribeAuth: (() => void) | undefined;

    clearSessionExpiredBannerDismissed();

    if (import.meta.env.DEV) {
      console.info('[cold-start] auth bootstrap begin');
    }
    const t0 = performance.now();

    const refreshOnOnline = () => {
      if (hadIdbSessionRef.current) {
        void refreshAuthSessionInBackground();
      }
    };
    const unwatchOnline = watchOnlineAuthRefresh(refreshOnOnline);

    void readSessionFromIdb()
      .then(({ session, hadIdbSession }) => {
        if (!active) return;
        hadIdbSessionRef.current = hadIdbSession;
        setState({
          session,
          user: session?.user ?? null,
          loading: false,
          hadIdbSession,
          sessionExpired: false,
        });
        if (import.meta.env.DEV) {
          console.info('[cold-start] auth bootstrap done', {
            ms: Math.round(performance.now() - t0),
            hasSession: !!session,
            hadIdbSession,
          });
        }
        if (hadIdbSession) {
          void refreshAuthSessionInBackground();
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, nextSession) => {
          handleAuthStateChange(event, nextSession, hadIdbSessionRef, setState);
        });
        unsubscribeAuth = () => subscription.unsubscribe();
      })
      .catch(() => {
        if (!active) return;
        setState({
          session: null,
          user: null,
          loading: false,
          hadIdbSession: false,
          sessionExpired: false,
        });

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, nextSession) => {
          handleAuthStateChange(event, nextSession, hadIdbSessionRef, setState);
        });
        unsubscribeAuth = () => subscription.unsubscribe();
      });

    return () => {
      active = false;
      unwatchOnline();
      unsubscribeAuth?.();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
