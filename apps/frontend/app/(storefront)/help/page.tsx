import Link from "next/link";
import { ArrowLeft, HelpCircle, MessageCircle, Truck } from "lucide-react";

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-ivory text-ink-navy px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-brass mb-8 hover:underline"><ArrowLeft size={16}/> Back to home</Link>
        <h1 className="font-serif text-5xl mb-8">Help center</h1>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: MessageCircle, title: "Orders", desc: "Track, cancel, or reorder your orders." },
            { icon: Truck, title: "Shipping", desc: "Tracked fulfillment with per-vendor sync status." },
            { icon: HelpCircle, title: "Accounts", desc: "Profile, addresses, wishlist, and preferences." },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl bg-white border border-ink-navy/10 p-6 shadow-sm">
              <c.icon size={28} className="text-brass mb-3" />
              <h3 className="font-serif text-xl mb-2">{c.title}</h3>
              <p className="text-sm text-ink-navy/70">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
