import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

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
