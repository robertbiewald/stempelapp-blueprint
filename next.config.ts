import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Für Handy-Tests im lokalen WLAN/Hotspot: die eigene lokale IP
   * hier eintragen (z. B. per `ipconfig getifaddr en0` ermittelt).
   * Ändert sich die IP (häufig bei Hotspot-Nutzung), muss der Wert
   * hier aktualisiert werden. Bei anhaltenden Problemen (Formular
   * reagiert nicht, HMR-WebSocket-Fehler) stattdessen direkt gegen
   * die echte Vercel-Live-URL testen — Next.js' Hot-Reload-WebSocket
   * verbindet sich über andere Adressen als localhost nicht immer
   * zuverlässig.
   */
  // allowedDevOrigins: ["192.168.1.23"],
};

export default nextConfig;
