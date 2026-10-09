"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { getDeadLetterJobs, getAmbiguousJobs, runReconciliation } from "@/lib/api";
import type { DeadLetterJobDto } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
function fmt(iso?: string | null) { return iso ? new Date(iso).toLocaleString() : "—"; }
export default function AdminReconciliationPage() {
  const { push: toast } = useToast();
  const [dl, setDl] = useState<DeadLetterJobDto[]>([]);
  const [amb, setAmb] = useState<DeadLetterJobDto[]>([]);
  const [load, setLoad] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [run, setRun] = useState(false);
  const [last, setLast] = useState<{ processed:number; resolved:number; stillAmbiguous:number; errors:string[]; ts:Date }|null>(null);
  const [confirm, setConfirm] = useState(false);
  const refresh = useCallback(async () => { setLoad(true); setErr(null); try { const [a,b] = await Promise.all([getDeadLetterJobs(), getAmbiguousJobs()]); setDl(a||[]); setAmb(b||[]); } catch(e:any){ setErr(e?.message||"Failed"); toast("Failed","error"); } finally { setLoad(false); } }, [toast]);
  useEffect(()=>{ void refresh(); },[refresh]);
  const doReconcile = async () => { setRun(true); setConfirm(false); try { const r = await runReconciliation({olderThanMinutes:10}); setLast({...r, ts:new Date()}); toast(`Done: ${r.resolved} resolved, ${r.stillAmbiguous} ambiguous`, r.errors.length?"warning":"success"); await refresh(); } catch(e:any){ toast(e?.message||"Failed","error"); } finally { setRun(false); } };
  if (load && !dl.length && !amb.length) return <div aria-busy="true"><Loader2 className="h-8 w-8 animate-spin"/> <p>Loading...</p></div>;
  return (
    <div className="space-y-6">
      <div className="flex justify-between"><h1 className="font-bold text-2xl">Reconciliation</h1>
        <div className="flex gap-2"><button onClick={()=>void refresh()} disabled={load||run}>Refresh</button>
        <button onClick={()=>setConfirm(true)} disabled={run}>Run reconciliation</button></div></div>
      {err && <div role="alert">{err} <button onClick={()=>void refresh()}>Retry</button></div>}
      {confirm && <div role="dialog" aria-modal="true" className="p-4 border rounded"><h2>Confirm</h2><p>Scan ambiguous jobs older than 10 minutes.</p>
        <button onClick={doReconcile}>Confirm</button><button onClick={()=>setConfirm(false)}>Cancel</button></div>}
      {last && <section aria-label="Result"><p>Processed {last.processed}, Resolved {last.resolved}, Still ambiguous {last.stillAmbiguous}, Errors {last.errors.length}</p>
        {last.errors.length>0 && <ul>{last.errors.map((e,i)=><li key={i}>{e}</li>)}</ul>}</section>}
      <section aria-label="Ambiguous jobs"><h2>Ambiguous ({amb.length})</h2>
        {amb.length===0 ? <p>None.</p> : <table><thead><tr><th>Job</th><th>Line item</th><th>Status</th><th>Attempts</th><th>Last</th><th>Error</th></tr></thead>
        <tbody>{amb.map(j=>
          <tr key={j.id}><td>{j.id}</td><td>{j.orderLineItemId}</td><td>{j.status}</td><td>{j.attempts}</td><td>{fmt(j.lastAttemptedAt)}</td><td>{j.errorMessage||"—"}</td></tr>
        )}</tbody></table>}</section>
      <section aria-label="Dead-letter jobs"><h2>Dead-letter ({dl.length})</h2>
        {dl.length===0 ? <p>None.</p> : <table><thead><tr><th>Job</th><th>Line item</th><th>Status</th><th>Attempts</th><th>Last</th><th>Error</th></tr></thead>
        <tbody>{dl.map(j=>
          <tr key={j.id}><td>{j.id}</td><td>{j.orderLineItemId}</td><td>{j.status}</td><td>{j.attempts}/{j.maxAttempts}</td><td>{fmt(j.lastAttemptedAt)}</td><td>{j.errorMessage||"—"}</td></tr>
        )}</tbody></table>}</section>
      <p>Note: no persistent history stored; session-only.</p>
    </div>
  );
}