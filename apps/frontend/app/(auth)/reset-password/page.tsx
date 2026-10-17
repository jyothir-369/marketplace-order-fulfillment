"use client";
import Link from "next/link";
import { useState } from "react";

export default function ResetPasswordPage() {
  const [searchParams] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  });
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setStatus("error");
      setMessage("Missing reset token.");
      return;
    }
    if (password !== confirm) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("done");
        setMessage(data.message || "Password updated securely.");
      } else {
        setStatus("error");
        setMessage(data.message || "Reset failed.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="rounded-2xl border border-stone-300 bg-white p-8 shadow-sm max-w-md mx-auto">
      <h1 className="text-2xl font-semibold">Set new password</h1>
      <p className="mt-2 text-sm text-stone-500">Enter a new password for your account.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="password"
          required
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        {confirm && confirm !== password && <p className="text-xs text-red-600">Passwords don&apos;t match.</p>}
        <button type="submit" disabled={status === "sending" || !token || !password || password !== confirm} className="w-full rounded-lg bg-slate-900 text-white px-4 py-2.5 font-semibold disabled:opacity-60">
          {status === "sending" ? "Updating..." : "Update password"}
        </button>
      </form>
      {!token && <p className="mt-3 text-sm text-red-600">Invalid reset link (missing token).</p>}
      {status === "done" && <p className="mt-4 text-sm text-emerald-600">{message}</p>}
      {status === "error" && <p className="mt-4 text-sm text-red-600">{message}</p>}
      <p className="mt-4 text-sm text-stone-500 text-center">
        <Link href="/login" className="underline">Back to sign in</Link>
      </p>
    </div>
  );
}
