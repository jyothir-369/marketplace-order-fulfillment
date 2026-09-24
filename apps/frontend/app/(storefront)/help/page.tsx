/**
 * app/(storefront)/help/page.tsx — Phase 4: Expanded Help Center.
 */
import Link from "next/link";
import { ArrowLeft, HelpCircle, MessageCircle, Truck, CreditCard,
  UserCog, ShieldCheck, Receipt, Store, FileText, Lock, CheckCircle2 } from "lucide-react";
import { SupportTicketForm } from "@/components/storefront/SupportTicketForm";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    heading: "Orders",
    icon: MessageCircle,
    desc: "Track, cancel, or reorder your orders. View delivery estimates.",
    links: [
      { href: "/orders", label: "Your orders" },
      { href: "/orders", label: "Order tracking" },
      { href: "/help", label: "Cancel or return" },
    ],
  },
  {
    heading: "Shipping & Delivery",
    icon: Truck,
    desc: "Tracked fulfillment with per-vendor sync status and delivery windows.",
    links: [
      { href: "/help", label: "Delivery times" },
      { href: "/help", label: "Shipping policies" },
      { href: "/help", label: "Lost or damaged packages" },
    ],
  },
  {
    heading: "Returns & Refunds",
    icon: Receipt,
    desc: "Return policies, refund timelines, and step-by-step instructions.",
    links: [
      { href: "/help", label: "Return policy" },
      { href: "/help", label: "How to start a return" },
      { href: "/help", label: "Refund status" },
    ],
  },
  {
    heading: "Payments",
    icon: CreditCard,
    desc: "Payment methods, billing questions, and secure checkout information.",
    links: [
      { href: "/help", label: "Accepted payments" },
      { href: "/help", label: "Billing issues" },
      { href: "/checkout", label: "Checkout help" },
    ],
  },
  {
    heading: "Account Access",
    icon: UserCog,
    desc: "Profile, addresses, wishlist, preferences, and sign-in support.",
    links: [
      { href: "/account", label: "Manage account" },
      { href: "/wishlist", label: "Wishlist" },
      { href: "/notifications", label: "Notifications" },
    ],
  },
  {
    heading: "Vendor Onboarding",
    icon: Store,
    desc: "Become a seller, dashboard setup, and vendor policies.",
    links: [
      { href: "/vendor/dashboard", label: "Vendor dashboard" },
      { href: "/help", label: "Seller policies" },
      { href: "/vendor/products", label: "Manage products" },
    ],
  },
  {
    heading: "Seller Policies",
    icon: FileText,
    desc: "Terms, fees, fulfillment expectations, and compliance.",
    links: [
      { href: "/help", label: "Terms of service" },
      { href: "/help", label: "Seller agreement" },
      { href: "/vendor/dashboard", label: "Vendor portal" },
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-brass)] hover:underline mb-8">
        <ArrowLeft size={16} /> Back to home
      </Link>
      <div className="mb-10">
        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-3">Help Center</h1>
        <p className="text-sm text-[var(--color-warm-muted)] max-w-2xl">
          Find answers to common questions, access support for orders and accounts, and learn about vendor policies.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {SECTIONS.map((s) => (
          <section
            key={s.heading}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2"
            aria-label={s.heading}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--color-ink-navy)] flex items-center justify-center text-[var(--color-brass)]">
                <s.icon size={20} aria-hidden />
              </div>
              <h2 className="font-display text-xl font-bold leading-tight">{s.heading}</h2>
            </div>
            <p className="text-sm text-[var(--color-warm-muted)] mb-4">{s.desc}</p>
            <ul className="space-y-2">
              {s.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className="text-sm font-medium text-[var(--color-ink-navy)] hover:text-[var(--color-brass)] underline underline-offset-2"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Contact / support flow */}
      <section aria-label="Contact support" className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-v2 mb-12">
        <h2 className="font-display text-2xl font-bold mb-2">Need more help?</h2>
        <p className="text-sm text-[var(--color-warm-muted)] max-w-xl mb-6">
          Submit a support request with your order reference. You will receive a confirmation and a ticket number.
        </p>
        <SupportTicketForm />
      </section>

      {/* Trust / support indicators */}
      <section aria-label="Trust and policies" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { icon: Lock, title: "Secure checkout", desc: "Encrypted payment processing." },
          { icon: ShieldCheck, title: "Verified vendors", desc: "All sellers vetted." },
          { icon: Truck, title: "Delivery tracking", desc: "Real-time shipping updates." },
          { icon: Receipt, title: "Return policy", desc: "Clear refund timelines." },
        ].map((t) => (
          <div key={t.title} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-v2 text-center">
            <t.icon className="h-6 w-6 text-[var(--color-brass)] mx-auto mb-2" aria-hidden />
            <h3 className="font-display text-sm font-bold mb-0.5">{t.title}</h3>
            <p className="text-xs text-[var(--color-warm-muted)]">{t.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
