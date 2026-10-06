import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const error = params.error === "invalid_email"
    ? "Enter a valid email address."
    : params.error === "auth_unconfigured"
      ? "Authentication is not configured for this environment."
      : params.error === "request_failed"
        ? "The reset request could not be processed. Try again later."
        : null;

  return (
    <main className="auth-page auth-page-compact">
      <section className="auth-panel" aria-labelledby="forgot-title">
        <div className="auth-brand">
          <span className="auth-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>Manufacturing Workspace</span>
        </div>
        <p className="auth-eyebrow">Password recovery</p>
        <h1 id="forgot-title">Reset your password</h1>
        <p className="auth-copy">Enter your account email and we will send a secure reset link.</p>
        {params.sent && <p className="auth-message" role="status">If the account exists, a reset link has been sent.</p>}
        {error && <p className="auth-message auth-message-error" role="alert">{error}</p>}
        <form action={requestPasswordResetAction} className="auth-form">
          <label>
            Email address
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <button type="submit">Send reset link</button>
        </form>
        <Link className="auth-link" href="/login">Back to sign in</Link>
      </section>
    </main>
  );
}