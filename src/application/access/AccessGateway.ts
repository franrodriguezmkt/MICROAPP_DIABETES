import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../infrastructure/supabase/database.types";

export type AuthorizedUser = {
  userId: string;
  email: string;
};

export type AuthorizedAccess = {
  user: AuthorizedUser;
  userSupabase: SupabaseClient<Database>;
};

export type AccessGatewayErrorCode =
  | "INVALID_TOKEN"
  | "INACTIVE_ENTITLEMENT"
  | "UPSTREAM_UNAVAILABLE";

export class AccessGatewayError extends Error {
  constructor(
    readonly code: AccessGatewayErrorCode,
    message: string,
    readonly status: 401 | 403 | 503,
  ) {
    super(message);
    this.name = "AccessGatewayError";
  }
}

export interface AccessGateway {
  resolveAuthorizedUser(accessToken: string): Promise<AuthorizedAccess>;
}
