"use client";

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function VendorSettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.vendorId) {
      fetch(`/api/vendor/settings`)
        .then((r) => r.json())
        .then((data) => setName(data.name || ""))
        .catch(() => setError("Failed to load settings"));
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch(`/api/vendor/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
    } catch {
      setError("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
        <Settings className="h-6 w-6 text-[var(--color-brass)]" /> Settings
      </h1>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 space-y-4">
        <label htmlFor="vendor-name" className="block text-sm font-medium">Store Name</label>
        <input
          id="vendor-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="rounded-lg bg-[var(--color-brass)] text-white px-4 py-2 text-sm font-medium hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>
    </div>
  );
}
