// https://nuxt.com/docs/api/configuration/nuxt-config
const APP_VERSION = '0.9.3'
const APP_NAME = 'Mis Finanzas'
const APP_SHORT_NAME = 'Finanzas'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@vite-pwa/nuxt',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
  ],

  // @ts-ignore — tipos generados por @nuxtjs/supabase tras `nuxt prepare`
  supabase: {
    url: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || '',
    key:
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ||
      '',
    redirect: false, // el middleware propio lo manejará
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 365, // 1 año — persistir sesión en PWA
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
    clientOptions: {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    },
  },

  app: {
    head: {
      title: APP_NAME,
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
        { name: 'description', content: 'Sistema de finanzas personales' },
        { name: 'theme-color', content: '#0f0f23', media: '(prefers-color-scheme: dark)' },
        { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: APP_SHORT_NAME },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: `/favicon.svg?v=${APP_VERSION}` },
        // Preconnect a Google Fonts para reducir latencia DNS/TLS en el primer paint.
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        // Cargar Inter sin bloquear el render: descargar como `print` y
        // promover a `all` cuando esté listo. En PWA Android esto evitaba
        // 1-3 s de splash blanco esperando el CSS de Google Fonts cuando
        // la red móvil estaba lenta.
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
          media: 'print',
          onload: "this.media='all'",
        },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },

  css: ['~/assets/css/main.css'],

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: APP_NAME,
      short_name: APP_SHORT_NAME,
      description: 'Gestiona tus finanzas personales',
      theme_color: '#1a1a2e',
      background_color: '#0f0f23',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: `/icons/icon-192x192.png?v=${APP_VERSION}`,
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: `/icons/icon-512x512.png?v=${APP_VERSION}`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      // Share Target API: permite recibir texto/imágenes desde otras
      // apps. Ver §5.4 de planifica.md.
      share_target: {
        action: '/share',
        method: 'POST',
        enctype: 'multipart/form-data',
        params: {
          title: 'title',
          text: 'text',
          url: 'url',
          files: [
            {
              name: 'image',
              accept: ['image/*'],
            },
          ],
        },
      },
      shortcuts: [
        {
          name: 'Registrar gasto',
          short_name: 'Registrar',
          description: 'Capturar gasto rápido por voz',
          url: '/registro',
          icons: [{ src: `/icons/icon-192x192.png?v=${APP_VERSION}`, sizes: '192x192' }],
        },
        {
          name: 'Deudas',
          short_name: 'Deudas',
          url: '/deudas',
          icons: [{ src: `/icons/icon-192x192.png?v=${APP_VERSION}`, sizes: '192x192' }],
        },
      ],
    },
    workbox: {
      navigateFallback: '/',
      // Excluir assets pesados (fuentes auto-hospedadas, imágenes grandes
      // y mapas) del precache para que la primera instalación del SW no
      // descargue 5+ MB antes de servir la app. Lo crítico (JS/CSS/HTML)
      // se sigue precacheando para offline.
      globPatterns: ['**/*.{js,css,html,svg,ico}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },

  routeRules: {
    '/auth/confirm': { ssr: false },
  },

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview;gemini-2.5-flash',
    geminiMaxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '3', 10),
    geminiRateLimits: process.env.GEMINI_RATE_LIMITS || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    public: {
      appName: APP_NAME,
      appVersion: APP_VERSION,
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
      devAuthBypass: process.env.DEV_AUTH_BYPASS === '1',
      devAuthToken: process.env.DEV_AUTH_TOKEN || '',
    },
  },
})
