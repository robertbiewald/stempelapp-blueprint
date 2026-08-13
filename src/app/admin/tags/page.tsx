'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { createClient } from '@/lib/supabase/client';

type Tag = { id: string; tag_code: string; aktiv: boolean };

export default function AdminTagsPage(): ReactElement {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    async function laden() {
      const supabase = createClient();
      const { data } = await supabase.from('stempel_tags').select('*').order('tag_code');
      setTags(data ?? []);
    }
    laden();
  }, []);

  async function umschalten(id: string, aktiv: boolean) {
    const supabase = createClient();
    await supabase.from('stempel_tags').update({ aktiv }).eq('id', id);
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, aktiv } : t)));
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-lg font-bold">Tag-Verwaltung</h1>
      <div className="mt-4 flex flex-col gap-2">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
            <span className="font-mono text-sm">{tag.tag_code}</span>
            <button
              type="button"
              onClick={() => umschalten(tag.id, !tag.aktiv)}
              className="rounded-lg px-4 py-3 text-sm font-semibold text-white touch-manipulation"
              style={{ backgroundColor: tag.aktiv ? '#16a34a' : '#9ca3af' }}
            >
              {tag.aktiv ? 'Aktiv' : 'Inaktiv'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
