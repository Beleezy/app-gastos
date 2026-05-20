// Submódulo Suscripciones — gestor independiente de servicios recurrentes
// (Netflix, Spotify, gimnasio, hosting, etc.).
//
// Persistencia: localStorage (clave `subs.items.v1`). No depende de BD ni
// de endpoints del backend. Diseñado para ser self-contained y fácil de
// migrar a Postgres en una integración posterior; ver
// `docs/INTEGRACION-SUBMODULOS.md` para el schema y el upgrade path.

const STORAGE_KEY = 'subs.items.v1'

// Periodicidades válidas. Si añades una nueva, actualizar diasHasta()
// y proyeccionAnual().
export const PERIODICIDADES = [
  { valor: 'semanal', etiqueta: 'Semanal', mesesPorAnio: 52, diasMedios: 7 },
  { valor: 'quincenal', etiqueta: 'Quincenal', mesesPorAnio: 26, diasMedios: 14 },
  { valor: 'mensual', etiqueta: 'Mensual', mesesPorAnio: 12, diasMedios: 30 },
  { valor: 'bimestral', etiqueta: 'Bimestral', mesesPorAnio: 6, diasMedios: 60 },
  { valor: 'trimestral', etiqueta: 'Trimestral', mesesPorAnio: 4, diasMedios: 91 },
  { valor: 'semestral', etiqueta: 'Semestral', mesesPorAnio: 2, diasMedios: 182 },
  { valor: 'anual', etiqueta: 'Anual', mesesPorAnio: 1, diasMedios: 365 },
]

function nuevoId() {
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function _hoy() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Calcula la próxima fecha de cobro a partir de una suscripción.
// Algoritmo: arranca de `fechaInicio`, suma `diasMedios` hasta que la
// próxima caiga >= hoy. Para periodicidades >= mensual, además ajusta al
// día del mes original cuando aplica.
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
  const items = useLocalStorage(STORAGE_KEY, [])

  const activas = computed(() => items.value.filter(s => s.activa !== false))
  const inactivas = computed(() => items.value.filter(s => s.activa === false))

  const totalMensual = computed(() =>
    activas.value.reduce((sum, s) => sum + proyeccionMensual(s), 0),
  )
  const totalAnual = computed(() =>
    activas.value.reduce((sum, s) => sum + proyeccionAnual(s), 0),
  )

  // Próximos 30 días: lista de cobros futuros ordenados por fecha.
  const proximos30Dias = computed(() => {
    const hoy = _hoy()
    return activas.value
      .map(s => ({
        ...s,
        proxima: proximaFechaCobro(s, hoy),
      }))
      .filter(s => s.proxima)
      .map(s => ({
        ...s,
        diasRestantes: diasHasta(s.proxima, hoy),
      }))
      .filter(s => s.diasRestantes >= 0 && s.diasRestantes <= 30)
      .sort((a, b) => a.diasRestantes - b.diasRestantes)
  })

  function crear(data) {
    const item = {
      id: nuevoId(),
      nombre: String(data.nombre || '').trim(),
      monto: Number(data.monto) || 0,
      periodicidad: data.periodicidad || 'mensual',
      fechaInicio: data.fechaInicio || new Date().toISOString().slice(0, 10),
      categoria: data.categoria || null,
      icono: data.icono || '🔁',
      color: data.color || '#3b82f6',
      url: data.url || null,
      notas: data.notas || null,
      activa: data.activa !== false,
      createdAt: new Date().toISOString(),
    }
    items.value = [...items.value, item]
    return item
  }

  function actualizar(id, parche) {
    items.value = items.value.map(s => s.id === id ? { ...s, ...parche, id } : s)
  }

  function eliminar(id) {
    items.value = items.value.filter(s => s.id !== id)
  }

  function pausarReanudar(id) {
    items.value = items.value.map(s => s.id === id ? { ...s, activa: s.activa === false } : s)
  }

  function porId(id) {
    return items.value.find(s => s.id === id) || null
  }

  return {
    items, activas, inactivas,
    totalMensual, totalAnual, proximos30Dias,
    crear, actualizar, eliminar, pausarReanudar, porId,
  }
}
