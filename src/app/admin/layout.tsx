'use client';

import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/admin', label: 'Kunden' },
  { href: '/admin/einstellungen', label: 'Einstellungen' },
  { href: '/admin/tags', label: 'Tags' },
  { href: '/admin/praemien', label: 'Prämien' },
  { href: '/admin/log', label: 'Log' },
];

export default function AdminLayout({ children }: { children: ReactNode }): ReactElement | null {
  const router = useRouter();
  const pathname = usePathname();
  const [geprueft, setGeprueft] = useState(false);

  useEffect(() => {
    async function pruefen() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/');
        return;
      }

      const { data: adminRow } = await supabase
        .from('admins')
        .select('id')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (!adminRow) {
        router.push('/karte');
        return;
      }

      setGeprueft(true);
    }

    pruefen();
  }, [router]);

  if (!geprueft) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-10 flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/gb-systems-logo.svg" alt="G&B Systems" width={24} height={24} className="mr-2 rounded" />
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-lg px-3 py-2 text-sm touch-manipulation"
            style={{
              backgroundColor: pathname === item.href ? '#002BF1' : 'transparent',
              color: pathname === item.href ? '#ffffff' : '#080A1E',
            }}
          >
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push('/');
          }}
          className="ml-auto whitespace-nowrap rounded-lg px-3 py-2 text-sm text-gray-500 touch-manipulation"
        >
          Abmelden
        </button>
      </nav>
      <main className="px-4 py-6">{children}</main>
    </div>
  );
}
