// Helper de cache stale-while-revalidate sobre `useState`. Permite que
// composables de datos compartidos eviten re-fetchear en cada navegación
// si los datos están "frescos" (dentro del TTL). Tras el TTL, devuelve lo
// cacheado pero dispara un refresh en background.
//
// Uso:
//   const cache = useResourceCache('categorias', () => apiFetch('/api/categorias'), { ttl: 5*60_000 })
//   await cache.refresh() // espera si no hay datos cacheados; instant si están frescos
//   cache.data.value      // datos (reactivo, useState para compartir entre componentes)

export function useResourceCache(key, fetcher, { ttl = 60_000, initial = null } = {}) {
  const data = useState(key, () => initial)
  const fetchedAt = useState(`${key}__ts`, () => 0)
  const isLoading = useState(`${key}__loading`, () => false)
  const inFlight = useState(`${key}__inflight`, () => null)

  function isStale() {
    return Date.now() - fetchedAt.value > ttl
  }

  async function refresh(force = false) {
    // Si hay datos frescos y no se fuerza, devolver inmediatamente.
    // `fetchedAt > 0` evita confundir el valor `initial` con datos cargados.
    if (!force && fetchedAt.value > 0 && !isStale()) {
      return data.value
    }
    // Dedupe: si ya hay un fetch en curso, esperar a esa promesa.
    if (inFlight.value) return inFlight.value

    isLoading.value = true
    const promise = (async () => {
      try {
        const result = await fetcher()
        data.value = result
        fetchedAt.value = Date.now()
        return result
      } finally {
        isLoading.value = false
        inFlight.value = null
      }
    })()
    inFlight.value = promise
    return promise
  }

  function invalidate() {
    fetchedAt.value = 0
  }

  function set(value) {
    data.value = value
    fetchedAt.value = Date.now()
  }

  return { data, isLoading, refresh, invalidate, set, isStale }
}
