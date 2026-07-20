export function useCategorias() {
  const { apiFetch } = useApiFetch()

  // Cache con SWR de 5 min: las categorías cambian rara vez. Se evita
  // re-fetchear en cada navegación a /registro o /planificador.
  // Compartido con useGastos/usePlanificador vía la key 'registro-categorias'.
  // cache: 'no-cache' — el endpoint responde con max-age=300; sin esto, el
  // refresh tras editar una categoría se servía del caché HTTP del navegador
  // y la UI mostraba el icono/color viejos. El TTL en memoria de este
  // composable ya cubre el caso de navegaciones repetidas.
  const cache = useResourceCache(
    'registro-categorias',
    () => apiFetch('/api/categorias', { cache: 'no-cache' }),
    { ttl: 5 * 60 * 1000, initial: [] },
  )

  const categorias = cache.data

  async function fetchCategorias(force = false) {
    return cache.refresh(force)
  }

  function invalidateCategorias() {
    cache.invalidate()
  }

  function normalizarTexto(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  function getCategoriaColor(nombre) {
    const cat = categorias.value.find((c) => normalizarTexto(c.nombre) === normalizarTexto(nombre))
    return cat?.color || '#6b7280'
  }

  function getCategoriaIcono(nombre) {
    const cat = categorias.value.find((c) => normalizarTexto(c.nombre) === normalizarTexto(nombre))
    return cat?.icono || '📦'
  }

  function getCategoriaNames() {
    return categorias.value.map((c) => c.nombre)
  }

  return {
    categorias,
    fetchCategorias,
    invalidateCategorias,
    getCategoriaColor,
    getCategoriaIcono,
    getCategoriaNames,
  }
}
