import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  AccessGatewayError,
  type AccessGateway,
} from "../../application/access/AccessGateway";
import type { Database } from "./database.types";

const workerAuthOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

export function createUserSupabaseClient(
  url: string,
  publishableKey: string,
  accessToken: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, publishableKey, {
    auth: workerAuthOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function createAdminSupabaseClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, serviceRoleKey, {
    auth: workerAuthOptions,
  });
}

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createSupabaseAccessGateway(config: {
  url: string;
  publishableKey: string;
}): AccessGateway {
  return {
    async resolveAuthorizedUser(accessToken) {
      const userSupabase = createUserSupabaseClient(
        config.url,
        config.publishableKey,
        accessToken,
      );

      try {
        const {
          data: { user },
          error: userError,
        } = await userSupabase.auth.getUser(accessToken);

        if (userError || !user?.email) {
          if (userError?.status && userError.status >= 500) {
            throw new AccessGatewayError(
              "UPSTREAM_UNAVAILABLE",
              "Supabase Auth unavailable",
              503,
            );
          }
          throw new AccessGatewayError(
            "INVALID_TOKEN",
            "Supabase rejected the access token",
            401,
          );
        }

        const email = normalizedEmail(user.email);
        const { data: entitled, error: entitlementError } =
          await userSupabase.rpc("claim_active_entitlement", {
            p_email: email,
          });

        if (entitlementError) {
          throw new AccessGatewayError(
            "UPSTREAM_UNAVAILABLE",
            "Entitlement lookup failed",
            503,
          );
        }
        if (!entitled) {
          throw new AccessGatewayError(
            "INACTIVE_ENTITLEMENT",
            "No active entitlement",
            403,
          );
        }

        return {
          user: { userId: user.id, email },
          userSupabase,
        };
      } catch (error) {
        if (error instanceof AccessGatewayError) throw error;
        throw new AccessGatewayError(
          "UPSTREAM_UNAVAILABLE",
          "Access verification failed",
          503,
        );
      }
    },
  };
}
