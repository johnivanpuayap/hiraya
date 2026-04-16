import { cache } from "react";

import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

import type { Database } from "@/types/database";

export function getUserRole(user: User): "student" | "teacher" | undefined {
  const role: unknown = user.app_metadata?.role;
  if (role === "student" || role === "teacher") {
    return role;
  }
  return undefined;
}

export async function getUserRoleWithFallback(
  user: User,
  supabase: SupabaseClient<Database>
): Promise<"student" | "teacher" | undefined> {
  const jwtRole = getUserRole(user);
  if (jwtRole) {
    return jwtRole;
  }

  // JWT hook may not have run yet — fall back to profiles table
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const dbRole: unknown = data?.role;
  if (dbRole === "student" || dbRole === "teacher") {
    return dbRole;
  }

  return undefined;
}

/**
 * Cached auth check — deduplicates getUser() + role lookup within a single
 * React Server Component request. Layout and page share the same result.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.debug("auth", "no authenticated user");
    return { user: null, role: undefined, supabase };
  }

  const role = await getUserRoleWithFallback(user, supabase);
  logger.debug("auth", "authenticated user", { userId: user.id, email: user.email, role });
  return { user, role, supabase };
});
