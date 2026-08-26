'use client';

import { Suspense, useEffect, useState, type ReactElement } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { brandConfig } from '@/config/brand.config';

type Status =
  | 'laden'
  | 'nicht_eingeloggt'
  | 'ungueltiger_tag'
  | 'zeitsperre'
  | 'erfolg_stempel'
  | 'erfolg_loyalty_aufstieg'
  | 'erfolg_praemie_eingeloest'
  | 'fehler';

function StempelLogik(): ReactElement {
  const searchParams = useSearchParams();
  const tagCode = searchParams.get('tag');
  const [status, setStatus] = useState<Status>('laden');
  const [meldung, setMeldung] = useState<string | null>(null);

  useEffect(() => {
    async function ablauf() {
      if (!tagCode) {
        setStatus('ungueltiger_tag');
        return;
      }

      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setStatus('nicht_eingeloggt');
        return;
      }

      const { data: tag } = await supabase
        .from('stempel_tags')
        .select('aktiv')
        .eq('tag_code', tagCode)
        .maybeSingle();

      if (!tag || !tag.aktiv) {
        setStatus('ungueltiger_tag');
        return;
      }

      const { data: kunde } = await supabase.from('kunden').select('*').eq('id', userData.user.id).single();
      if (!kunde) {
        setStatus('fehler');
        return;
      }

      // Offene Prämien-Einlösung geht dem normalen Stempel-Vorgang vor —
      // nächster physischer NFC-Scan bestätigt die älteste offene Anfrage,
      // kein normaler Stempel wird dabei verbucht.
      const { data: offeneEinloesung } = await supabase
        .from('praemien_einloesungen')
        .select('id, feld_nr')
        .eq('kunde_id', kunde.id)
        .is('eingeloest_am', null)
        .is('verfallen_am', null)
        .order('angefordert_am', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (offeneEinloesung) {
        await supabase
          .from('praemien_einloesungen')
          .update({ eingeloest_am: new Date().toISOString() })
          .eq('id', offeneEinloesung.id);

        setMeldung(`Prämie für Feld ${offeneEinloesung.feld_nr} eingelöst!`);
        setStatus('erfolg_praemie_eingeloest');
        return;
      }

      const { data: einstellungenRows } = await supabase
        .from('einstellungen')
        .select('schluessel, wert')
        .in('schluessel', ['zeitsperre_lvl1_sekunden', 'zeitsperre_lvl2_sekunden', 'loyalty_verlaengerung_ziel']);
      const einstellungenMap = Object.fromEntries((einstellungenRows ?? []).map((e) => [e.schluessel, e.wert]));

      const zeitsperreSekunden =
        kunde.level >= 2
          ? Number(einstellungenMap.zeitsperre_lvl2_sekunden ?? brandConfig.zeitsperrenSekundenDefault.loyaltyTier)
          : Number(einstellungenMap.zeitsperre_lvl1_sekunden ?? brandConfig.zeitsperrenSekundenDefault.standard);

      if (zeitsperreSekunden > 0) {
        const { data: letzterLog } = await supabase
          .from('stempel_log')
          .select('zeit')
          .eq('kunde_id', kunde.id)
          .order('zeit', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (letzterLog) {
          const sekundenSeitLetztem = (Date.now() - new Date(letzterLog.zeit).getTime()) / 1000;
          if (sekundenSeitLetztem < zeitsperreSekunden) {
            const restSekunden = Math.ceil(zeitsperreSekunden - sekundenSeitLetztem);
            setMeldung(`Bitte warten Sie noch ${restSekunden} Sekunden bis zum nächsten Stempel.`);
            setStatus('zeitsperre');
            return;
          }
        }
      }

      const gesamtFelder = brandConfig.stempelkarte.gesamtFelder;
      const loyaltyVerlaengerungZiel = Number(
        einstellungenMap.loyalty_verlaengerung_ziel ?? brandConfig.gueltigkeit.loyaltyVerlaengerungZiel
      );
      const jetzt = new Date().toISOString();

      if (kunde.level === 1 && kunde.stempel_aktuell + 1 >= gesamtFelder) {
        await supabase
          .from('kunden')
          .update({
            stempel_aktuell: 1,
            level: 2,
            loyalty_start_am: jetzt,
            loyalty_bonus_stempel_gesamt: 1,
            erster_stempel_am: kunde.erster_stempel_am ?? jetzt,
          })
          .eq('id', kunde.id);

        await supabase.from('stempel_log').insert({ kunde_id: kunde.id });
        setStatus('erfolg_loyalty_aufstieg');
        return;
      }

      if (kunde.level >= 2) {
        const neuerStand = kunde.stempel_aktuell >= loyaltyVerlaengerungZiel ? kunde.stempel_aktuell : kunde.stempel_aktuell + 1;
        await supabase
          .from('kunden')
          .update({
            stempel_aktuell: neuerStand,
            loyalty_bonus_stempel_gesamt: kunde.loyalty_bonus_stempel_gesamt + 1,
          })
          .eq('id', kunde.id);

        await supabase.from('stempel_log').insert({ kunde_id: kunde.id });
        setMeldung(`+${(brandConfig.loyaltyTier.bonusProStempelCent / 100).toFixed(2)} € Bonus`);
        setStatus('erfolg_stempel');
        return;
      }

      await supabase
        .from('kunden')
        .update({
          stempel_aktuell: kunde.stempel_aktuell + 1,
          erster_stempel_am: kunde.erster_stempel_am ?? jetzt,
        })
        .eq('id', kunde.id);

      await supabase.from('stempel_log').insert({ kunde_id: kunde.id });
      setStatus('erfolg_stempel');
    }

    ablauf();
  }, [tagCode]);

  if (status === 'nicht_eingeloggt') {
    const next = `/stempeln?tag=${tagCode ?? ''}`;
    return <Meldung titel="Bitte einloggen" text={<Link href={`/?next=${encodeURIComponent(next)}`} className="underline">Zum Login</Link>} />;
  }

  if (status === 'laden') return <Meldung titel="Einen Moment…" text="Stempel wird verbucht." />;
  if (status === 'ungueltiger_tag') return <Meldung titel="Ungültiger Tag" text="Dieser NFC-Chip ist nicht aktiv." />;
  if (status === 'zeitsperre') return <Meldung titel="Zeitsperre aktiv" text={meldung ?? ''} />;
  if (status === 'erfolg_praemie_eingeloest') return <Meldung titel="Prämie eingelöst!" text={meldung ?? ''} erfolg />;
  if (status === 'erfolg_loyalty_aufstieg')
    return <Meldung titel={`Willkommen im ${brandConfig.loyaltyTier.name}!`} text="Sie haben das höchste Level erreicht." erfolg />;
  if (status === 'erfolg_stempel') return <Meldung titel="Stempel verbucht!" text={meldung ?? ''} erfolg />;
  return <Meldung titel="Fehler" text="Bitte versuchen Sie es erneut." />;
}

function Meldung({ titel, text, erfolg }: { titel: string; text: ReactElement | string; erfolg?: boolean }): ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-extrabold" style={{ color: erfolg ? brandConfig.farben.akzent : brandConfig.farben.primaer }}>
        {titel}
      </h1>
      <p className="text-gray-500">{text}</p>
      <Link
        href="/karte"
        className="mt-4 rounded-full px-6 py-3 font-semibold text-white touch-manipulation"
        style={{ backgroundColor: brandConfig.farben.akzent }}
      >
        Zur Stempelkarte
      </Link>
    </div>
  );
}

export default function StempelnPage(): ReactElement {
  return (
    <Suspense fallback={null}>
      <StempelLogik />
    </Suspense>
  );
}
