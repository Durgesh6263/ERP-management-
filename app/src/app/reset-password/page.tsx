import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePasswordAction } from "@/lib/auth/actions";
import { getAuthContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await getAuthContext())) redirect("/login?error=reset_session_required");
  const params = await searchParams;
  const error = params.error === "password_too_short"
    ? "Use a password with at least 12 characters."
    : params.error === "password_mismatch"
      ? "The passwords do not match."
      : params.error === "update_failed"
        ? "The password could not be updated. Request a new reset link."
        : params.error === "auth_unconfigured"
          ? "Authentication is not configured for this environment."
          : null;

  return (
    <main className="auth-page auth-page-compact">
      <section className="auth-panel" aria-labelledby="reset-title">
        <div className="auth-brand">
          <span className="auth-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>Manufacturing Workspace</span>
        </div>
        <p className="auth-eyebrow">Password recovery</p>
        <h1 id="reset-title">Choose a new password</h1>
        {error && <p className="auth-message auth-message-error" role="alert">{error}</p>}
        <form action={updatePasswordAction} className="auth-form">
          <label>
            New password
            <input autoComplete="new-password" minLength={12} name="password" required type="password" />
          </label>
          <label>
            Confirm password
            <input autoComplete="new-password" minLength={12} name="confirmation" required type="password" />
          </label>
          <button type="submit">Update password</button>
        </form>
        <Link className="auth-link" href="/login">Back to sign in</Link>
      </section>
    </main>
  );
}