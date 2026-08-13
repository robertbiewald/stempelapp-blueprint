'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { createClient } from '@/lib/supabase/client';

type LogEintrag = {
  id: string;
  zeit: string;
  kunde_id: string;
  kunden: { vorname: string | null; name: string | null; email: string | null } | null;
};

type KundeTreffer = {
  id: string;
  vorname: string | null;
  name: string | null;
  email: string | null;
};

export default function AdminLogPage(): ReactElement {
  const [suche, setSuche] = useState('');
  const [standardListe, setStandardListe] = useState<LogEintrag[]>([]);
  const [kundenTreffer, setKundenTreffer] = useState<KundeTreffer[]>([]);
  const [ausgewaehlterKunde, setAusgewaehlterKunde] = useState<KundeTreffer | null>(null);
  const [kundenLog, setKundenLog] = useState<LogEintrag[]>([]);

  useEffect(() => {
    async function ladeStandard() {
      const supabase = createClient();
      const { data } = await supabase
        .from('stempel_log')
        .select('id, zeit, kunde_id, kunden(vorname, name, email)')
        .order('zeit', { ascending: false })
        .limit(100);
      setStandardListe((data as unknown as LogEintrag[]) ?? []);
    }
    ladeStandard();
  }, []);

  // 400ms Debounce: bei jeder Eingabe wird die gesamte DB durchsucht
  // (nicht nur die geladenen 100 Zeilen der Standardansicht).
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!suche.trim()) {
        setKundenTreffer([]);
        setAusgewaehlterKunde(null);
        return;
      }

      const supabase = createClient();
      const woerter = suche.toLowerCase().trim().split(/\s+/).filter(Boolean);
      const { data } = await supabase.from('kunden').select('id, vorname, name, email');

      const treffer = (data ?? []).filter((k) => {
        const haystack = `${k.vorname ?? ''} ${k.name ?? ''} ${k.email ?? ''}`.toLowerCase();
        return woerter.every((w) => haystack.includes(w));
      });

      setKundenTreffer(treffer);
    }, 400);

    return () => clearTimeout(timeout);
  }, [suche]);

  async function kundeAuswaehlen(kunde: KundeTreffer) {
    setAusgewaehlterKunde(kunde);
    const supabase = createClient();
    const { data } = await supabase
      .from('stempel_log')
      .select('id, zeit, kunde_id, kunden(vorname, name, email)')
      .eq('kunde_id', kunde.id)
      .order('zeit', { ascending: false });
    setKundenLog((data as unknown as LogEintrag[]) ?? []);
  }

  function eintragZeile(eintrag: LogEintrag) {
    return (
      <div key={eintrag.id} className="flex justify-between rounded-lg bg-white px-4 py-3 text-sm">
        <span>
          {eintrag.kunden?.vorname} {eintrag.kunden?.name} — {eintrag.kunden?.email}
        </span>
        <span className="text-gray-400">{new Date(eintrag.zeit).toLocaleString('de-DE')}</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-bold">Stempellog</h1>

      <input
        type="text"
        placeholder="Suche über die gesamte Datenbank…"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        className="text-base mt-4 w-full rounded-lg border border-gray-300 px-4 py-3"
      />

      {ausgewaehlterKunde ? (
        <div className="mt-4">
          <button type="button" onClick={() => setAusgewaehlterKunde(null)} className="text-sm underline touch-manipulation">
            ← Zurück zur Suche
          </button>
          <h2 className="mt-2 font-semibold">
            {ausgewaehlterKunde.vorname} {ausgewaehlterKunde.name}
          </h2>
          <div className="mt-2 flex flex-col gap-1">{kundenLog.map(eintragZeile)}</div>
        </div>
      ) : suche.trim() ? (
        <div className="mt-4 flex flex-col gap-1">
          {kundenTreffer.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => kundeAuswaehlen(k)}
              className="rounded-lg bg-white px-4 py-3 text-left text-sm touch-manipulation"
            >
              {k.vorname} {k.name} — {k.email}
            </button>
          ))}
          {kundenTreffer.length === 0 && <p className="text-sm text-gray-400">Keine Kunden gefunden.</p>}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-1">
          {standardListe.map((eintrag) => (
            <button
              key={eintrag.id}
              type="button"
              onClick={() =>
                eintrag.kunden &&
                kundeAuswaehlen({ id: eintrag.kunde_id, vorname: eintrag.kunden.vorname, name: eintrag.kunden.name, email: eintrag.kunden.email })
              }
              className="w-full text-left touch-manipulation"
            >
              {eintragZeile(eintrag)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
