'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { createClient } from '@/lib/supabase/client';

type PraemienConfigRow = {
  id: string;
  schwelle: number;
  praemie: string;
  level: number;
  einloesbar: boolean;
  icon: string;
};

export default function AdminPraemienPage(): ReactElement {
  const [zeilen, setZeilen] = useState<PraemienConfigRow[]>([]);

  useEffect(() => {
    async function laden() {
      const supabase = createClient();
      const { data } = await supabase.from('praemien_config').select('*').order('level').order('schwelle');
      setZeilen(data ?? []);
    }
    laden();
  }, []);

  async function aktualisieren(id: string, felder: Partial<PraemienConfigRow>) {
    const supabase = createClient();
    await supabase.from('praemien_config').update(felder).eq('id', id);
    setZeilen((prev) => prev.map((z) => (z.id === id ? { ...z, ...felder } : z)));
  }

  async function hinzufuegen() {
    const supabase = createClient();
    const { data } = await supabase
      .from('praemien_config')
      .insert({ schwelle: 0, praemie: 'Neue Prämie', level: 1, einloesbar: true, icon: 'geschenk' })
      .select()
      .single();
    if (data) setZeilen((prev) => [...prev, data]);
  }

  async function loeschen(id: string) {
    if (!window.confirm('Diesen Meilenstein wirklich löschen?')) return;
    const supabase = createClient();
    await supabase.from('praemien_config').delete().eq('id', id);
    setZeilen((prev) => prev.filter((z) => z.id !== id));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-bold">Prämien-Konfiguration</h1>
      <div className="mt-4 flex flex-col gap-3">
        {zeilen.map((z) => (
          <div key={z.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
            <label className="text-xs text-gray-500">
              Feld
              <input
                type="number"
                value={z.schwelle}
                onChange={(e) => aktualisieren(z.id, { schwelle: Number(e.target.value) })}
                className="text-base ml-1 w-16 rounded border border-gray-300 px-2 py-2"
              />
            </label>
            <input
              type="text"
              value={z.praemie}
              onChange={(e) => aktualisieren(z.id, { praemie: e.target.value })}
              className="text-base min-w-[10rem] flex-1 rounded border border-gray-300 px-2 py-2"
            />
            <label className="text-xs text-gray-500">
              Level
              <select
                value={z.level}
                onChange={(e) => aktualisieren(z.id, { level: Number(e.target.value) })}
                className="text-base ml-1 rounded border border-gray-300 px-2 py-2"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={z.einloesbar}
                onChange={(e) => aktualisieren(z.id, { einloesbar: e.target.checked })}
              />
              einlösbar
            </label>
            <button type="button" onClick={() => loeschen(z.id)} className="text-xs text-red-600 underline touch-manipulation">
              Löschen
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={hinzufuegen}
        className="mt-4 rounded-lg border border-gray-300 px-4 py-3 text-sm touch-manipulation"
      >
        + Meilenstein hinzufügen
      </button>
    </div>
  );
}
