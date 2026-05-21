// Submódulo Suscripciones — gestor de servicios recurrentes.
//
// Integrado con backend desde la migración 0026. Mantiene la API pública
// del composable que usaba localStorage para no romper /suscripciones ni
// /calendario.

const STORAGE_KEY_LEGACY = 'subs.items.v1'

export const PERIODICIDADES = [
  { valor: 'semanal', etiqueta: 'Semanal', mesesPorAnio: 52, diasMedios: 7 },
  { valor: 'quincenal', etiqueta: 'Quincenal', mesesPorAnio: 26, diasMedios: 14 },
  { valor: 'mensual', etiqueta: 'Mensual', mesesPorAnio: 12, diasMedios: 30 },
  { valor: 'bimestral', etiqueta: 'Bimestral', mesesPorAnio: 6, diasMedios: 60 },
  { valor: 'trimestral', etiqueta: 'Trimestral', mesesPorAnio: 4, diasMedios: 91 },
  { valor: 'semestral', etiqueta: 'Semestral', mesesPorAnio: 2, diasMedios: 182 },
  { valor: 'anual', etiqueta: 'Anual', mesesPorAnio: 1, diasMedios: 365 },
]

function _hoy() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function proximaFechaCobro(sub, hoyDate = _hoy()) {
  if (!sub?.fechaInicio) return null
  const periodo = PERIODICIDADES.find(p => p.valor === sub.periodicidad)
  if (!periodo) return null

  let cursor = new Date(sub.fechaInicio + 'T00:00:00')
  const safety = 5000
  let i = 0
  while (cursor < hoyDate && i < safety) {
    cursor = new Date(cursor)
    if (periodo.valor === 'mensual') cursor.setMonth(cursor.getMonth() + 1)
    else if (periodo.valor === 'bimestral') cursor.setMonth(cursor.getMonth() + 2)
    else if (periodo.valor === 'trimestral') cursor.setMonth(cursor.getMonth() + 3)
    else if (periodo.valor === 'semestral') cursor.setMonth(cursor.getMonth() + 6)
    else if (periodo.valor === 'anual') cursor.setFullYear(cursor.getFullYear() + 1)
    else cursor.setDate(cursor.getDate() + periodo.diasMedios)
    i++
  }
  return cursor
}

export function diasHasta(fecha, hoyDate = _hoy()) {
  if (!fecha) return null
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  return Math.round((d - hoyDate) / (1000 * 60 * 60 * 24))
}

export function proyeccionMensual(sub) {
  const monto = Number(sub.monto) || 0
  const periodo = PERIODICIDADES.find(p => p.valor === sub.periodicidad)
  if (!periodo) return 0
  return Math.round((monto * periodo.mesesPorAnio / 12) * 100) / 100
}

export function proyeccionAnual(sub) {
  const monto = Number(sub.monto) || 0
  const periodo = PERIODICIDADES.find(p => p.valor === sub.periodicidad)
  if (!periodo) return 0
  return Math.round(monto * periodo.mesesPorAnio * 100) / 100
}

export function useSuscripciones() {
  const { apiFetch } = useApiFetch()

  // SWR: el resumen es estable. Cualquier mutación invalida vía el cache.
  const cache = useResourceCache(
    'suscripciones-servicios',
    () => apiFetch('/api/suscripciones-servicios'),
    { ttl: 60_000, initial: [] },
  )
  const items = cache.data

  async function fetchItems(force = false) {
    return cache.refresh(force)
  }

  const activas = computed(() => items.value.filter(s => s.activa !== false))
  const inactivas = computed(() => items.value.filter(s => s.activa === false))

  const totalMensual = computed(() =>
    activas.value.reduce((sum, s) => sum + proyeccionMensual(s), 0),
  )
  const totalAnual = computed(() =>
    activas.value.reduce((sum, s) => sum + proyeccionAnual(s), 0),
  )

  const proximos30Dias = computed(() => {
    const hoy = _hoy()
    return activas.value
      .map(s => ({ ...s, proxima: proximaFechaCobro(s, hoy) }))
      .filter(s => s.proxima)
      .map(s => ({ ...s, diasRestantes: diasHasta(s.proxima, hoy) }))
      .filter(s => s.diasRestantes >= 0 && s.diasRestantes <= 30)
      .sort((a, b) => a.diasRestantes - b.diasRestantes)
  })

  async function crear(data) {
    const nuevo = await apiFetch('/api/suscripciones-servicios', {
      method: 'POST',
      body: {
        nombre: data.nombre,
        monto: data.monto,
        periodicidad: data.periodicidad || 'mensual',
        fechaInicio: data.fechaInicio,
        categoriaId: data.categoriaId || null,
        icono: data.icono || '🔁',
        color: data.color || '#3b82f6',
        url: data.url || null,
        notas: data.notas || null,
        activa: data.activa !== false,
      },
    })
    cache.set([...items.value, nuevo])
    return nuevo
  }

  async function actualizar(id, parche) {
    const updated = await apiFetch(`/api/suscripciones-servicios/${id}`, {
      method: 'PUT',
      body: parche,
    })
    cache.set(items.value.map(s => s.id === id ? updated : s))
    return updated
  }

  async function eliminar(id) {
    await apiFetch(`/api/suscripciones-servicios/${id}`, { method: 'DELETE' })
    cache.set(items.value.filter(s => s.id !== id))
  }

  async function pausarReanudar(id) {
    const s = items.value.find(x => x.id === id)
    if (!s) return
    return actualizar(id, { activa: s.activa === false })
  }

  function porId(id) {
    return items.value.find(s => s.id === id) || null
  }

  // Migración localStorage → backend: corre una sola vez por usuario/sesión.
  // Lee la clave legacy, POSTea cada item, y borra la clave en éxito total.
  async function migrarLocalStorageSiHaceFalta() {
    if (typeof localStorage === 'undefined') return
    const raw = localStorage.getItem(STORAGE_KEY_LEGACY)
    if (!raw) return
    let legacy
    try { legacy = JSON.parse(raw) } catch { return }
    if (!Array.isArray(legacy) || legacy.length === 0) {
      localStorage.removeItem(STORAGE_KEY_LEGACY)
      return
    }
    // No duplicar: si el backend ya tiene items, asumimos que migración previa
    // completó pero quedó la clave; borrarla.
    await fetchItems(true)
    if (items.value.length > 0) {
      localStorage.removeItem(STORAGE_KEY_LEGACY)
      return
    }
    let okCount = 0
    for (const it of legacy) {
      try {
        await crear({
          nombre: it.nombre,
          monto: it.monto,
          periodicidad: it.periodicidad,
          fechaInicio: it.fechaInicio,
          icono: it.icono,
          color: it.color,
          url: it.url,
          notas: it.notas,
          activa: it.activa !== false,
        })
        okCount++
      } catch (e) {
        console.warn('[suscripciones] migración item falló', e)
      }
    }
    if (okCount === legacy.length) {
      localStorage.removeItem(STORAGE_KEY_LEGACY)
    }
  }

  return {
    items, activas, inactivas,
    totalMensual, totalAnual, proximos30Dias,
    fetchItems, crear, actualizar, eliminar, pausarReanudar, porId,
    migrarLocalStorageSiHaceFalta,
  }
}
