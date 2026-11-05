import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Connect Five: Python Edition',
    short_name: 'Connect Five',
    description: 'Answer Python questions. Connect five to win.',
    start_url: '/',
    display: 'standalone',
    background_color: '#04131a',
    theme_color: '#04131a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
