import { useState, useEffect } from "react";
import { getMe } from "@/lib/api";
export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then((u) => { setUser(u); setDisplayName(u.displayName || ""); setLoading(false); })
      .catch((e) => { setErr(e.message || "Failed to load"); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setErr(null); setSaved(false);
    try {
      // Real PATCH endpoint (implemented backend)
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      // Reload to confirm persistence
      const u = await getMe();
      setUser(u); setDisplayName(u.displayName || "");
    } catch (e: any) { setErr(e.message || "Save failed"); }
  };

  if (loading) return <div>Loading profile...</div>;
  if (err && !user) return <div role="alert">Error: {err}</div>;
  return (
    <main className="max-w-xl mx-auto p-6">
      <h1>Customer Profile (live /api/auth/me + /api/customer/profile)</h1>
      <label>Email <input disabled value={user?.email || ""} /></label>
      <label>Display Name
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={120} />
      </label>
      <button onClick={handleSave}>Save</button>
      <button onClick={() => setDisplayName(user?.displayName || "")}>Cancel</button>
      {saved && <p>Saved (reloaded from server).</p>}
      {err && <div role="alert">{err}</div>}
      <p>Address persistence blocked until migration approved.</p>
    </main>
  );
}

// Address section — clearly unavailable (migration not approved)
// <section><h2>Addresses</h2><p>Address persistence requires database migration approval.</p></section>
