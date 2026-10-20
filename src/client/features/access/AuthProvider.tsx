import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Outlet } from "react-router-dom";

import {
  getBrowserAuthClient,
  type AuthClient,
} from "../../lib/authClient";
import {
  PlannerClientError,
  createHttpPlannerClient,
} from "../../lib/plannerClient";

export type AuthStatus =
  | "loading"
  | "anonymous"
  | "authenticated"
  | "inactive"
  | "error";

export type AccessProbe = (session: Session) => Promise<void>;

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  client?: AuthClient;
  accessProbe?: AccessProbe;
  children?: ReactNode;
};

export function AuthProvider({
  client,
  accessProbe,
  children,
}: AuthProviderProps) {
  const auth = client ?? getBrowserAuthClient();
  const verifyAccess = useMemo<AccessProbe>(
    () =>
      accessProbe ??
      (async () => {
        await createHttpPlannerClient(fetch, auth).getMe();
      }),
    [accessProbe, auth],
  );
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;

    async function applySession(nextSession: Session | null) {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession) {
        setStatus("anonymous");
        return;
      }

      setStatus("loading");
      try {
        await verifyAccess(nextSession);
        if (active) setStatus("authenticated");
      } catch (error) {
        if (!active) return;
        setStatus(
          error instanceof PlannerClientError && error.status === 403
            ? "inactive"
            : "error",
        );
      }
    }

    void auth
      .getSession()
      .then(applySession)
      .catch(() => active && setStatus("error"));
    const unsubscribe = auth.onAuthStateChange((nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth, verifyAccess]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      async signOut() {
        await auth.signOut();
        setSession(null);
        setStatus("anonymous");
      },
    }),
    [auth, session, status],
  );

  return (
    <AuthContext.Provider value={value}>
      {children ?? <Outlet />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
