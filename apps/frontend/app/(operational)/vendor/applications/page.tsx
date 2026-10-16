"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getMyVendorApplications } from "@/lib/api";

export default function VendorApplicationsStatusPage() {
  const { user, status } = useAuth();
  const [apps, setApps] = useState<Array<{ id: string; email: string; businessName: string; status: string; createdAt: string }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true); setError(null);
    try {
      const data = await getMyVendorApplications();
      setApps(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load status.");
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { if (status === "authenticated") void load(); }, [load, status]);

  if (status === "idle" || status === "loading") return <main style={{ padding: "3rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}><p>Loading session...</p></main>;
  if (status === "unauthenticated") return <main style={{ padding: "3rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}><p>Please <Link href="/login?redirect=/vendor/applications">sign in</Link> to view your applications.</p></main>;

  const latest = apps && apps.length > 0 ? apps[0] : null;

  return (
    <main style={{ background: "#fdf8e8", padding: "3rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ color: "#0a1128", fontSize: "2rem" }}>Your vendor applications</h1>
      {loading && <p>Loading...</p>}
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      {!loading && apps && apps.length === 0 && <p>No applications found.</p>}
      {!loading && latest && (
        <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: "1rem", background: "#fff", marginTop: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#0a1128" }}>{latest.businessName}</h2>
          <p><strong>Email:</strong> {latest.email}</p>
          <p><strong>Status:</strong> <span style={{ textTransform: "uppercase", fontWeight: 700 }}>{latest.status}</span></p>
          <p><strong>Submitted:</strong> {new Date(latest.createdAt).toLocaleString()}</p>
          {latest.status === "approved" && (
            <div role="status" style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#ecfdf5", border: "1px solid #22c55e", borderRadius: 6, fontSize: "0.9rem", color: "#15803d" }}>
              <strong>Approved.</strong> Please <Link href="/login" style={{ textDecoration: "underline", fontWeight: 600 }}>re-login</Link> or refresh your session to receive your vendor role and access the dashboard.
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: "1.5rem" }}>
        <Link href="/sell/apply" style={{ display: "inline-block", padding: ".6rem 1.2rem", background: "#c5a047", color: "#fff", borderRadius: 6, textDecoration: "none", fontWeight: 600 }}>Submit new application</Link>
      </div>
    </main>
  );
}
