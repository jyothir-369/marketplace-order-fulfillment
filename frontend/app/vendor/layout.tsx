import Link from 'next/link';

const navLinks = [
  { href: '/vendor/inventory', label: 'Inventory' },
  { href: '/vendor/orders', label: 'Orders' },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1">
      <header className="border-b bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/vendor/inventory" className="font-bold text-lg">
            Vendor Portal
          </Link>
          <nav className="flex gap-4 text-sm">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-gray-300">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
