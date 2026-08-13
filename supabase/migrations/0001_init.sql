-- ============================================================
-- STEMPELKARTEN-APP BLUEPRINT — Initiales Datenbank-Setup
-- ============================================================
-- Reihenfolge ist bewusst so gewählt: admins muss zuerst angelegt
-- werden, weil die Policies von kunden, stempel_tags, einstellungen,
-- praemien_config und praemien_einloesungen bereits darauf verweisen
-- (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid())).
-- Bei falscher Reihenfolge bricht das Skript mit
-- "relation \"admins\" does not exist" ab.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ADMINS
-- ------------------------------------------------------------
create table admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null
);

alter table admins enable row level security;

create policy "Admins sehen sich selbst" on admins
  for select using (auth.uid() = id);


-- ------------------------------------------------------------
-- 2. KUNDEN
-- ------------------------------------------------------------
-- level ist bewusst INTEGER (nicht TEXT) — eine falsch angelegte
-- TEXT-Spalte führt zu stillen Vergleichsfehlern wie `level >= 2`
-- im TypeScript-Code.
create table kunden (
  id uuid primary key references auth.users(id) on delete cascade,
  vorname text,
  name text,
  email text,
  stempel_aktuell int4 not null default 0,
  level integer not null default 1,
  pass_start date default current_date,
  newsletter_aktiv bool default false,
  erster_stempel_am timestamptz,
  loyalty_start_am timestamptz,
  loyalty_bonus_stempel_gesamt int not null default 0
);

alter table kunden enable row level security;

create policy "Kunden sehen eigene Daten" on kunden
  for select using (auth.uid() = id);

create policy "Kunden aktualisieren eigene Daten" on kunden
  for update using (auth.uid() = id);

create policy "Kunden legen eigene Zeile an" on kunden
  for insert with check (auth.uid() = id);

create policy "Admins sehen alle Kunden" on kunden
  for select using (exists (select 1 from admins where admins.id = auth.uid()));

create policy "Admins aktualisieren alle Kunden" on kunden
  for update using (exists (select 1 from admins where admins.id = auth.uid()));


-- ------------------------------------------------------------
-- 3. STEMPEL_TAGS
-- ------------------------------------------------------------
create table stempel_tags (
  id uuid primary key default gen_random_uuid(),
  tag_code text unique not null,
  aktiv bool not null default true
);

alter table stempel_tags enable row level security;

create policy "Alle authentifizierten duerfen lesen" on stempel_tags
  for select using (auth.role() = 'authenticated');

create policy "Admins verwalten Tags" on stempel_tags
  for update using (exists (select 1 from admins where admins.id = auth.uid()));

-- Startbestand: 7 neutrale Tags, über /admin/tags aktivierbar/deaktivierbar
-- und beliebig erweiterbar (weitere Zeilen einfach per INSERT ergänzen).
insert into stempel_tags (tag_code, aktiv) values
  ('TAG-01', true), ('TAG-02', true), ('TAG-03', true),
  ('TAG-04', true), ('TAG-05', true), ('TAG-06', true), ('TAG-07', true);


-- ------------------------------------------------------------
-- 4. STEMPEL_LOG
-- ------------------------------------------------------------
create table stempel_log (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references kunden(id) on delete cascade,
  zeit timestamptz not null default now(),
  gesynct bool default false
);

alter table stempel_log enable row level security;

create policy "Kunden sehen eigenes Log" on stempel_log
  for select using (kunde_id = auth.uid());

create policy "Kunden fuegen eigenes Log hinzu" on stempel_log
  for insert with check (kunde_id = auth.uid());

create policy "Admins sehen alle Log-Eintraege" on stempel_log
  for select using (exists (select 1 from admins where admins.id = auth.uid()));


-- ------------------------------------------------------------
-- 5. EINSTELLUNGEN (key-value)
-- ------------------------------------------------------------
create table einstellungen (
  schluessel text primary key,
  wert text not null,
  beschreibung text
);

alter table einstellungen enable row level security;

create policy "Admins verwalten Einstellungen" on einstellungen
  for all using (exists (select 1 from admins where admins.id = auth.uid()));

create policy "Authentifizierte lesen Einstellungen" on einstellungen
  for select using (auth.role() = 'authenticated');

-- Defaultwerte — sollten beim Kunden-Setup über brand.config.ts
-- abgeglichen und ggf. per /admin/einstellungen angepasst werden.
insert into einstellungen (schluessel, wert, beschreibung) values
  ('zeitsperre_lvl1_sekunden', '0', 'Zeitsperre zwischen Scans für Standard-Kunden (0 = deaktiviert)'),
  ('zeitsperre_lvl2_sekunden', '300', 'Zeitsperre zwischen Scans für Loyalty-Tier-Kunden'),
  ('loyalty_bonus_cent', '50', 'Bonus/Rabatt pro Stempel für Loyalty-Tier-Kunden, in Cent'),
  ('gueltigkeit_jahre', '2', 'Gültigkeitsdauer der Stempelkarte in Jahren, ab dem ersten Stempel'),
  ('loyalty_verlaengerung_ziel', '40', 'Mindest-Stempelzahl innerhalb der Gültigkeitsdauer, um den Loyalty-Tier zu verlängern (sonst Rückstufung)');


-- ------------------------------------------------------------
-- 6. PRAEMIEN_CONFIG
-- ------------------------------------------------------------
-- Bewusst als eigene, admin-editierbare Tabelle statt hartcodierter
-- Meilensteine: Feldanzahl und Prämien-Positionen unterscheiden sich
-- stark pro Kunde. brand.config.ts liefert nur die Default-Seed-Werte
-- beim Ersteinrichten (siehe unten); Quelle der Wahrheit zur Laufzeit
-- ist diese Tabelle.
create table praemien_config (
  id uuid primary key default gen_random_uuid(),
  schwelle integer not null,
  praemie text not null,
  level integer default 1,
  einloesbar bool not null default true,
  icon text not null default 'geschenk'
);

alter table praemien_config enable row level security;

create policy "Authentifizierte lesen Praemien-Konfiguration" on praemien_config
  for select using (auth.role() = 'authenticated');

create policy "Admins verwalten Praemien-Konfiguration" on praemien_config
  for all using (exists (select 1 from admins where admins.id = auth.uid()));

-- Platzhalter-Beispieldaten — beim Kunden-Setup durch echte Werte aus
-- brand.config.ts ersetzen (siehe README "Neuen Kunden einrichten").
insert into praemien_config (schwelle, praemie, level, einloesbar, icon) values
  (10, 'Beispiel-Prämie 1', 1, true,  'geschenk'),
  (20, 'Beispiel-Prämie 2', 1, true,  'geschenk'),
  (35, 'Beispiel-Prämie 3', 1, true,  'geschenk'),
  (50, 'Beispiel-Prämie 4', 1, true,  'geschenk'),
  (70, 'Aufstieg in Loyalty-Tier', 1, false, 'krone');


-- ------------------------------------------------------------
-- 7. PRAEMIEN_EINLOESUNGEN
-- ------------------------------------------------------------
-- Zweistufiger Einlösungs-Flow (bewusst kein Automatismus):
-- 1. Kunde fordert eine erreichte Prämie in der App aktiv an (INSERT).
-- 2. Die tatsächliche Einlösung passiert erst beim nächsten physischen
--    NFC-Scan vor Ort — stempeln/page.tsx prüft das VOR jedem normalen
--    Stempel-Vorgang und setzt eingeloest_am mit Server-Zeitstempel,
--    ohne dabei einen normalen Stempel zu verbuchen.
-- Bekannte Einschränkung: UNIQUE(kunde_id, feld_nr) kann nach einem
-- Gültigkeits-Reset verhindern, dass ein Kunde dasselbe Feld in einem
-- neuen Zyklus erneut anfordert, falls er es wieder erreicht. Vor
-- Go-Live pro Kundenprojekt bewusst entscheiden, ob das gewünscht ist.
create table praemien_einloesungen (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references kunden(id) on delete cascade,
  feld_nr int not null,
  angefordert_am timestamptz not null default now(),
  eingeloest_am timestamptz,
  verfallen_am timestamptz,
  unique (kunde_id, feld_nr)
);

alter table praemien_einloesungen enable row level security;

create policy "Kunden sehen eigene Einloesungen" on praemien_einloesungen
  for select using (auth.uid() = kunde_id);

create policy "Kunden koennen Einloesung anfordern" on praemien_einloesungen
  for insert with check (auth.uid() = kunde_id);

-- Notwendig, weil die Bestätigung technisch über den eigenen Account
-- des Kunden läuft (Mitarbeiter hält nur den Chip ans Kunden-Handy,
-- genau wie beim normalen Stempeln).
create policy "Kunden koennen eigene Einloesung bestaetigen" on praemien_einloesungen
  for update using (auth.uid() = kunde_id);

create policy "Kunden koennen offene Einloesung zurueckziehen" on praemien_einloesungen
  for delete using (auth.uid() = kunde_id and eingeloest_am is null);

create policy "Admins koennen alle Einloesungen sehen" on praemien_einloesungen
  for select using (exists (select 1 from admins where admins.id = auth.uid()));

create policy "Admins koennen Einloesungen bestaetigen" on praemien_einloesungen
  for update using (exists (select 1 from admins where admins.id = auth.uid()));

create policy "Admins koennen Einloesungen loeschen" on praemien_einloesungen
  for delete using (exists (select 1 from admins where admins.id = auth.uid()));

-- ============================================================
-- NÄCHSTE SCHRITTE NACH AUSFÜHRUNG DIESER MIGRATION:
-- 1. Admin-Nutzer per Supabase Auth registrieren (normale Registrierung
--    in der App), dann dessen UUID in "admins" eintragen:
--    insert into admins (id, email) select id, email from auth.users
--    where email = 'admin@beispiel.de';
-- 2. Werte in "einstellungen" und "praemien_config" gemäß
--    brand.config.ts des neuen Kundenprojekts anpassen (auch komfortabel
--    über /admin/einstellungen bzw. /admin/praemien pflegbar).
-- 3. .env.local mit NEXT_PUBLIC_SUPABASE_URL (reine Basis-URL, OHNE
--    /rest/v1/-Suffix!) und NEXT_PUBLIC_SUPABASE_ANON_KEY befüllen.
-- ============================================================
