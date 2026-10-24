"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { getPendingVendorApplications, approveVendorApplication, rejectVendorApplication, isAbortError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";

export default function VendorApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  // Inline review-reason dialog (replaces window.prompt for testability)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredApps = apps.filter((a: any) => {
    const matchesSearch = !searchTerm || (a.email || "").toLowerCase().includes(searchTerm.toLowerCase()) || (a.businessName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || (a.status || "").toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });
  const [dialog, setDialog] = useState<{
    open: boolean;
    id: string;
    decision: "approve" | "reject";
    reason: string;
  } | null>(null);
  const reasonTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const openDialog = (id: string, decision: "approve" | "reject") => {
    setDialog({ open: true, id, decision, reason: "" });
    // Focus textarea after render
    setTimeout(() => reasonTextareaRef.current?.focus(), 50);
  };
  const closeDialog = () => setDialog(null);

  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const fetchApps = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const ac = new AbortController();
    abortControllerRef.current = ac;
    setError(null);
    setLoading(true);
    try {
      const token = getAccessToken();
      const data = await getPendingVendorApplications(ac.signal);
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      setApps(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (isAbortError(e)) return;
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      setError(e.message || "Failed to load applications.");
    } finally {
      if (requestId === requestIdRef.current && mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void fetchApps();
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
    };
  }, [fetchApps]);

  const doAction = async (id: string, decision: "approve" | "reject", reason?: string) => {
    if (actionId) return;
    setActionId(id);
    setError(null);
    try {
      if (decision === "approve") {
        await approveVendorApplication(id, { decision: "approve", reason });
      } else {
        await rejectVendorApplication(id, { decision: "reject", reason });
      }
      await fetchApps();
    } catch (e: any) {
      setError(e.message || "Action failed.");
    } finally {
      setActionId(null);
    }
  };

  const handleConfirm = () => {
    if (!dialog) return;
    doAction(dialog.id, dialog.decision, dialog.reason.trim() || undefined);
    closeDialog();
  };

  if (loading && apps.length === 0) return <main style={{ padding: "2rem" }}><p>Loading applications...</p></main>;
  if (error && apps.length === 0) return <main style={{ padding: "2rem" }}><p role="alert" style={{ color: "#b91c1c" }}>{error}</p><button onClick={fetchApps}>Retry</button></main>;

  return (
    <main style={{ padding: "2rem 1rem", maxWidth: 960, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ color: "#0a1128", fontSize: "1.75rem" }}>Vendor Applications</h1>
      {error && <div role="alert" style={{ color: "#b91c1c", background: "#fee2e2", padding: "0.75rem 1rem", borderRadius: 6, marginBottom: "1rem" }}>{error}</div>}
      {error && error.toLowerCase().includes("approved") && (
        <div role="status" style={{ padding: "0.75rem 1rem", background: "#ecfdf5", border: "1px solid #22c55e", borderRadius: 6, fontSize: "0.9rem", color: "#15803d", marginBottom: "1rem" }}>
          <strong>Approved.</strong> The applicant must <strong>re-login</strong> or refresh their session to receive their vendor role and access the dashboard.
        </div>
      )}
      {apps.length === 0 && !loading && <p>No pending applications.</p>}
      {/* Search / filter controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <input
          aria-label="Search applications"
          type="text"
          placeholder="Search email / business..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: ".4rem .6rem", borderRadius: 4, border: "1px solid #ccc", fontSize: "0.9rem" }}
        />
        <select
          aria-label="Filter by status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: ".4rem .6rem", borderRadius: 4, border: "1px solid #ccc", fontSize: "0.9rem" }}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        {filteredApps.length !== apps.length && (
          <span style={{ fontSize: "0.8rem", color: "#64748b", alignSelf: "center" }}>
            Showing {filteredApps.length} of {apps.length}
          </span>
        )}
      </div>
      {/* Responsive: the table scrolls horizontally inside its own container so a
          narrow viewport (320px) never forces page-level horizontal overflow. */}
      <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: "0.9rem" }} aria-label="Pending vendor applications">
        <thead>
          <tr style={{ borderBottom: "2px solid #0a1128" }}>
            <th scope="col" style={{ textAlign: "left", padding: "0.5rem" }}>Email</th>
            <th scope="col" style={{ textAlign: "left", padding: "0.5rem" }}>Business</th>
            <th scope="col" style={{ textAlign: "left", padding: "0.5rem" }}>Reason</th>
            <th scope="col" style={{ textAlign: "left", padding: "0.5rem" }}>Status</th>
            <th scope="col" style={{ textAlign: "left", padding: "0.5rem" }}>Date</th>
            <th scope="col" style={{ textAlign: "left", padding: "0.5rem" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredApps.map((a: any) => (
            <tr key={a.id} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "0.5rem" }}>{a.email}</td>
              <td style={{ padding: "0.5rem" }}>{a.businessName}</td>
              <td style={{ padding: "0.5rem", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>{a.reason}</td>
              <td style={{ padding: "0.5rem" }}>{a.status}</td>
              <td style={{ padding: "0.5rem" }}>{new Date(a.createdAt).toLocaleString()}</td>
              <td style={{ padding: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => openDialog(a.id, "approve")}
                  disabled={!!actionId}
                  style={{ marginRight: 8, padding: ".35rem .7rem", background: "#c5a047", color: "#fff", border: "none", borderRadius: 4, cursor: actionId ? "not-allowed" : "pointer" }}
                >Approve</button>
                <button
                  type="button"
                  onClick={() => openDialog(a.id, "reject")}
                  disabled={!!actionId}
                  style={{ padding: ".35rem .7rem", background: "#334155", color: "#fff", border: "none", borderRadius: 4, cursor: actionId ? "not-allowed" : "pointer" }}
                >Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* Inline accessible review-reason modal */}
      {dialog && dialog.open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${dialog.decision === "approve" ? "Approve" : "Reject"} application`}
          style={{
            position: "fixed",
            inset: "0 0 0 0",
            background: "rgba(10,17,40,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: "1.5rem",
              maxWidth: 420,
              width: "92%",
              boxShadow: "0 14px 40px rgba(10,17,40,0.22)",
            }}
          >
            <h2 style={{ margin: "0 0 .25rem", fontSize: "1.1rem", color: "#0a1128" }}>
              {dialog.decision === "approve" ? "Approve application" : "Reject application"}
            </h2>
            <p style={{ margin: "0 0 .75rem", color: "#475569", fontSize: "0.9rem" }}>
              Optional review reason (max 500 characters). Leave empty to proceed without a reason.
            </p>
            <textarea
              ref={reasonTextareaRef}
              aria-label="Review reason"
              value={dialog.reason}
              onChange={(e) => setDialog((prev) => prev ? { ...prev, reason: e.target.value.slice(0, 500) } : prev)}
              rows={4}
              maxLength={500}
              style={{
                width: "100%",
                padding: ".6rem .75rem",
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: "0.95rem",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <div style={{ marginTop: 8, color: "#64748b", fontSize: "0.75rem" }}>
              {dialog.reason.length}/500
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={closeDialog}
                style={{
                  padding: ".45rem .9rem",
                  background: "#f1f5f9",
                  color: "#0a1128",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >Cancel</button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!!actionId}
                style={{
                  padding: ".45rem .9rem",
                  background: dialog.decision === "approve" ? "#c5a047" : "#334155",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: actionId ? "not-allowed" : "pointer",
                  opacity: actionId ? 0.7 : 1,
                }}
              >Confirm {dialog.decision === "approve" ? "approve" : "reject"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
