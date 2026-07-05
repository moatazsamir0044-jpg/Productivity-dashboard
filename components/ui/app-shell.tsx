import Link from 'next/link';
import { signOut } from '@/lib/auth/actions';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Today' },
  { href: '/goals', label: 'Goals' },
];

// Shared chrome for authenticated pages: top nav plus content container.
export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-semibold text-white">
              Productivity Dashboard
            </Link>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-neutral-400 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            {email && <span className="text-xs text-neutral-500">{email}</span>}
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-neutral-400 hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
