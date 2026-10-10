/**
 * app/(storefront)/returns/page.tsx
 */
export default function ReturnsPage() {
  return (
    <main className="min-h-screen bg-[var(--color-cream)]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl font-bold mb-4">Returns</h1>
        <p className="text-sm text-[var(--color-warm-muted)] mb-6">See our return policies and start a return request through the help center.</p>
        <a href="/help" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-medium">Back to Help Center</a>
      </div>
    </main>
  );
}
