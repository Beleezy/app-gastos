// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

const APP_VERSION = '0.9.4'
const APP_NAME = 'Mis Finanzas'
const APP_SHORT_NAME = 'Finanzas'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // En CI / E2E el inspector solo añade dependencias (vue-devtools-core/kit)
  // que Vite descubre en runtime, dispara una rebundle y un HMR a media
  // request — eso vacía `nuxtApp.$pinia` y el hook `app:rendered` de
  // @pinia/nuxt revienta con "Cannot read properties of undefined (reading
  // 'state')". Headless no usa el inspector, así que lo apagamos cuando
  // CI=true o NODE_ENV=test.
  devtools: { enabled: !process.env.CI && process.env.NODE_ENV !== 'test' },

  modules: [
    '@vite-pwa/nuxt',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
  ],

  // Flags experimentales que reducen tamaño de payload de hydration y
  // permiten cargar partes del client-only sin generar markup en SSR.
  experimental: {
    payloadExtraction: true,
    renderJsonPayloads: true,
    treeshakeClientOnly: true,
    asyncContext: true,
  },

  nitro: {
    // Pre-comprimir assets en build para que el servidor estático pueda
    // servirlos directamente con Content-Encoding correspondiente.
    compressPublicAssets: { gzip: true, brotli: true },
  },

  vite: {
    plugins: [tailwindcss()],
    // Pre-bundlear las deps que Vite encontraba en runtime: `workbox-window`
    // viene de @vite-pwa/nuxt y los `@vue/devtools-*` del inspector. Sin
    // esto la primera request del dev server dispara un rebundle + HMR que
    // vacía `$pinia` y rompe SSR (ver nota sobre `devtools.enabled`).
    optimizeDeps: {
      include: ['@vue/devtools-core', '@vue/devtools-kit', 'workbox-window'],
    },
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          // Aislar libs pesadas (jspdf/xlsx) en chunks separados. Como ya
          // se importan con `await import(...)` en useDeudaPdf/useExportExcel,
          // separarlas evita que su código se mezcle con código de la app.
          manualChunks(id: string) {
            // Vendors pesados: aislar para que el cache del navegador no se
            // invalide cuando solo cambia código de la app, y para no
            // mezclarlos con código crítico de la primera página.
            if (id.includes('node_modules/jspdf')) return 'vendor-jspdf'
            if (id.includes('node_modules/exceljs')) return 'vendor-exceljs'
            if (id.includes('node_modules/@supabase')) return 'vendor-supabase'
            if (id.includes('node_modules/pinia')) return 'vendor-pinia'
            if (id.includes('node_modules/zod')) return 'vendor-zod'
          },
        },
      },
    },
  },

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
        // Preconnect a Supabase para que el handshake TLS del primer fetch
        // a /auth y /rest empiece en paralelo con la descarga del JS.
        ...(process.env.SUPABASE_URL
          ? [{ rel: 'preconnect', href: process.env.SUPABASE_URL, crossorigin: '' }]
          : []),
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
      script: [
        // Aplicar tema (dark/light + acento + tamaño de fuente + daltónico)
        // SÍNCRONAMENTE antes de que Vue se monte. main.css define todas las
        // variables de color sobre `html.dark`/`html.light` + `accent-*`,
        // así que sin esto el primer paint usa los valores de `:root` por
        // defecto y al ejecutar `onMounted(initTheme)` el browser hace un
        // repaint completo — flicker visible y splash percibido más largo.
        {
          tagPosition: 'head',
          tagPriority: 'critical',
          innerHTML: "(function(){try{var d=document.documentElement;var L={rosado:1,blanco:1};var a=localStorage.getItem('theme-accent')||'azul';d.classList.add(L[a]?'light':'dark');d.classList.add('accent-'+a);d.style.fontSize=localStorage.getItem('theme-font-size')==='grande'?'18px':'16px';if(localStorage.getItem('colorblind-mode')==='true'){d.classList.add('colorblind');var l=document.createElement('link');l.id='colorblind-css';l.rel='stylesheet';l.href='/colorblind.css';document.head.appendChild(l);}}catch(e){}})();",
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
      // Opt-in update: en una app financiera, un SW comprometido
      // (build/dep poisoning) NO debe propagarse automáticamente. El
      // usuario decide cuándo recargar al ver el toast de actualización.
      // Ver components/layout/SwUpdatePrompt.vue.
      clientsClaim: false,
      skipWaiting: false,
      // Runtime caching: respaldo offline para GETs de API y caché de
      // fuentes. Workbox no intercepta POST/PUT/DELETE por default, así
      // que las mutaciones se siguen enviando a red directamente.
      runtimeCaching: [
        {
          // Endpoints "estables" (categorías, configuraciones): SWR para
          // servir cache instantáneo y revalidar en background.
          urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean; request: Request }) =>
            sameOrigin && (
              url.pathname.startsWith('/api/categorias') ||
              url.pathname.startsWith('/api/configuraciones')
            ),
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'api-stable',
            expiration: { maxEntries: 20, maxAgeSeconds: 3600 },
          },
        },
        {
          // Resto del API: NetworkFirst con timeout corto. Si la red
          // tarda más de 3s, se sirve la última respuesta cacheada.
          urlPattern: ({ url, sameOrigin, request }: { url: URL; sameOrigin: boolean; request: Request }) =>
            sameOrigin && url.pathname.startsWith('/api/') && request.method === 'GET',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-dynamic',
            networkTimeoutSeconds: 3,
            expiration: { maxEntries: 80, maxAgeSeconds: 300 },
          },
        },
        {
          // Webfonts: CacheFirst, viven 1 año.
          urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
          handler: 'CacheFirst',
          options: {
            cacheName: 'gfonts',
            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
      // Exponer hooks para que el componente SwUpdatePrompt detecte
      // cuando hay un waiting SW y pueda llamar a updateServiceWorker.
      periodicSyncForUpdates: 60 * 60, // chequea cada hora
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },

  routeRules: {
    '/auth/confirm': { ssr: false },
    '/auth/**': { ssr: false },
    '/login': { ssr: false },
  },

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview;gemini-2.5-flash',
    geminiMaxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '3', 10),
    geminiRateLimits: process.env.GEMINI_RATE_LIMITS || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    encryptionKey: process.env.ENCRYPTION_KEY || '',
    googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    googleOAuthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    googleOAuthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || '',
    appPublicUrl: process.env.APP_PUBLIC_URL || '',
    public: {
      appName: APP_NAME,
      appVersion: APP_VERSION,
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
      // VAPID public key — necesaria para que el cliente se suscriba al
      // PushManager. La private key NO se expone (queda en server runtimeConfig
      // implícito vía process.env y solo se lee desde webPushSender.js).
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
      // Bypass de auth para dev/E2E: SOLO se incluye fuera de producción.
      // Si se filtra al bundle del cliente en una build de prod (preview
      // deploy mal etiquetado, env var seteada por accidente), cualquier
      // visitante podría leer el token desde window.__NUXT__ y suplantar
      // a otros usuarios vía el middleware 04.dev-auth-bypass.
      ...(process.env.NODE_ENV !== 'production'
        ? {
            devAuthBypass: process.env.DEV_AUTH_BYPASS === '1',
            devAuthToken: process.env.DEV_AUTH_TOKEN || '',
          }
        : {}),
    },
  },
})
