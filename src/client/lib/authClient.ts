import { createClient, type Session } from "@supabase/supabase-js";

const pendingEmailKey = "mi-semana:pending-email";

export type AuthClientErrorCode =
  | "REQUEST_FAILED"
  | "OTP_INVALID"
  | "SESSION_UNAVAILABLE"
  | "CONFIG_UNAVAILABLE";

export class AuthClientError extends Error {
  constructor(
    readonly code: AuthClientErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AuthClientError";
  }
}

type AuthResult = {
  data: { session: Session | null };
  error: unknown | null;
};

export interface BrowserAuthPort {
  verifyOtp(input: {
    email: string;
    token: string;
    type: "email";
  }): Promise<AuthResult>;
  getSession(): Promise<AuthResult>;
  refreshSession(): Promise<AuthResult>;
  onAuthStateChange(
    listener: (session: Session | null) => void,
  ): { data: { subscription: { unsubscribe(): void } } };
  signOut(): Promise<{ error: unknown | null }>;
}

export interface AuthClient {
  requestOtp(email: string): Promise<void>;
  verifyOtp(email: string, token: string): Promise<Session>;
  getSession(): Promise<Session | null>;
  refreshSession(): Promise<Session | null>;
  onAuthStateChange(listener: (session: Session | null) => void): () => void;
  signOut(): Promise<void>;
  getPendingEmail(): string | null;
}

type CreateAuthClientOptions = {
  auth: BrowserAuthPort;
  fetcher?: typeof fetch;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createAuthClient({
  auth,
  fetcher = fetch,
  storage,
}: CreateAuthClientOptions): AuthClient {
  return {
    async requestOtp(email) {
      const normalized = normalizeEmail(email);
      const response = await fetcher("/api/access/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      if (!response.ok) {
        throw new AuthClientError(
          "REQUEST_FAILED",
          "No pudimos solicitar el código.",
        );
      }
      storage.setItem(pendingEmailKey, normalized);
    },

    async verifyOtp(email, token) {
      const { data, error } = await auth.verifyOtp({
        email: normalizeEmail(email),
        token,
        type: "email",
      });
      if (error || !data.session) {
        throw new AuthClientError("OTP_INVALID", "OTP verification failed");
      }
      storage.removeItem(pendingEmailKey);
      return data.session;
    },

    async getSession() {
      const { data, error } = await auth.getSession();
      if (error) {
        throw new AuthClientError(
          "SESSION_UNAVAILABLE",
          "Session restoration failed",
        );
      }
      return data.session;
    },

    async refreshSession() {
      const { data, error } = await auth.refreshSession();
      if (error) {
        throw new AuthClientError(
          "SESSION_UNAVAILABLE",
          "Session refresh failed",
        );
      }
      return data.session;
    },

    onAuthStateChange(listener) {
      const { data } = auth.onAuthStateChange(listener);
      return () => data.subscription.unsubscribe();
    },

    async signOut() {
      const { error } = await auth.signOut();
      if (error) {
        throw new AuthClientError("SESSION_UNAVAILABLE", "Sign out failed");
      }
      storage.removeItem(pendingEmailKey);
    },

    getPendingEmail() {
      return storage.getItem(pendingEmailKey);
    },
  };
}

let browserClient: AuthClient | undefined;

export function getBrowserAuthClient(): AuthClient {
  if (browserClient) return browserClient;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new AuthClientError(
      "CONFIG_UNAVAILABLE",
      "Supabase browser configuration is missing",
    );
  }

  const supabase = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  const auth: BrowserAuthPort = {
    verifyOtp: (input) => supabase.auth.verifyOtp(input),
    getSession: () => supabase.auth.getSession(),
    refreshSession: () => supabase.auth.refreshSession(),
    onAuthStateChange(listener) {
      return supabase.auth.onAuthStateChange((_event, session) =>
        listener(session),
      );
    },
    signOut: () => supabase.auth.signOut(),
  };
  browserClient = createAuthClient({
    auth,
    storage: window.sessionStorage,
  });
  return browserClient;
}
