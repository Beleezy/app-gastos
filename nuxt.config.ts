// https://nuxt.com/docs/api/configuration/nuxt-config
const APP_VERSION = '0.9'
const APP_NAME = 'Mis Finanzas'
const APP_SHORT_NAME = 'Finanzas'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@vite-pwa/nuxt',
    '@nuxtjs/supabase',
  ],

  // @ts-ignore — tipos generados por @nuxtjs/supabase tras `nuxt prepare`
  supabase: {
    redirect: false, // el middleware propio lo manejará
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 365, // 1 año — persistir sesión en PWA
      sameSite: 'lax',
      secure: true,
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
        { name: 'theme-color', content: '#1a1a2e' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: `/favicon.svg?v=${APP_VERSION}` },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
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
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
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
    },
  },
})
