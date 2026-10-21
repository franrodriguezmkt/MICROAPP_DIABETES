import { createClient, type Session } from "@supabase/supabase-js";

const pendingEmailKey = "mi-semana:pending-email";
const previewSessionKey = "mi-semana:preview-session";
const previewOtp = "123456";

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

function createPreviewBrowserAuthClient(storage: Storage): AuthClient {
  const listeners = new Set<(session: Session | null) => void>();

  function readSession() {
    const raw = storage.getItem(previewSessionKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      storage.removeItem(previewSessionKey);
      return null;
    }
  }

  function publish(session: Session | null) {
    for (const listener of listeners) listener(session);
  }

  const auth: BrowserAuthPort = {
    async verifyOtp({ email, token }) {
      if (token !== previewOtp) {
        return { data: { session: null }, error: new Error("Invalid preview OTP") };
      }

      const now = Math.floor(Date.now() / 1000);
      const session = {
        access_token: `preview-access-${email}`,
        refresh_token: "preview-refresh",
        expires_in: 3600,
        expires_at: now + 3600,
        token_type: "bearer",
        user: {
          id: `preview-${email}`,
          email,
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date(now * 1000).toISOString(),
        },
      } as Session;
      storage.setItem(previewSessionKey, JSON.stringify(session));
      publish(session);
      return { data: { session }, error: null };
    },
    async getSession() {
      const session = readSession();
      return { data: { session }, error: null };
    },
    async refreshSession() {
      return { data: { session: readSession() }, error: null };
    },
    onAuthStateChange(listener) {
      listeners.add(listener);
      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners.delete(listener);
            },
          },
        },
      };
    },
    async signOut() {
      storage.removeItem(previewSessionKey);
      publish(null);
      return { error: null };
    },
  };

  return createAuthClient({
    auth,
    storage,
    fetcher: async () =>
      new Response(JSON.stringify({ data: { message: "preview accepted" } }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
  });
}

export function getBrowserAuthClient(): AuthClient {
  if (browserClient) return browserClient;

  if (import.meta.env.DEV && import.meta.env.VITE_AUTH_PREVIEW === "true") {
    browserClient = createPreviewBrowserAuthClient(window.sessionStorage);
    return browserClient;
  }

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
