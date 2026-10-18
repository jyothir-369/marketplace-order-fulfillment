/**
 * components/auth/LoginForm.tsx — Step 3 exact spacing/content.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { cn } from "@/lib/utils";

export function LoginForm({ redirectTo = "/products", portal = "customer" }: { redirectTo?: string; portal?: "customer" | "vendor" }) {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password, portal: portal === "vendor" ? "vendor" : "customer" });
      const dest = portal === "vendor" ? "/vendor/products" : redirectTo;
      router.push(dest);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* 4. Email */}
      <div style={{ marginTop: 26 }}>
        <label style={{ display: "block" }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: "#0F2A5C", marginBottom: 8 }}>Email</span>
          <span style={{ position: "relative", display: "block" }}>
            <Mail style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, color: "#6B7A90", pointerEvents: "none" }} aria-hidden />
            <input
              type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@marketplace.dev"
              style={{ width: "100%", height: 52, borderRadius: 10, border: "1px solid #D9DEE6", background: "#FFFFFF", padding: "0 16px 0 44px", fontSize: 15, color: "#0F2A5C", outline: "none", boxSizing: "border-box" }}
            />
          </span>
        </label>
      </div>

      {/* 5. Password */}
      <div style={{ marginTop: 18 }}>
        <label style={{ display: "block" }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: "#0F2A5C", marginBottom: 8 }}>Password</span>
          <span style={{ position: "relative", display: "block" }}>
            <Lock style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, color: "#6B7A90", pointerEvents: "none" }} aria-hidden />
            <input
              type={showPassword ? "text" : "password"} required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{ width: "100%", height: 52, borderRadius: 10, border: "1px solid #D9DEE6", background: "#FFFFFF", padding: "0 44px 0 44px", fontSize: 15, color: "#0F2A5C", outline: "none", boxSizing: "border-box" }}
            />
            <button
              type="button" onClick={() => setShowPassword((s) => !s)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 0, cursor: "pointer", color: "#6B7A90" }}
              aria-label={showPassword ? "Hide password" : "Show password"} tabIndex={-1}
            >
              {showPassword ? <EyeOff style={{ width: 20, height: 20 }} /> : <Eye style={{ width: 20, height: 20 }} />}
            </button>
          </span>
        </label>
      </div>

      {/* 6. Sign in button */}
      <button
        type="submit" disabled={submitting}
        style={{ marginTop: 22, width: "100%", height: 52, borderRadius: 10, background: "#0F2A5C", color: "#fff", fontSize: 16, fontWeight: 600, border: "none", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxSizing: "border-box" }}
      >
        {submitting ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <ArrowRight style={{ width: 16, height: 16 }} />}
        {submitting ? "Signing in…" : "Sign in"}
      </button>

      {/* 7. Divider */}
      <div style={{ marginTop: 22, position: "relative", display: "flex", alignItems: "center" }}>
        <div style={{ flex: 1, height: 1, background: "#D9DEE6" }} />
        <span style={{ padding: "0 12px", fontSize: 13, color: "#8A94A6", background: "#FDFAF4", fontWeight: 500, whiteSpace: "nowrap" }}>OR</span>
        <div style={{ flex: 1, height: 1, background: "#D9DEE6" }} />
      </div>

      {/* 8. Sign in with Google */}
      <div style={{ marginTop: 22 }}>
        <div style={{ width: "100%", height: 52, borderRadius: 10, background: "#fff", border: "1px solid #D9DEE6", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
            <GoogleSignInButton portal={portal} />
          </GoogleOAuthProvider>
        </div>
      </div>

      {/* 9. New here */}
      <p style={{ marginTop: 20, textAlign: "center", fontSize: 15, color: "#6B7A90", whiteSpace: "nowrap" }}>
        New here?{" "}
        <Link href="/register" style={{ fontWeight: 600, color: "#C8861A", textDecoration: "none" }}>
          Create an account
        </Link>
      </p>

      {/* 10. Vendor Login */}
      <p style={{ marginTop: 16, textAlign: "center", fontSize: 15, color: "#C8861A", fontWeight: 600, whiteSpace: "nowrap", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C8861A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <Link href={portal === "vendor" ? "/login" : "/login?portal=vendor"} style={{ color: "#C8861A", fontWeight: 600, textDecoration: "none" }}>
          Vendor Login
        </Link>
      </p>

      {/* 11. Forgot password */}
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <Link href="/forgot-password" style={{ fontSize: 14, color: "#6B7A90", textDecoration: "underline" }}>
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
