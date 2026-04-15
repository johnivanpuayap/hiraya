import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    console.error("[auth] callback missing code parameter");
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth] callback code exchange failed", { error: error.message });
    return NextResponse.redirect(`${origin}/login`);
  }

  console.info("[auth] callback code exchanged successfully");
  return NextResponse.redirect(`${origin}${next}`);
}
