"use client";
import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") || "").trim();
    try {
      const data = await requestPasswordReset(email);
      setStatus("sent");
      setMessage(data.message || "If an account exists, a reset link has been sent.");
    } catch (err: unknown) {
      setStatus("error");
      let msg = "Request failed.";
      if (err && typeof err === "object") {
        const e = err as { body?: { message?: string | string[] }; message?: string; statusCode?: number };
        const raw = e.body?.message || e.message || "";
        msg = Array.isArray(raw) ? raw.join("; ") : (typeof raw === "string" ? raw : "Request failed.");
      }
      // Prevent internal leakage: do not expose server stack / tokens / details
      if (msg.length > 200 || msg.toLowerCase().includes("internal")) msg = "Request failed. Please try again.";
      setMessage(msg);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-300 bg-white p-8 shadow-sm max-w-md mx-auto">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <p className="mt-2 text-sm text-stone-500">Enter your email to receive reset instructions.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input name="email" type="email" required placeholder="you@example.com" className="w-full rounded-lg border px-3 py-2 text-sm" />
        <button type="submit" disabled={status === "sending"} className="w-full rounded-lg bg-slate-900 text-white px-4 py-2.5 font-semibold disabled:opacity-60">
          {status === "sending" ? "Sending..." : "Send reset link"}
        </button>
      </form>
      {status === "sent" && <p className="mt-4 text-sm text-emerald-600">{message}</p>}
      {status === "error" && <p className="mt-4 text-sm text-red-600">{message}</p>}
      <p className="mt-4 text-sm text-stone-500 text-center">
        Remember your password? <Link href="/login" className="underline">Sign in</Link>
      </p>
    </div>
  );
}
