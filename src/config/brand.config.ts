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

/**
 * AKTUELLE BELEGUNG DIESER DATEI: Vertriebs-Demo von G&B Systems
 * ("Musterbetrieb") für Erstgespräche mit Friseur-, Gastronomie-,
 * Café- und Kosmetik-Betrieben. Bewusst branchenneutraler
 * Platzhalter-Name, damit sich jeder Betriebsinhaber beim Pitch
 * selbst hineindenken kann ("so würde das bei Ihnen aussehen").
 * Farb-/Schriftwelt 1:1 von grothe-biewald.de übernommen, um die
 * gewohnte G&B-Systems-Qualität zu zeigen. Für ein echtes
 * Kundenprojekt wird diese komplette Datei durch die Werte des
 * jeweiligen Kunden ersetzt (siehe Kommentar oben).
 */
export const brandConfig = {
  firmenname: 'Musterbetrieb',
  appTitel: 'Ihre digitale Stempelkarte',
  loginUntertitel: 'Melden Sie sich an oder registrieren Sie sich, um Stempel zu sammeln.',

  farben: {
    primaer: '#080A1E',
    akzent: '#FF11A3',
    praemienRand: '#002BF1',
    loyaltyTier: {
      primaer: '#002BF1',
      akzent: '#FF11A3',
      hintergrundbild: null as string | null,
    },
  },

  logoPfad: '/logo.svg',
  /** Logo-Variante für dunkle Hintergründe (aktuell: VIP-/Loyalty-Tier-Karte). */
  logoWeissPfad: '/logo-weiss.svg' as string | null,

  /** Externe URL zur Datenschutzerklärung, verlinkt unter der Karte. */
  datenschutzUrl: 'https://grothe-biewald.de/datenschutz',

  /**
   * Bewusst klein gehalten (10 statt z.B. 20 Felder): Diese Karte
   * dient der Live-Vorführung beim Erstkontakt ("zweiminütige
   * Vorführung", siehe Vertriebsplan) — der komplette Weg von
   * leerer Karte bis Prämie und VIP-Aufstieg muss sich in wenigen
   * NFC-Tipps am Schlüsselbund durchspielen lassen.
   */
  stempelkarte: {
    gesamtFelder: 10,
    spalten: 5,
  },

  /** Default-Seed für praemien_config, siehe Hinweis oben. */
  praemienMeilensteine: [
    { feldNr: 3, beschreibung: 'Gratis Leistung', icon: 'geschenk', einloesbar: true },
    { feldNr: 6, beschreibung: 'Überraschung', icon: 'geschenk', einloesbar: true },
    { feldNr: 9, beschreibung: 'Rabatt sichern', icon: 'rabatt', einloesbar: true },
    { feldNr: 10, beschreibung: 'Aufstieg in den VIP-Club', icon: 'krone', einloesbar: false },
  ] satisfies PraemienMeilenstein[],

  loyaltyTier: {
    name: 'VIP-Club',
    bonusProStempelCent: 50,
  },

  /**
   * Für die Live-Demo bewusst beide auf 0: Beim Pitch wird der
   * NFC-Tag mehrfach hintereinander angetippt, um die komplette
   * Karte inkl. VIP-Aufstieg vorzuführen — eine Zeitsperre würde
   * das ausbremsen. Für ein echtes Kundenprojekt hier wieder
   * sinnvolle Werte (z.B. 0 / 300) eintragen.
   */
  zeitsperrenSekundenDefault: {
    standard: 0,
    loyaltyTier: 0,
  },

  gueltigkeit: {
    jahre: 2,
    /** Mindest-Stempelzahl innerhalb der Gültigkeitsdauer, um den
     *  Loyalty-Tier zu verlängern statt zurückgestuft zu werden. */
    loyaltyVerlaengerungZiel: 5,
  },
};

export type BrandConfig = typeof brandConfig;
