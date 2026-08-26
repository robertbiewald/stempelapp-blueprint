'use client';

import { useState, type FormEvent, type ReactElement } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { brandConfig } from '@/config/brand.config';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');

  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [ladevorgang, setLadevorgang] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFehler(null);
    setHinweis(null);

    if (!EMAIL_REGEX.test(email)) {
      setFehler('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }

    setLadevorgang(true);
    const supabase = createClient();

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setHinweis('Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen verschickt.');
        return;
      }

      if (isRegister) {
        if (!vorname.trim() || !nachname.trim()) {
          setFehler('Bitte Vor- und Nachname angeben.');
          return;
        }

        const { data, error } = await supabase.auth.signUp({ email, password: passwort });
        if (error) throw error;

        const userId = data.user?.id;
        if (userId) {
          const { error: insertError } = await supabase.from('kunden').insert({
            id: userId,
            vorname: vorname.trim(),
            name: nachname.trim(),
            email,
          });
          if (insertError) {
            setFehler(`Konto erstellt, aber Profil-Speicherung fehlgeschlagen: ${insertError.message}`);
            return;
          }
        }

        router.push(next ?? '/karte');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });
      if (error) throw error;

      if (next) {
        router.push(next);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: adminRow } = await supabase
          .from('admins')
          .select('id')
          .eq('id', userData.user.id)
          .maybeSingle();

        router.push(adminRow ? '/admin' : '/karte');
        return;
      }

      router.push('/karte');
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setLadevorgang(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="w-full max-w-sm rounded-3xl border border-[rgba(0,43,241,0.08)] bg-white p-8 shadow-[0_20px_60px_-15px_rgba(0,43,241,0.15)]">
        <div className="flex flex-col items-center gap-6">
          <Image src={brandConfig.logoPfad} alt={brandConfig.firmenname} width={72} height={72} priority />

          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: 'rgba(0,43,241,0.15)', color: brandConfig.farben.praemienRand }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: brandConfig.farben.akzent }} />
            Digitale Kundenkarte
          </div>

          <div className="w-full text-center">
            <h1 className="text-2xl font-extrabold" style={{ color: brandConfig.farben.primaer }}>
              {brandConfig.appTitel}
            </h1>
            <p className="mt-2 text-sm text-gray-500">{brandConfig.loginUntertitel}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex w-full flex-col gap-3">
          {isRegister && (
            <>
              <input
                type="text"
                placeholder="Vorname"
                value={vorname}
                onChange={(e) => setVorname(e.target.value)}
                className="text-base w-full rounded-xl border px-4 py-3"
                style={{ borderColor: 'rgba(0,43,241,0.15)', backgroundColor: '#F4F6FF' }}
                required
              />
              <input
                type="text"
                placeholder="Nachname"
                value={nachname}
                onChange={(e) => setNachname(e.target.value)}
                className="text-base w-full rounded-xl border px-4 py-3"
                style={{ borderColor: 'rgba(0,43,241,0.15)', backgroundColor: '#F4F6FF' }}
                required
              />
            </>
          )}

          <input
            type="email"
            placeholder="E-Mail-Adresse"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-base w-full rounded-xl border px-4 py-3"
            style={{ borderColor: 'rgba(0,43,241,0.15)', backgroundColor: '#F4F6FF' }}
            required
          />

          {!isForgotPassword && (
            <input
              type="password"
              placeholder="Passwort"
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              className="text-base w-full rounded-xl border px-4 py-3"
              style={{ borderColor: 'rgba(0,43,241,0.15)', backgroundColor: '#F4F6FF' }}
              required
              minLength={6}
            />
          )}

          {fehler && <p className="text-sm text-red-600">{fehler}</p>}
          {hinweis && <p className="text-sm text-green-700">{hinweis}</p>}

          <button
            type="submit"
            disabled={ladevorgang}
            className="w-full rounded-full px-4 py-3 font-semibold text-white touch-manipulation disabled:opacity-50"
            style={{ backgroundColor: brandConfig.farben.akzent }}
          >
            {isForgotPassword ? 'Link anfordern' : isRegister ? 'Registrieren' : 'Einloggen'}
          </button>

          {!isForgotPassword && (
            <button
              type="button"
              onClick={() => {
                setIsRegister((v) => !v);
                setFehler(null);
                setHinweis(null);
              }}
              className="w-full py-3 text-sm text-gray-600 touch-manipulation"
            >
              {isRegister ? 'Bereits registriert? Einloggen' : 'Noch kein Konto? Jetzt registrieren'}
            </button>
          )}

          {!isRegister && (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword((v) => !v);
                setFehler(null);
                setHinweis(null);
              }}
              className="w-full py-3 text-sm text-gray-400 touch-manipulation"
            >
              {isForgotPassword ? 'Zurück zum Login' : 'Passwort vergessen?'}
            </button>
          )}
        </form>
      </div>

      <a
        href="https://grothe-biewald.de"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-500"
      >
        Ein Produkt von
        <Image src="/gb-systems-logo.svg" alt="G&B Systems" width={16} height={16} className="rounded" />
        <span className="underline">G&amp;B Systems</span>
      </a>
    </div>
  );
}

export default function Page(): ReactElement {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
