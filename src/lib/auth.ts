import type { User } from "@supabase/supabase-js";

export function getUserRole(user: User): "student" | "teacher" | undefined {
  const role: unknown = user.app_metadata?.role;
  if (role === "student" || role === "teacher") {
    return role;
  }
  return undefined;
}
