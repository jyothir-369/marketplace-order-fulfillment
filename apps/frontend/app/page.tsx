/**
 * Phase 3 — Real homepage (IA). Replaces redirect("/products").
 * Uses existing V2 Premium theme (ink-navy / ivory / brass).
 */
import Link from "next/link";
import { ArrowRight, Sparkles, Truck, ShieldCheck, Star, Tag } from "lucide-react";
import { ProductCard } from "@/components/storefront/ProductCard";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ivory text-ink-navy font-sans">
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-navy text-ivory">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #a9803f 0%, transparent 60%)" }} />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="max-w-2xl">
            <h1 className="font-serif text-5xl md:text-7xl leading-tight tracking-tight mb-6">
              Curated <span className="text-brass">marketplace</span> for makers and buyers.
            </h1>
            <p className="text-lg md:text-xl text-ivory/80 mb-8 leading-relaxed">
              Discover independent vendors, seasonal deals, and products backed by real inventory and verified shipping.
            </p>
            <div className="flex gap-4">
              <Link href="/products" className="inline-flex items-center gap-2 rounded-full bg-brass px-6 py-3 text-sm font-medium text-ink-navy hover:bg-brass/90 transition">
                Browse Shop <ArrowRight size={16} />
              </Link>
              <Link href="/deals" className="inline-flex items-center gap-2 rounded-full border border-ivory/30 px-6 py-3 text-sm font-medium hover:bg-ivory/5 transition">
                See Deals <Tag size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="mx-auto max-w-7xl px-6 -mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: ShieldCheck, label: "Verified vendors" },
            { icon: Truck, label: "Tracked shipping" },
            { icon: Star, label: "Real reviews" },
            { icon: Sparkles, label: "Curated deals" },
          ].map((t) => (
            <div key={t.label} className="rounded-2xl bg-white border border-ink-navy/10 p-6 shadow-sm flex items-center gap-3">
              <t.icon size={24} className="text-brass" />
              <span className="font-medium text-sm">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured categories rail */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="font-serif text-3xl md:text-4xl mb-8">Shop by category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["Electronics", "Fashion", "Home & Living", "Books"].map((c) => (
            <Link key={c} href={`/products?category=${c.toLowerCase()}`} className="group relative overflow-hidden rounded-2xl bg-ink-navy p-8 text-ivory hover:-translate-y-1 transition shadow-lg">
              <h3 className="font-serif text-xl mb-2">{c}</h3>
              <span className="text-sm text-ivory/70">Explore →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Best sellers rail */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-3xl md:text-4xl">Best sellers</h2>
          <Link href="/products?sort=bestselling" className="text-sm font-medium text-brass hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <ProductCard key={i} product={{ id: `bs-${i}`, name: "Featured item", price: 49 + i * 10, vendor: "Local Maker", image: "/images/placeholder.jpg" }} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink-navy text-ivory/60 py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-serif text-xl text-ivory">Marketplace</span>
            <span className="ml-2 text-sm">— Independent vendors, verified orders.</span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/about" className="hover:text-ivory">About</Link>
            <Link href="/help" className="hover:text-ivory">Help</Link>
            <Link href="/deals" className="hover:text-ivory">Deals</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
