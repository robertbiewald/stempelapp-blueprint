'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { createClient } from '@/lib/supabase/client';

const FELDER: { schluessel: string; label: string }[] = [
  { schluessel: 'zeitsperre_lvl1_sekunden', label: 'Zeitsperre Standard (Sekunden)' },
  { schluessel: 'zeitsperre_lvl2_sekunden', label: 'Zeitsperre Loyalty-Tier (Sekunden)' },
  { schluessel: 'loyalty_bonus_cent', label: 'Bonus pro Loyalty-Tier-Stempel (Cent)' },
  { schluessel: 'gueltigkeit_jahre', label: 'Gültigkeitsdauer (Jahre)' },
  { schluessel: 'loyalty_verlaengerung_ziel', label: 'Mindest-Stempel für Loyalty-Verlängerung' },
];

export default function AdminEinstellungenPage(): ReactElement {
  const [werte, setWerte] = useState<Record<string, string>>({});
  const [gespeichert, setGespeichert] = useState(false);

  useEffect(() => {
    async function laden() {
      const supabase = createClient();
      const { data } = await supabase.from('einstellungen').select('schluessel, wert');
      setWerte(Object.fromEntries((data ?? []).map((e) => [e.schluessel, e.wert])));
    }
    laden();
  }, []);

  async function speichern(schluessel: string, wert: string) {
    const supabase = createClient();
    await supabase.from('einstellungen').update({ wert }).eq('schluessel', schluessel);
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 1500);
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-lg font-bold">Einstellungen</h1>
      <div className="mt-4 flex flex-col gap-4">
        {FELDER.map((f) => (
          <label key={f.schluessel} className="flex flex-col gap-1 text-sm text-gray-600">
            {f.label}
            <input
              type="number"
              value={werte[f.schluessel] ?? ''}
              onChange={(e) => setWerte((prev) => ({ ...prev, [f.schluessel]: e.target.value }))}
              onBlur={(e) => speichern(f.schluessel, e.target.value)}
              className="text-base rounded-lg border border-gray-300 px-4 py-3"
            />
          </label>
        ))}
        {gespeichert && <p className="text-sm text-green-700">Gespeichert.</p>}
      </div>
    </div>
  );
}
