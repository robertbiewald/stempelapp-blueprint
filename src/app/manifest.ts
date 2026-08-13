import type { MetadataRoute } from 'next';
import { brandConfig } from '@/config/brand.config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brandConfig.firmenname,
    short_name: brandConfig.firmenname,
    description: brandConfig.appTitel,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: brandConfig.farben.akzent,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
