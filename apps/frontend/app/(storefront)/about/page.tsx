import Link from "next/link";
import { ArrowLeft, ShieldCheck, Truck, Mail } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-ivory text-ink-navy px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-brass mb-8 hover:underline"><ArrowLeft size={16}/> Back to home</Link>
        <h1 className="font-serif text-5xl mb-8">About the marketplace</h1>
        <div className="prose prose-lg text-ink-navy/80 leading-relaxed space-y-6">
          <p>This is a curated marketplace connecting independent vendors with buyers through verified inventory, tracked shipping, and real reviews.</p>
          <p>We do not own inventory — vendors set their own stock, prices, and policies. Our role is to make discovery safe and orders traceable.</p>
          <h2 className="font-serif text-2xl mt-10 mb-4">What we guarantee</h2>
          <ul className="space-y-3 list-none pl-0">
            <li className="flex items-center gap-3"><ShieldCheck size={20} className="text-brass"/> Verified vendor accounts with real product listings.</li>
            <li className="flex items-center gap-3"><Truck size={20} className="text-brass"/> Tracked fulfillment with per-vendor sync status.</li>
            <li className="flex items-center gap-3"><Mail size={20} className="text-brass"/> Correlation-ID audit logging across checkout to fulfillment.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
