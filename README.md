# Stempelkarten-App — Blueprint

White-Label-Basis für digitale NFC-Stempelkarten-PWAs (Next.js + Supabase +
Vercel). Kunden tippen mit dem Handy einen NFC-Chip an, die PWA öffnet sich,
ein Stempel wird automatisch verbucht — kein App-Store, keine native App.

Dieses Repo enthält **keine Kundendaten oder -Branding**. Für ein konkretes
Kundenprojekt wird dieses Repo geklont/dupliziert und individualisiert.

## Tech-Stack
- Frontend: Next.js (App Router, TypeScript, Tailwind CSS)
- Backend/DB/Auth: Supabase
- Hosting: Vercel

## Ein neues Kundenprojekt einrichten

### 1. Repo duplizieren
Dieses Repo als Vorlage nutzen (GitHub "Use this template" oder klonen +
neuen Remote setzen) und unter einem neuen Namen für den Kunden anlegen.

### 2. Branding anpassen
Alles Kundenspezifische steckt in **einer einzigen Datei**:
[`src/config/brand.config.ts`](src/config/brand.config.ts). Dort anpassen:
- Firmenname, App-Titel, Login-Text
- Farben (Primär-/Akzentfarbe, Prämien-Randfarbe, Loyalty-Tier-Farbschema)
- `logoPfad` (Logo in `public/` ablegen)
- `datenschutzUrl`
- Feldanzahl/Spalten der Stempelkarte
- `praemienMeilensteine` (nur Default-Seed für die Migration, siehe Punkt 3)
- Loyalty-Tier-Name (`loyaltyTier.name`) und Bonuswert
- Zeitsperren- und Gültigkeits-Defaults

Zusätzlich zu ersetzen:
- `public/logo.svg`, `public/icon-192.png`, `public/icon-512.png`,
  `public/apple-touch-icon.png`, `src/app/favicon.ico` — alle mit
  **weißem Hintergrund** (sonst wirkt das Icon auf dem Homescreen
  abgeschnitten/falsch skaliert)
- Optional: `brandConfig.farben.loyaltyTier.hintergrundbild` für ein
  Hintergrundbild auf der Loyalty-Tier-Karte (Bild vorher komprimieren,
  z. B. auf ~600px Breite und ~65% JPEG-Qualität)

Kernkomponenten (Login, Stempelkarte, Admin, Stempel-Logik) NICHT anfassen —
sie ziehen alle Texte/Farben/Werte ausschließlich aus `brand.config.ts` bzw.
zur Laufzeit aus den DB-Tabellen `einstellungen` und `praemien_config`.

### 3. Neues Supabase-Projekt aufsetzen
1. Neues, leeres Supabase-Projekt anlegen
2. `supabase/migrations/0001_init.sql` komplett im SQL Editor ausführen
   (Reihenfolge der Tabellen ist bewusst so gewählt — `admins` zuerst, da
   andere Policies bereits darauf verweisen)
3. Platzhalter-Werte in `praemien_config` und `einstellungen` durch die
   echten Werte aus `brand.config.ts` ersetzen (direkt per SQL oder
   komfortabel über `/admin/praemien` bzw. `/admin/einstellungen`, sobald
   die App deployt ist)
4. Einen Admin-Account normal über die App registrieren, dann dessen UUID
   in `admins` eintragen:
   ```sql
   insert into admins (id, email)
   select id, email from auth.users where email = 'admin@beispiel.de';
   ```
5. `.env.local` (lokal) aus `.env.local.example` kopieren und mit
   `NEXT_PUBLIC_SUPABASE_URL` (**reine Basis-URL, ohne `/rest/v1/`-Suffix!**)
   und `NEXT_PUBLIC_SUPABASE_ANON_KEY` befüllen (Project Settings → API Keys)

### 4. Vercel-Deployment
1. Neues Vercel-Projekt anlegen und mit dem GitHub-Repo verbinden
2. Auto-Deploy auf `main` ist Vercel-Standardverhalten, keine weitere
   Konfiguration nötig
3. Env-Vars in Vercel (Project Settings → Environment Variables) eintragen:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — dieselben
   Werte wie in `.env.local`, gleicher Hinweis zum URL-Suffix gilt hier
   genauso
4. Nach dem ersten Deploy: Login/Registrierung, Stempel-Vorgang
   (`/stempeln?tag=TAG-01`) und Admin-Bereich einmal end-to-end testen

### 5. NFC-Tags konfigurieren
Jeder physische NFC-Tag verlinkt auf `https://<domain>/stempeln?tag=TAG-01`
(entsprechend fortlaufend). Die Tag-Codes sind in `stempel_tags` frei
erweiterbar; über `/admin/tags` einzeln aktivierbar/deaktivierbar.

## Datenmodell
Siehe [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
für das vollständige Schema inkl. RLS-Policies. Kurzüberblick:

| Tabelle | Zweck |
|---|---|
| `kunden` | Kundenstammdaten, Stempelstand, Level, Gültigkeitsdaten |
| `stempel_tags` | Konfigurierbare NFC-Tags, aktivierbar/deaktivierbar |
| `stempel_log` | Protokoll aller Stempel-Vorgänge |
| `einstellungen` | Key-Value-Konfiguration (Zeitsperren, Bonuswert, Gültigkeit) |
| `admins` | Zugriffsschutz für `/admin` |
| `praemien_config` | Admin-editierbare Prämien-Meilensteine (Feld, Text, Icon) |
| `praemien_einloesungen` | Zweistufiger Einlösungs-Flow (anfordern → per NFC-Scan bestätigen) |

RLS-Muster für alle "nur Admins dürfen"-Policies:
`EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())`. Mehrere
Policies pro Aktion sind additiv (ODER-verknüpft) — Kunden-Policies bleiben
neben Admin-Policies bestehen.

## Business-Logik: Prämien-Einlösung
Bewusst zweistufig, kein Automatismus:
1. Kunde erreicht ein Prämienfeld, tippt es an → Popup mit "Jetzt anfordern"
2. Erst der **nächste physische NFC-Scan** vor Ort bestätigt die Einlösung
   (Server-Zeitstempel als Nachweis) — `stempeln`-Route prüft das VOR jedem
   normalen Stempel-Vorgang; kein normaler Stempel wird dabei zusätzlich
   verbucht

**Bekannte Einschränkung:** `UNIQUE(kunde_id, feld_nr)` in
`praemien_einloesungen` kann nach einem Gültigkeits-Reset verhindern, dass
ein Kunde dasselbe Feld in einem neuen Zyklus erneut anfordert, falls er es
wieder erreicht. Vor Go-Live pro Kundenprojekt bewusst entscheiden, ob das
gewünscht ist.

## Wichtige Konventionen (bitte beibehalten)
- `level`-Spalte muss `INTEGER` sein, nicht `TEXT`
- `useSearchParams()` immer in `<Suspense>` wrappen (siehe `page.tsx`,
  `stempeln/page.tsx`)
- `ReactElement` statt `JSX.Element` importieren (React 19)
- Mobile Inputs: `text-base` (16px), sonst iOS-Safari-Zoom
- Buttons: `type="button"` + `touch-manipulation` — Ausnahme:
  Formular-Submit-Buttons brauchen `type="submit"` innerhalb eines
  `<form onSubmit>`, sonst reagiert die Enter-Taste nicht
- Touch-Flächen: mindestens `py-3`
- `NEXT_PUBLIC_SUPABASE_URL` als reine Basis-URL ohne `/rest/v1/`-Suffix
- 2-Jahres-/Gültigkeitsfristen über `setFullYear()` berechnen, nicht über
  feste Millisekunden-Differenzen (Schaltjahr-sicher)
- Bei größeren visuellen Umbauten einen Rückfall-Schalter
  (Boolean-Konstante) einbauen, damit man ohne Git-Kenntnisse zum alten
  Design zurückkann
- Design-Entscheidungen vorher als Mockup zeigen, bevor Code geschrieben
  wird
- Neuer Ordner unter `src/app`, während `npm run dev` läuft, kann zu einem
  Turbopack-Fehler führen (`Is a directory (os error 21)`) — Fix:
  `Ctrl+C`, `rm -rf .next`, `npm run dev` neu starten
- Lokale Netzwerk-Tests (Handy im selben WLAN/Hotspot) können durch
  Next.js' HMR-WebSocket unzuverlässig werden — im Zweifel direkt gegen
  die Live-URL testen

## Lokale Entwicklung
```bash
npm install
cp .env.local.example .env.local   # dann mit echten Werten befüllen
npm run dev
```
