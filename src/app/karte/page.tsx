'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { brandConfig } from '@/config/brand.config';

type Kunde = {
  id: string;
  vorname: string | null;
  name: string | null;
  stempel_aktuell: number;
  level: number;
  erster_stempel_am: string | null;
  loyalty_start_am: string | null;
  loyalty_bonus_stempel_gesamt: number;
};

type PraemienConfigRow = {
  schwelle: number;
  praemie: string;
  level: number;
  einloesbar: boolean;
  icon: string;
};

type Einloesung = {
  feld_nr: number;
  angefordert_am: string;
  eingeloest_am: string | null;
};

type Einstellungen = {
  gueltigkeit_jahre: number;
  loyalty_verlaengerung_ziel: number;
  loyalty_bonus_cent: number;
};

/**
 * Prüft und korrigiert die Gültigkeit der Karte, läuft bei jedem Laden.
 * - Standard-Tier: läuft nach `gueltigkeit_jahre` Jahren ab dem ersten
 *   Stempel ab → Reset auf 0, offene Prämien-Anfragen verfallen
 *   (verfallen_am gesetzt, nicht gelöscht — Nachweis bleibt erhalten).
 * - Loyalty-Tier: läuft nach `gueltigkeit_jahre` Jahren ab → bei
 *   Erreichen von `loyalty_verlaengerung_ziel` Stempeln automatische
 *   Verlängerung, sonst Rückstufung auf Standard-Tier.
 * Fristen werden kalenderkorrekt über setFullYear() berechnet, nicht
 * über feste Millisekunden-Differenzen (Schaltjahr-sicher).
 */
async function pruefeGueltigkeit(
  supabase: ReturnType<typeof createClient>,
  kunde: Kunde,
  einstellungen: Einstellungen
): Promise<Kunde> {
  const jetzt = new Date();

  if (kunde.level === 1 && kunde.erster_stempel_am) {
    const ablauf = new Date(kunde.erster_stempel_am);
    ablauf.setFullYear(ablauf.getFullYear() + einstellungen.gueltigkeit_jahre);

    if (jetzt > ablauf) {
      await supabase
        .from('praemien_einloesungen')
        .update({ verfallen_am: jetzt.toISOString() })
        .eq('kunde_id', kunde.id)
        .is('eingeloest_am', null);

      const { data } = await supabase
        .from('kunden')
        .update({ stempel_aktuell: 0, erster_stempel_am: null })
        .eq('id', kunde.id)
        .select()
        .single();

      return data ?? kunde;
    }
  }

  if (kunde.level >= 2 && kunde.loyalty_start_am) {
    const ablauf = new Date(kunde.loyalty_start_am);
    ablauf.setFullYear(ablauf.getFullYear() + einstellungen.gueltigkeit_jahre);

    if (jetzt > ablauf) {
      const verlaengert = kunde.stempel_aktuell >= einstellungen.loyalty_verlaengerung_ziel;

      const { data } = await supabase
        .from('kunden')
        .update(
          verlaengert
            ? { stempel_aktuell: 0, loyalty_start_am: jetzt.toISOString() }
            : { stempel_aktuell: 0, level: 1, loyalty_start_am: null, erster_stempel_am: jetzt.toISOString() }
        )
        .eq('id', kunde.id)
        .select()
        .single();

      return data ?? kunde;
    }
  }

  return kunde;
}

function PraemienPopup({
  feldNr,
  praemie,
  einloesung,
  onAnfordern,
  onZurueckziehen,
  onSchliessen,
}: {
  feldNr: number;
  praemie: string;
  einloesung: Einloesung | undefined;
  onAnfordern: () => void;
  onZurueckziehen: () => void;
  onSchliessen: () => void;
}): ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center">
        <h2 className="text-lg font-bold">
          Feld {feldNr}: {praemie}
        </h2>

        {!einloesung && (
          <>
            <p className="mt-3 text-sm text-gray-600">Diese Prämie haben Sie erreicht. Jetzt anfordern?</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onSchliessen}
                className="flex-1 rounded-lg border border-gray-300 py-3 touch-manipulation"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={onAnfordern}
                className="flex-1 rounded-lg py-3 font-semibold text-white touch-manipulation"
                style={{ backgroundColor: brandConfig.farben.akzent }}
              >
                Jetzt anfordern
              </button>
            </div>
          </>
        )}

        {einloesung && !einloesung.eingeloest_am && (
          <>
            <p className="mt-3 text-sm font-medium">Bitte einmal stempeln, damit die Prämie eingelöst wird.</p>
            <p className="mt-1 text-xs text-gray-400">
              Angefordert am {new Date(einloesung.angefordert_am).toLocaleDateString('de-DE')}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onZurueckziehen}
                className="flex-1 rounded-lg border border-gray-300 py-3 text-sm touch-manipulation"
              >
                Anfrage zurückziehen
              </button>
              <button
                type="button"
                onClick={onSchliessen}
                className="flex-1 rounded-lg py-3 font-semibold text-white touch-manipulation"
                style={{ backgroundColor: brandConfig.farben.akzent }}
              >
                Schließen
              </button>
            </div>
          </>
        )}

        {einloesung?.eingeloest_am && (
          <>
            <p className="mt-3 text-sm text-green-700">
              Eingelöst am {new Date(einloesung.eingeloest_am).toLocaleDateString('de-DE')}
            </p>
            <button
              type="button"
              onClick={onSchliessen}
              className="mt-6 w-full rounded-lg py-3 font-semibold text-white touch-manipulation"
              style={{ backgroundColor: brandConfig.farben.akzent }}
            >
              Schließen
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Feld({
  nr,
  erreicht,
  isPraemie,
  eingeloest,
  onClick,
}: {
  nr: number;
  erreicht: boolean;
  isPraemie: boolean;
  eingeloest: boolean;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isPraemie}
      className="relative flex aspect-square items-center justify-center rounded-lg text-sm font-semibold touch-manipulation"
      style={{
        backgroundColor: erreicht ? brandConfig.farben.akzent : '#ffffff',
        color: erreicht ? '#ffffff' : brandConfig.farben.primaer,
        border: isPraemie ? `2px solid ${brandConfig.farben.praemienRand}` : '1px solid rgba(0,43,241,0.12)',
      }}
    >
      {nr}
      {eingeloest && (
        <span
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs text-white"
          style={{ backgroundColor: brandConfig.farben.praemienRand }}
        >
          ✓
        </span>
      )}
    </button>
  );
}

export default function KartePage(): ReactElement | null {
  const router = useRouter();
  const [kunde, setKunde] = useState<Kunde | null>(null);
  const [praemien, setPraemien] = useState<PraemienConfigRow[]>([]);
  const [einloesungen, setEinloesungen] = useState<Einloesung[]>([]);
  const [aktivesFeld, setAktivesFeld] = useState<number | null>(null);
  const [ladevorgang, setLadevorgang] = useState(true);

  useEffect(() => {
    async function laden() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/');
        return;
      }

      const [{ data: kundeData }, { data: einstellungenRows }, { data: praemienData }] = await Promise.all([
        supabase.from('kunden').select('*').eq('id', userData.user.id).single(),
        supabase
          .from('einstellungen')
          .select('schluessel, wert')
          .in('schluessel', ['gueltigkeit_jahre', 'loyalty_verlaengerung_ziel', 'loyalty_bonus_cent']),
        supabase.from('praemien_config').select('*').order('schwelle'),
      ]);

      if (!kundeData) {
        router.push('/');
        return;
      }

      const einstellungenMap = Object.fromEntries((einstellungenRows ?? []).map((e) => [e.schluessel, e.wert]));
      const einstellungen: Einstellungen = {
        gueltigkeit_jahre: Number(einstellungenMap.gueltigkeit_jahre ?? brandConfig.gueltigkeit.jahre),
        loyalty_verlaengerung_ziel: Number(
          einstellungenMap.loyalty_verlaengerung_ziel ?? brandConfig.gueltigkeit.loyaltyVerlaengerungZiel
        ),
        loyalty_bonus_cent: Number(einstellungenMap.loyalty_bonus_cent ?? brandConfig.loyaltyTier.bonusProStempelCent),
      };

      const geprueft = await pruefeGueltigkeit(supabase, kundeData, einstellungen);

      const { data: einloesungenData } = await supabase
        .from('praemien_einloesungen')
        .select('feld_nr, angefordert_am, eingeloest_am')
        .eq('kunde_id', geprueft.id)
        .is('verfallen_am', null);

      setKunde(geprueft);
      setPraemien(praemienData ?? []);
      setEinloesungen(einloesungenData ?? []);
      setLadevorgang(false);
    }

    laden();
  }, [router]);

  async function anfordern(feldNr: number) {
    if (!kunde) return;
    const supabase = createClient();
    await supabase.from('praemien_einloesungen').insert({ kunde_id: kunde.id, feld_nr: feldNr });
    const { data } = await supabase
      .from('praemien_einloesungen')
      .select('feld_nr, angefordert_am, eingeloest_am')
      .eq('kunde_id', kunde.id)
      .is('verfallen_am', null);
    setEinloesungen(data ?? []);
    setAktivesFeld(null);
  }

  async function zurueckziehen(feldNr: number) {
    if (!kunde) return;
    const supabase = createClient();
    await supabase.from('praemien_einloesungen').delete().eq('kunde_id', kunde.id).eq('feld_nr', feldNr);
    setEinloesungen((prev) => prev.filter((e) => e.feld_nr !== feldNr));
    setAktivesFeld(null);
  }

  if (ladevorgang || !kunde) return null;

  const istLoyaltyTier = kunde.level >= 2;
  const gesamtFelder = brandConfig.stempelkarte.gesamtFelder;
  const praemienByFeld = new Map(praemien.filter((p) => p.level === kunde.level).map((p) => [p.schwelle, p]));
  const einloesungByFeld = new Map(einloesungen.map((e) => [e.feld_nr, e]));
  const aktivesPraemienConfig = aktivesFeld != null ? praemienByFeld.get(aktivesFeld) : undefined;

  const hintergrundStil = istLoyaltyTier
    ? {
        backgroundColor: brandConfig.farben.loyaltyTier.primaer,
        backgroundImage: brandConfig.farben.loyaltyTier.hintergrundbild
          ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${brandConfig.farben.loyaltyTier.hintergrundbild})`
          : undefined,
        backgroundSize: 'cover',
      }
    : { backgroundColor: '#F4F6FF' };

  return (
    <div className="min-h-screen px-4 py-8" style={hintergrundStil}>
      <div
        className="mx-auto max-w-md rounded-3xl p-6"
        style={
          istLoyaltyTier
            ? undefined
            : { backgroundColor: '#ffffff', border: '1px solid rgba(0,43,241,0.08)', boxShadow: '0 20px 60px -15px rgba(0,43,241,0.15)' }
        }
      >
        {istLoyaltyTier && brandConfig.logoWeissPfad && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brandConfig.logoWeissPfad} alt={brandConfig.firmenname} width={56} height={56} className="mx-auto mb-4" />
        )}

        <h1
          className="text-center text-xl font-extrabold"
          style={{ color: istLoyaltyTier ? '#ffffff' : brandConfig.farben.primaer }}
        >
          {istLoyaltyTier ? brandConfig.loyaltyTier.name : brandConfig.appTitel}
        </h1>

        <p
          className="mt-1 text-center text-sm"
          style={{ color: istLoyaltyTier ? '#ffffff' : '#666666', opacity: istLoyaltyTier ? 0.85 : 1 }}
        >
          {kunde.vorname} {kunde.name} — Stempel {kunde.stempel_aktuell} von {gesamtFelder}
        </p>

        {istLoyaltyTier && (
          <p className="mt-2 text-center text-2xl font-bold" style={{ color: brandConfig.farben.loyaltyTier.akzent }}>
            {(kunde.loyalty_bonus_stempel_gesamt * brandConfig.loyaltyTier.bonusProStempelCent) / 100} €
          </p>
        )}

        <div
          className="mt-6 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${brandConfig.stempelkarte.spalten}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: gesamtFelder }, (_, i) => i + 1).map((nr) => {
            const praemieConfig = praemienByFeld.get(nr);
            const einloesung = einloesungByFeld.get(nr);
            return (
              <Feld
                key={nr}
                nr={nr}
                erreicht={kunde.stempel_aktuell >= nr}
                isPraemie={!!praemieConfig?.einloesbar && kunde.stempel_aktuell >= nr}
                eingeloest={!!praemieConfig && !!einloesung?.eingeloest_am}
                onClick={() => praemieConfig?.einloesbar && setAktivesFeld(nr)}
              />
            );
          })}
        </div>

        <a
          href={brandConfig.datenschutzUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 block text-center text-xs underline"
          style={{ color: istLoyaltyTier ? '#ffffff' : '#999999', opacity: istLoyaltyTier ? 0.7 : 1 }}
        >
          Datenschutzerklärung
        </a>

        <button
          type="button"
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push('/');
          }}
          className="mx-auto mt-4 block py-3 text-center text-xs underline touch-manipulation"
          style={{ color: istLoyaltyTier ? '#ffffff' : '#999999', opacity: istLoyaltyTier ? 0.7 : 1 }}
        >
          Abmelden
        </button>
      </div>

      {aktivesFeld != null && aktivesPraemienConfig && (
        <PraemienPopup
          feldNr={aktivesFeld}
          praemie={aktivesPraemienConfig.praemie}
          einloesung={einloesungByFeld.get(aktivesFeld)}
          onAnfordern={() => anfordern(aktivesFeld)}
          onZurueckziehen={() => zurueckziehen(aktivesFeld)}
          onSchliessen={() => setAktivesFeld(null)}
        />
      )}
    </div>
  );
}
