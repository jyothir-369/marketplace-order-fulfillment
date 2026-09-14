/**
 * components/auth/RegisterForm.tsx — public buyer self-registration (Phase 1).
 *
 * The backend only provisions BUYER accounts from this endpoint; vendor/admin/
 * operations accounts are seeded. After a successful registration the account
 * is signed in automatically.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { UserPlus, Loader2, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export function RegisterForm({ redirectTo = "/products" }: { redirectTo?: string }) {
  const { register } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await register({ email, password, displayName: displayName.trim() || undefined });
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  }

  const inputClasses = cn(
    "w-full rounded-lg border border-[var(--color-warm-border)] bg-[var(--color-card)]",
    "px-3.5 py-2.5 text-sm text-[var(--color-foreground)]",
    "placeholder:text-[var(--color-warm-muted)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]/40 focus:border-[var(--color-brass)]",
    "transition-all duration-150",
  );

  const fieldIcon = (Icon: typeof Mail) => (
    <Icon
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-warm-muted)]"
      aria-hidden
    />
  );

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
          Display name <span className="text-[var(--color-warm-muted)]">(optional)</span>
        </span>
        <span className="relative block">
          {fieldIcon(User)}
          <input
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Jane Shopper"
            className={cn(inputClasses, "pl-9")}
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
          Email
        </span>
        <span className="relative block">
          {fieldIcon(Mail)}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={cn(inputClasses, "pl-9")}
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
          Password
        </span>
        <span className="relative block">
          {fieldIcon(Lock)}
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={cn(inputClasses, "pl-9")}
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
          Confirm password
        </span>
        <span className="relative block">
          {fieldIcon(Lock)}
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat your password"
            className={cn(inputClasses, "pl-9")}
          />
        </span>
      </label>

      <button
        type="submit"
        disabled={submitting}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold",
          "bg-[var(--color-ink-navy)] text-[var(--color-primary-foreground)]",
          "hover:bg-[var(--color-primary-hover)] transition-all duration-200 shadow-xs hover:shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-brass)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <UserPlus className="h-4 w-4" aria-hidden />
        )}
        {submitting ? "Creating account…" : "Create account"}
      </button>

      <p className="pt-1 text-center text-sm text-[var(--color-warm-muted)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--color-brass)] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}