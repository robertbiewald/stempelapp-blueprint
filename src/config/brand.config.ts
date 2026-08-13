/**
 * Zentraler Branding-Layer für ein einzelnes Kundenprojekt.
 *
 * Ziel: Ein neues Kundenprojekt individualisiert man, indem man NUR
 * diese Datei (plus Logo/Icons in /public und ggf. ein Hintergrundbild)
 * anpasst — kein Code in den Kernkomponenten (Login, Karte, Admin,
 * Stempel-Logik) sollte angefasst werden müssen.
 *
 * praemienMeilensteine hier sind nur die DEFAULT-SEED-Werte fürs
 * initiale Supabase-Setup (siehe supabase/migrations/0001_init.sql,
 * Abschnitt PRAEMIEN_CONFIG). Zur Laufzeit liest die App aus der
 * praemien_config-Tabelle, die über /admin/praemien pflegbar ist —
 * damit sind Änderungen nach dem Launch ohne Redeploy möglich.
 */

export type PraemienMeilenstein = {
  feldNr: number;
  beschreibung: string;
  icon: string;
  /** true = Kunde kann diese Prämie über den Anfordern-Flow einlösen.
   *  false = kein Einlösungs-Flow, z. B. beim Loyalty-Tier-Aufstieg. */
  einloesbar: boolean;
};

export const brandConfig = {
  firmenname: 'Beispiel GmbH',
  appTitel: 'Deine digitale Stempelkarte',
  loginUntertitel: 'Melde dich an oder registriere dich, um Stempel zu sammeln.',

  farben: {
    primaer: '#1a1a1a',
    akzent: '#c0392b',
    praemienRand: '#f4b942',
    loyaltyTier: {
      primaer: '#2a0a18',
      akzent: '#D4AF37',
      hintergrundbild: null as string | null,
    },
  },

  logoPfad: '/logo.svg',

  /** Externe URL zur Datenschutzerklärung, verlinkt unter der Karte. */
  datenschutzUrl: 'https://example.com/datenschutz',

  stempelkarte: {
    gesamtFelder: 20,
    spalten: 5,
  },

  /** Default-Seed für praemien_config, siehe Hinweis oben. */
  praemienMeilensteine: [
    { feldNr: 5, beschreibung: 'Beispiel-Prämie 1', icon: 'geschenk', einloesbar: true },
    { feldNr: 10, beschreibung: 'Beispiel-Prämie 2', icon: 'geschenk', einloesbar: true },
    { feldNr: 15, beschreibung: 'Beispiel-Prämie 3', icon: 'geschenk', einloesbar: true },
    { feldNr: 20, beschreibung: 'Aufstieg in Loyalty-Tier', icon: 'krone', einloesbar: false },
  ] satisfies PraemienMeilenstein[],

  loyaltyTier: {
    name: 'Gold Club',
    bonusProStempelCent: 50,
  },

  zeitsperrenSekundenDefault: {
    standard: 0,
    loyaltyTier: 300,
  },

  gueltigkeit: {
    jahre: 2,
    /** Mindest-Stempelzahl innerhalb der Gültigkeitsdauer, um den
     *  Loyalty-Tier zu verlängern statt zurückgestuft zu werden. */
    loyaltyVerlaengerungZiel: 40,
  },
};

export type BrandConfig = typeof brandConfig;
