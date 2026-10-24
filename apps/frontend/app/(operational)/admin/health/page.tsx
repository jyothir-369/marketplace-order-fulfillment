"use client";
import { useEffect, useState } from "react";
import { HeartPulse, Database, Server, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { getAdminCustomers } from "@/lib/api";

export default function AdminHealthPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      try {
        const health = await (await import("@/lib/api")).getAdminCustomers({limit:1});
        const dl = await (await fetch("/api/admin/dead-letter")).json().catch(()=>[]);
        setData({ health, queue: Array.isArray(dl)?dl.length:0 });
      } catch (e: any) { setErr(e?.message||"Failed"); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-sm">Checking bounded health...</div>;
  if (err || !data) return <div className="text-sm text-[var(--color-destructive)]">{err||"Unavailable"}</div>;

  const dbStatus = data.health?.databaseStatus || "unknown";
  const bounded = data.health?.boundedAt || "—";
  const queueCount = data.queue || 0;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold flex items-center gap-2"><HeartPulse className="h-6 w-6 text-[var(--color-brass)]" /> Health</h1>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 text-sm text-[var(--color-foreground)]">
        <p className="font-bold">Bounded-time checks</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div><Database className="h-4 w-4 inline mr-1" /> DB: <span className={dbStatus.includes("connected")?"text-green-600 font-bold":"text-amber-600 font-bold"}>{dbStatus}</span></div>
          <div><Server className="h-4 w-4 inline mr-1" /> Status: <span className={data.health?.status==="healthy"?"text-green-600 font-bold":"text-amber-600 font-bold"}>{data.health?.status||"—"}</span></div>
          <div><Clock className="h-4 w-4 inline mr-1" /> Bounded at: <span className="font-mono">{bounded}</span></div>
          <div><AlertTriangle className="h-4 w-4 inline mr-1" /> Queue (dead-letter): <span className={queueCount>0?"text-amber-600 font-bold":"text-green-600 font-bold"}>{queueCount}</span></div>
        </div>
        <div className="mt-3 text-xs text-[var(--color-warm-muted)]">Uptime: {data.health?.uptimeSec}s · Memory: {data.health?.memoryPercent}% · Timestamp: {data.health?.timestamp}</div>
      </div>
    </div>
  );
}
