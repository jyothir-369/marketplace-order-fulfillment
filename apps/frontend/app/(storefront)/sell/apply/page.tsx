"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { submitVendorApplication } from "@/lib/api";

export default function ApplyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [businessName, setBusinessName] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null); setErrors({});
    const fieldErrors: Record<string, string> = {};
    if (!email || !email.includes("@")) fieldErrors.email = "A valid email is required.";
    if (!businessName.trim()) fieldErrors.businessName = "Business name is required.";
    if (!reason.trim()) fieldErrors.reason = "Reason is required.";
    if (Object.keys(fieldErrors).length > 0) { setErrors(fieldErrors); return; }

    setBusy(true);
    try {
      await submitVendorApplication({ email: email.trim(), businessName: businessName.trim(), reason: reason.trim() });
      if (user) {
        router.push("/vendor/applications");
      } else {
        setMessage("Application submitted. You will be contacted by the marketplace team.");
        setBusy(false);
        return;
      }
    } catch (e: any) {
      setMessage(e?.message || "Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ background: "#fdf8e8", padding: "3rem 1rem", maxWidth: 560, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ color: "#0a1128", fontSize: "2rem", marginBottom: "0.5rem" }}>Apply to become a vendor</h1>
      <p style={{ color: "#334155", lineHeight: 1.6, marginBottom: "1.5rem" }}>Submit your business details for review by the marketplace team.</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }} noValidate>
        <div>
          <label htmlFor="email" style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem", color: "#0a1128" }}>Email</label>
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={busy} style={{ width: "100%", padding: ".6rem .75rem", borderRadius: 6, border: "1px solid #ccc", fontSize: "0.95rem" }} />
          {errors.email && <p style={{ color: "#b91c1c", fontSize: "0.8rem", marginTop: ".25rem" }}>{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="businessName" style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem", color: "#0a1128" }}>Business name</label>
          <input id="businessName" type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} disabled={busy} style={{ width: "100%", padding: ".6rem .75rem", borderRadius: 6, border: "1px solid #ccc", fontSize: "0.95rem" }} />
          {errors.businessName && <p style={{ color: "#b91c1c", fontSize: "0.8rem", marginTop: ".25rem" }}>{errors.businessName}</p>}
        </div>
        <div>
          <label htmlFor="reason" style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem", color: "#0a1128" }}>Why do you want to sell?</label>
          <textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} disabled={busy} rows={4} style={{ width: "100%", padding: ".6rem .75rem", borderRadius: 6, border: "1px solid #ccc", fontSize: "0.95rem", resize: "vertical" }} />
          {errors.reason && <p style={{ color: "#b91c1c", fontSize: "0.8rem", marginTop: ".25rem" }}>{errors.reason}</p>}
        </div>
        <button type="submit" disabled={busy} style={{ padding: ".75rem 1.25rem", background: busy ? "#aaa" : "#c5a047", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer" }}>{busy ? "Submitting..." : "Submit application"}</button>
        {message && <p role="alert" style={{ color: "#b91c1c", fontSize: "0.9rem", padding: ".5rem", background: "#fee2e2", borderRadius: 6 }}>{message}</p>}
      </form>
    </main>
  );
}
