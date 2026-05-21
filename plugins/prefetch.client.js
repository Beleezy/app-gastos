// Prefetch en idle: dispara, después del primer paint y cuando el browser
// está ocioso, los fetches de los recursos que los composables y páginas
// más usadas necesitan (categorías, configuración, dashboard, planificador,
// deudas). Cada fetch se cachea en el mismo `useState` (vía useResourceCache
// / composables) que la página leerá luego, así la navegación a /registro,
// /planificador, /deudas pinta con datos inmediatamente.
//
// Reglas:
// - SOLO se ejecuta cliente, tras `load`, y SOLO si el usuario está
//   autenticado y la conexión no es lenta (saveData / 2G).
// - Cada bloque está envuelto en try/catch + isolated promise para que un
//   endpoint caído no contagie al resto.
// - No bloquea TTI: usa requestIdleCallback con timeout 4s y deadline para
//   ceder el thread.

const RUTAS_PUBLICAS = new Set(['/login', '/auth/confirm', '/dev-login', '/share'])

function esRedLenta() {
  if (typeof navigator === 'undefined') return false
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!c) return false
  if (c.saveData) return true
  const t = c.effectiveType || ''
  return t === 'slow-2g' || t === '2g'
}

function idle(cb, timeout = 4000) {
  if (typeof window === 'undefined') return
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(cb, { timeout })
  } else {
    setTimeout(cb, 400)
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  if (typeof window === 'undefined') return

  // Esperar al primer render (afterEach del router corre tras la primera
  // navegación). Antes de eso, hidratar la página actual ya consume CPU.
  let hechoYa = false
  nuxtApp.hook('page:finish', () => {
    if (hechoYa) return
    hechoYa = true

    const route = useRoute()
    if (RUTAS_PUBLICAS.has(route.path)) return
    if (esRedLenta()) return

    const arrancar = () => {
      // Esperar a `load` para no robar ancho de banda mientras se descargan
      // chunks críticos de la página actual.
      const ejecutar = () => idle(prewarmAll, 5000)
      if (document.readyState === 'complete') ejecutar()
      else window.addEventListener('load', ejecutar, { once: true })
    }

    // Demorar mínimo un tick para que el await del page:finish no compita
    // con el render del primer frame.
    setTimeout(arrancar, 0)
  })

  async function prewarmAll() {
    // Pre-cachear sólo si los recursos están "fríos" en el cliente. Cada
    // composable expone su propio cache (useResourceCache) y aquí lo
    // forzamos en background.
    const route = useRoute()
    const enHome = route.path === '/'
    const enRegistro = route.path === '/registro'
    const enPlanificador = route.path.startsWith('/planificador')
    const enDeudas = route.path === '/deudas'

    const { apiFetch } = useApiFetch()
    const tareas = []

    // 1) Categorías y configuración: estables (SWR 5 min) — siempre las
    //    pedimos: las usan registro, planificador, categorias y futuros.
    try {
      const { fetchCategorias } = useCategorias()
      tareas.push(fetchCategorias().catch(() => {}))
    } catch {}

    try {
      const { fetchConfig } = useConfiguraciones()
      tareas.push(fetchConfig().catch(() => {}))
    } catch {}

    // 2) Dashboard consolidado: saltarse si ya estamos en el home (la
    //    propia página acaba de hacer el fetch). Cualquier otra ruta:
    //    cachear para que volver al home sea instantáneo.
    if (!enHome) {
      tareas.push(
        apiFetch('/api/dashboard')
          .then((data) => {
            try {
              sessionStorage.setItem(
                'dashboard.snapshot.v1',
                JSON.stringify({ ts: Date.now(), data }),
              )
            } catch {}
            try {
              const snap = useState('dashboard-snapshot', () => null)
              snap.value = data
            } catch {}
          })
          .catch(() => {}),
      )
    }

    // 3) Resumen + personas de deudas: badge del BottomNav y página /deudas.
    if (!enDeudas) {
      try {
        const { fetchPersonas, fetchResumen } = useDeudas()
        tareas.push(fetchResumen().catch(() => {}))
        tareas.push(fetchPersonas().catch(() => {}))
      } catch {}
    }

    // 4) Plan del mes: badge y página /planificador.
    if (!enPlanificador) {
      try {
        const { fetchPlan } = usePlanificador()
        tareas.push(fetchPlan().catch(() => {}))
      } catch {}
    }

    // 5) Vínculos pendientes (badge en deudas).
    try {
      const { fetchPendientes } = useVinculos()
      tareas.push(fetchPendientes().catch(() => {}))
    } catch {}

    // 6) Si NO estamos en /registro, pre-traer el resumen del mes (light).
    if (!enRegistro) {
      try {
        const { fetchResumen } = useGastos()
        tareas.push(fetchResumen().catch(() => {}))
      } catch {}
    }

    // Esperar todo en paralelo. Cada uno ya está silenciado.
    await Promise.allSettled(tareas)
  }
})
