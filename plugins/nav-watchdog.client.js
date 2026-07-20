// Red de seguridad para la navegación SPA (bug N3, ronda 2 de pruebas):
// en producción se observaron rutas cuya vista nunca montaba tras un
// router.push (Suspense pendiente para siempre, sin error en window.onerror)
// y que dejaban TODA la navegación posterior muerta hasta recargar.
//
// Defensa en dos capas:
//  1. Watchdog: si tras un push la página no termina de montar en
//     WATCHDOG_MS, se recupera con una carga completa de la ruta destino
//     (el SSR de esas rutas siempre funcionó).
//  2. router.onError: un chunk perdido tras un deploy o un error en el
//     setup de la página recupera igual con navegación dura, en vez de
//     dejar la app muda.
//
// Los modales/overlays usan history.pushState directo (useModalBack /
// useOverlayBack), no vue-router, así que no arman este watchdog.

const WATCHDOG_MS = 10_000

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  let timer = null

  function desarmar() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function armar(fullPath) {
    desarmar()
    timer = setTimeout(() => {
      console.warn(
        `[nav-watchdog] la vista de ${fullPath} no montó en ${WATCHDOG_MS}ms — recuperando con carga completa`,
      )
      window.location.assign(fullPath)
    }, WATCHDOG_MS)
  }

  router.beforeEach((to, from) => {
    // La primera navegación (hidratación) y los cambios de query/hash sobre
    // la misma ruta no remontan la página: no armar el watchdog ahí.
    if (nuxtApp.isHydrating) return
    if (to.path === from.path) return
    armar(to.fullPath)
  })

  router.afterEach((to, from, failure) => {
    // Navegación abortada o redirigida por un middleware: no quedó nada
    // pendiente de montar.
    if (failure) desarmar()
  })

  // page:finish = la página montó y su Suspense resolvió.
  nuxtApp.hook('page:finish', desarmar)
  // Error irrecuperable mostrado por Nuxt: la página de error ya es visible.
  nuxtApp.hook('app:error', desarmar)

  router.onError((error, to) => {
    desarmar()
    console.error('[nav-watchdog] error de navegación', error)
    if (to?.fullPath) window.location.assign(to.fullPath)
  })
})
