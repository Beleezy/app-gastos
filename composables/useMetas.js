// Submódulo Metas — objetivos financieros con tracking de progreso.
//
// Tipos:
//   - ahorro: monto a acumular (avanza al sumar depósitos manuales).
//   - deuda: monto a pagar (avanza al registrar abonos manuales).
//   - gasto_limite: tope mensual a no superar (avanza con consumo registrado).
//
// Persistencia: localStorage (claves `metas.items.v1` y `metas.movs.v1`).
// Movimientos guardados aparte para que el log no infle el objeto principal.

const STORAGE_ITEMS = 'metas.items.v1'
const STORAGE_MOVS = 'metas.movs.v1'

export const TIPOS_META = [
  { valor: 'ahorro', etiqueta: 'Ahorro', icono: '💰', signo: 1, hint: 'Acumular X soles' },
  { valor: 'deuda', etiqueta: 'Pagar deuda', icono: '💳', signo: 1, hint: 'Reducir X soles' },
  { valor: 'gasto_limite', etiqueta: 'Tope de gasto', icono: '🛑', signo: -1, hint: 'No superar X soles' },
]

function nuevoId() {
  return `meta_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function useMetas() {
  const items = useLocalStorage(STORAGE_ITEMS, [])
  const movs = useLocalStorage(STORAGE_MOVS, [])

  function movimientosDe(metaId) {
    return movs.value.filter(m => m.metaId === metaId).sort((a, b) => b.fecha.localeCompare(a.fecha))
  }

  function progresoActual(meta) {
    const ms = movimientosDe(meta.id)
    return ms.reduce((sum, m) => sum + (Number(m.monto) || 0), 0)
  }

  function porcentajeProgreso(meta) {
    const obj = Number(meta.montoObjetivo) || 0
    if (obj <= 0) return 0
    return Math.min(100, Math.max(0, (progresoActual(meta) / obj) * 100))
  }

  function diasRestantes(meta) {
    if (!meta.fechaLimite) return null
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const limite = new Date(meta.fechaLimite + 'T23:59:59')
    return Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24))
  }

  function estaCompletada(meta) {
    return porcentajeProgreso(meta) >= 100
  }

  const activas = computed(() => items.value.filter(m => !m.archivada))
  const archivadas = computed(() => items.value.filter(m => m.archivada))

  const totalObjetivo = computed(() =>
    activas.value.reduce((sum, m) => sum + (Number(m.montoObjetivo) || 0), 0),
  )
  const totalProgreso = computed(() =>
    activas.value.reduce((sum, m) => sum + progresoActual(m), 0),
  )

  function crear(data) {
    const meta = {
      id: nuevoId(),
      nombre: String(data.nombre || '').trim(),
      tipo: data.tipo || 'ahorro',
      montoObjetivo: Number(data.montoObjetivo) || 0,
      fechaLimite: data.fechaLimite || null,
      icono: data.icono || '🎯',
      color: data.color || '#10b981',
      notas: data.notas || null,
      archivada: false,
      createdAt: new Date().toISOString(),
    }
    items.value = [...items.value, meta]
    return meta
  }

  function actualizar(id, parche) {
    items.value = items.value.map(m => m.id === id ? { ...m, ...parche, id } : m)
  }

  function eliminar(id) {
    items.value = items.value.filter(m => m.id !== id)
    movs.value = movs.value.filter(m => m.metaId !== id)
  }

  function archivar(id, valor = true) {
    actualizar(id, { archivada: valor })
  }

  function registrarMovimiento(metaId, { monto, nota = '', fecha = null }) {
    const mov = {
      id: `mov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      metaId,
      monto: Number(monto) || 0,
      nota: nota || '',
      fecha: fecha || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    }
    movs.value = [...movs.value, mov]
    return mov
  }

  function eliminarMovimiento(movId) {
    movs.value = movs.value.filter(m => m.id !== movId)
  }

  function porId(id) {
    return items.value.find(m => m.id === id) || null
  }

  return {
    items, activas, archivadas, movs,
    totalObjetivo, totalProgreso,
    crear, actualizar, eliminar, archivar,
    registrarMovimiento, eliminarMovimiento,
    movimientosDe, progresoActual, porcentajeProgreso, diasRestantes, estaCompletada,
    porId,
  }
}
