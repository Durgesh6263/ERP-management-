import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));
  const supabase = await createServerSupabaseClient();

  if (!code || !supabase) {
    return NextResponse.redirect(new URL("/login?error=callback_failed", request.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !(await getAuthContext())) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=account_unavailable", request.url));
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}