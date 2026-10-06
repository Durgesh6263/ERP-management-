"use server";

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function siteUrl(path: string): string {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${origin}${path}`;
}

export async function signInAction(formData: FormData): Promise<never> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!isValidEmail(email) || !password) redirect("/login?error=invalid_credentials");

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login?error=auth_unconfigured");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=invalid_credentials");

  if (!(await getAuthContext())) {
    await supabase.auth.signOut();
    redirect("/login?error=account_unavailable");
  }

  redirect("/");
}

export async function requestPasswordResetAction(formData: FormData): Promise<never> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) redirect("/forgot-password?error=invalid_email");

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/forgot-password?error=auth_unconfigured");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: siteUrl("/auth/callback?next=/reset-password"),
  });

  redirect(error ? "/forgot-password?error=request_failed" : "/forgot-password?sent=1");
}

export async function updatePasswordAction(formData: FormData): Promise<never> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (password.length < 12) redirect("/reset-password?error=password_too_short");
  if (password !== confirmation) redirect("/reset-password?error=password_mismatch");

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/reset-password?error=auth_unconfigured");
  if (!(await getAuthContext())) redirect("/login?error=reset_session_required");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/reset-password?error=update_failed");
  redirect("/?notice=password_updated");
}

export async function signOutAction(): Promise<never> {
  const supabase = await createServerSupabaseClient();
  await supabase?.auth.signOut();
  redirect("/login?notice=signed_out");
}