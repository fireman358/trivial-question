// Trivial Quest — configuration Nuxt (SSR statique pour Cloudflare Pages)
export default defineNuxtConfig({
  ssr: true,
  // Rendu statique : les données de jeu sont publiques, aucun serveur nécessaire
  nitro: { preset: 'static' },
  app: {
    head: {
      title: 'Trivial Quest par tranche d\'âge — Edukisto',
      htmlAttrs: { lang: 'fr' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }
      ]
    }
  },
  css: ['~~/app/assets/css/main.css']
})
