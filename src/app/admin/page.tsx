'use client';

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { createClient } from '@/lib/supabase/client';

type Kunde = {
  id: string;
  vorname: string | null;
  name: string | null;
  email: string | null;
  stempel_aktuell: number;
  level: number;
};

type Einloesung = {
  id: string;
  feld_nr: number;
  angefordert_am: string;
  eingeloest_am: string | null;
  verfallen_am: string | null;
};

export default function AdminKundenPage(): ReactElement {
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [suche, setSuche] = useState('');
  const [ausgewaehlt, setAusgewaehlt] = useState<string | null>(null);
  const [einloesungen, setEinloesungen] = useState<Einloesung[]>([]);

  useEffect(() => {
    async function laden() {
      const supabase = createClient();
      const { data } = await supabase.from('kunden').select('id, vorname, name, email, stempel_aktuell, level').order('name');
      setKunden(data ?? []);
    }
    laden();
  }, []);

  useEffect(() => {
    async function ladeEinloesungen() {
      if (!ausgewaehlt) {
        setEinloesungen([]);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from('praemien_einloesungen')
        .select('id, feld_nr, angefordert_am, eingeloest_am, verfallen_am')
        .eq('kunde_id', ausgewaehlt)
        .order('angefordert_am', { ascending: false });
      setEinloesungen(data ?? []);
    }
    ladeEinloesungen();
  }, [ausgewaehlt]);

  const gefiltert = useMemo(() => {
    if (!suche.trim()) return kunden;
    const woerter = suche.toLowerCase().split(/\s+/).filter(Boolean);
    return kunden.filter((k) => {
      const haystack = `${k.vorname ?? ''} ${k.name ?? ''} ${k.email ?? ''}`.toLowerCase();
      return woerter.every((w) => haystack.includes(w));
    });
  }, [kunden, suche]);

  async function aktualisieren(id: string, felder: Partial<Kunde>) {
    const supabase = createClient();
    await supabase.from('kunden').update(felder).eq('id', id);
    setKunden((prev) => prev.map((k) => (k.id === id ? { ...k, ...felder } : k)));
  }

  async function stornieren(id: string) {
    const supabase = createClient();
    await supabase.from('praemien_einloesungen').update({ eingeloest_am: null }).eq('id', id);
    setEinloesungen((prev) => prev.map((e) => (e.id === id ? { ...e, eingeloest_am: null } : e)));
  }

  async function loeschen(id: string) {
    if (!window.confirm('Diese Einlösung wirklich löschen?')) return;
    const supabase = createClient();
    await supabase.from('praemien_einloesungen').delete().eq('id', id);
    setEinloesungen((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-bold">Kundenverwaltung</h1>

      <input
        type="text"
        placeholder="Suche nach Name oder E-Mail…"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        className="text-base mt-4 w-full rounded-lg border border-gray-300 px-4 py-3"
      />

      <div className="mt-4 flex flex-col gap-3">
        {gefiltert.map((k) => (
          <div key={k.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <button
              type="button"
              onClick={() => setAusgewaehlt(ausgewaehlt === k.id ? null : k.id)}
              className="flex w-full items-center justify-between text-left touch-manipulation"
            >
              <span>
                {k.vorname} {k.name} — <span className="text-gray-500">{k.email}</span>
              </span>
              <span className="text-sm text-gray-400">{ausgewaehlt === k.id ? '▲' : '▼'}</span>
            </button>

            <div className="mt-3 flex items-center gap-3">
              <label className="text-sm text-gray-600">
                Stempel
                <input
                  type="number"
                  value={k.stempel_aktuell}
                  onChange={(e) => aktualisieren(k.id, { stempel_aktuell: Number(e.target.value) })}
                  className="text-base ml-2 w-20 rounded-lg border border-gray-300 px-2 py-2"
                />
              </label>
              <label className="text-sm text-gray-600">
                Level
                <select
                  value={k.level}
                  onChange={(e) => aktualisieren(k.id, { level: Number(e.target.value) })}
                  className="text-base ml-2 rounded-lg border border-gray-300 px-2 py-2"
                >
                  <option value={1}>1 — Standard</option>
                  <option value={2}>2 — Loyalty-Tier</option>
                </select>
              </label>
            </div>

            {ausgewaehlt === k.id && (
              <div className="mt-4 border-t border-gray-100 pt-3">
                <h2 className="text-sm font-semibold text-gray-700">Prämien-Einlösungen</h2>
                {einloesungen.length === 0 && <p className="mt-2 text-sm text-gray-400">Keine Anfragen vorhanden.</p>}
                <div className="mt-2 flex flex-col gap-2">
                  {einloesungen.map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                      <span>
                        Feld {e.feld_nr} —{' '}
                        {e.verfallen_am
                          ? `verfallen ${new Date(e.verfallen_am).toLocaleDateString('de-DE')}`
                          : e.eingeloest_am
                            ? `eingelöst ${new Date(e.eingeloest_am).toLocaleDateString('de-DE')}`
                            : `offen seit ${new Date(e.angefordert_am).toLocaleDateString('de-DE')}`}
                      </span>
                      <div className="flex gap-2">
                        {e.eingeloest_am && (
                          <button type="button" onClick={() => stornieren(e.id)} className="text-xs underline touch-manipulation">
                            Stornieren
                          </button>
                        )}
                        <button type="button" onClick={() => loeschen(e.id)} className="text-xs text-red-600 underline touch-manipulation">
                          Löschen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
