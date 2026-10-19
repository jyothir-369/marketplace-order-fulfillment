"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getMyVendorApplications, submitVendorApplication } from "@/lib/api";
import type { UserDto } from "@/lib/types";

export default function SellPage() {
  const { user, status } = useAuth();
  const [apps, setApps] = useState<Array<{ id: string; email: string; businessName: string; status: string; createdAt: string }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApps = useCallback(async () => {
    if (status !== "authenticated" || !user) return;
    setLoading(true); setError(null);
    try {
      const data = await getMyVendorApplications();
      setApps(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load applications.");
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [status, user]);

  useEffect(() => { if (status === "authenticated") void loadApps(); }, [loadApps, status]);

  // Role-aware rendering
  if (status === "idle" || status === "loading") {
    return <main style={{ background: "#fdf8e8", padding: "3rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}><p>Loading...</p></main>;
  }

  const isBuyer = user?.role === "buyer";
  const isVendor = user?.role === "vendor";
  const isAdmin = user?.role === "admin" || user?.role === "operations";
  const pendingApp = apps?.find(a => a.status === "pending");
  const approvedApp = apps?.find(a => a.status === "approved");

  if (isVendor && !(typeof user?.vendorId === "string" && user.vendorId.trim().length > 0)) {
    return (
      <main style={{ background: "#fdf8e8", padding: "3rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
        <h1 style={{ color: "#0a1128", fontSize: "2rem" }}>Vendor account needs linking</h1>
        <p role="alert" style={{ color: "#b91c1c", lineHeight: 1.6 }}>
          Your vendor account is not linked to a vendor business yet. The vendor portal is unavailable until the marketplace team completes that link.
        </p>
        <p style={{ color: "#334155", lineHeight: 1.6 }}>
          Contact support to resolve the account link. You do not need to submit another application just to fix this issue.
        </p>
        <Link href="/help" style={{ color: "#0a1128", textDecoration: "underline" }}>Contact support</Link>
      </main>
    );
  }

  if (isVendor && user?.vendorId) {
    return (
      <main style={{ background: "#fdf8e8", padding: "3rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
        <h1 style={{ color: "#0a1128", fontSize: "2rem" }}>Become a vendor</h1>
        <p style={{ color: "#334155", lineHeight: 1.6 }}>Your vendor account is active.</p>
        <Link href="/vendor/dashboard" style={{ display: "inline-block", padding: ".7rem 1.4rem", background: "#c5a047", color: "#fff", borderRadius: 6, fontWeight: 600, textDecoration: "none", marginTop: "1rem" }}>Go to vendor dashboard</Link>
      </main>
    );
  }

  if (isAdmin) {
    return (
      <main style={{ background: "#fdf8e8", padding: "3rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
        <h1 style={{ color: "#0a1128", fontSize: "2rem" }}>Become a vendor</h1>
        <p style={{ color: "#334155", lineHeight: 1.6 }}>Admin review: <Link href="/admin/vendor-applications">Vendor applications</Link></p>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ background: "#fdf8e8", padding: "3rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
        <h1 style={{ color: "#0a1128", fontSize: "2rem" }}>Become a vendor</h1>
        <p style={{ color: "#334155", lineHeight: 1.6 }}>Seller accounts are set up through an application process managed by the marketplace team.</p>
        <ul style={{ color: "#334155", lineHeight: 1.6, paddingLeft: "1.2rem" }}>
          <li>Submit your business information for review.</li>
          <li>The team reviews and approves eligible applications.</li>
          <li>Once approved, you can access the vendor dashboard.</li>
        </ul>
        <div style={{ marginTop: "1rem" }}>
          <Link href="/login?redirect=/sell" style={{ display: "inline-block", padding: ".7rem 1.4rem", background: "#c5a047", color: "#fff", borderRadius: 6, fontWeight: 600, textDecoration: "none", marginRight: ".5rem" }}>Sign in</Link>
        <Link href="/sell/apply" style={{ display: "inline-block", padding: ".7rem 1.4rem", background: "#c5a047", color: "#fff", borderRadius: 6, fontWeight: 600, textDecoration: "none", marginRight: ".5rem" }}>Apply as a guest</Link>
          <Link href="/register?redirect=/sell" style={{ display: "inline-block", padding: ".7rem 1.4rem", background: "#0a1128", color: "#fff", borderRadius: 6, fontWeight: 600, textDecoration: "none" }}>Create account</Link>
        </div>
      </main>
    );
  }

  // Authenticated buyer
  if (isBuyer) {
    if (loading) return <main style={{ background: "#fdf8e8", padding: "3rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}><p>Loading your applications...</p></main>;
    if (pendingApp) return (
      <main style={{ background: "#fdf8e8", padding: "3rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
        <h1 style={{ color: "#0a1128", fontSize: "2rem" }}>Become a vendor</h1>
        <p style={{ color: "#334155" }}>Your application is <strong>pending</strong> (<strong>{pendingApp.businessName}</strong>).</p>
        <Link href="/vendor/applications" style={{ display: "inline-block", padding: ".7rem 1.4rem", background: "#c5a047", color: "#fff", borderRadius: 6, fontWeight: 600, textDecoration: "none", marginTop: "1rem" }}>View application status</Link>
      </main>
    );
    if (approvedApp) return (
      <main style={{ background: "#fdf8e8", padding: "3rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
        <h1 style={{ color: "#0a1128", fontSize: "2rem" }}>Become a vendor</h1>
        <p style={{ color: "#334155" }}>Your application is <strong>approved</strong> (<strong>{approvedApp.businessName}</strong>).</p>
        <p style={{ color: "#334155" }}>Contact support or sign in again to access the vendor portal if your account has not been linked.</p>
        <Link href="/vendor/dashboard" style={{ display: "inline-block", padding: ".7rem 1.4rem", background: "#c5a047", color: "#fff", borderRadius: 6, fontWeight: 600, textDecoration: "none", marginTop: "1rem" }}>Vendor dashboard</Link>
      </main>
    );
    if (apps && apps.length > 0 && apps.every(a => a.status === "rejected")) {
      return (
        <main style={{ background: "#fdf8e8", padding: "3rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
          <h1 style={{ color: "#0a1128", fontSize: "2rem" }}>Become a vendor</h1>
          <p style={{ color: "#334155" }}>Your most recent application was <strong>rejected</strong>. You may submit a new application.</p>
          <Link href="/sell/apply" style={{ display: "inline-block", padding: ".7rem 1.4rem", background: "#c5a047", color: "#fff", borderRadius: 6, fontWeight: 600, textDecoration: "none", marginTop: "1rem" }}>Apply again</Link>
        </main>
      );
    }
    // Buyer with no application (or only rejected not matched above)
    return (
      <main style={{ background: "#fdf8e8", padding: "3rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
        <h1 style={{ color: "#0a1128", fontSize: "2rem" }}>Become a vendor</h1>
        <p style={{ color: "#334155", lineHeight: 1.6 }}>Interested in selling? Submit an application for review by the marketplace team.</p>
        <Link href="/sell/apply" style={{ display: "inline-block", padding: ".7rem 1.4rem", background: "#c5a047", color: "#fff", borderRadius: 6, fontWeight: 600, textDecoration: "none", marginTop: "1rem" }}>Start application</Link>
        {error && <p role="alert" style={{ color: "#b91c1c", marginTop: "1rem" }}>{error}</p>}
      </main>
    );
  }

  // Fallback for unexpected role
  return (
    <main style={{ background: "#fdf8e8", padding: "3rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ color: "#0a1128", fontSize: "2rem" }}>Become a vendor</h1>
      <p style={{ color: "#334155" }}>Please sign in to continue.</p>
      <Link href="/login?redirect=/sell" style={{ display: "inline-block", padding: ".7rem 1.4rem", background: "#0a1128", color: "#fff", borderRadius: 6, fontWeight: 600, textDecoration: "none", marginTop: "1rem" }}>Sign in</Link>
    </main>
  );
}
