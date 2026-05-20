// Submódulo Presupuestos por categoría — define un límite mensual por
// categoría y lo compara con el gasto real del mes.
//
// Persistencia: localStorage (`pcat.items.v1`).
// Lectura de gasto real: usa el endpoint existente /api/gastos
// agrupado por categoría — NO requiere endpoints nuevos.

const STORAGE_KEY = 'pcat.items.v1'

export const UMBRAL_ALERTA = 80 // %
export const UMBRAL_CRITICO = 100 // %

function nuevoId() {
  return `pcat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function usePresupuestosCategoria() {
  // items: [{ id, categoriaId, montoMensual, alertaUmbral }]
  const items = useLocalStorage(STORAGE_KEY, [])

  // Estado del gasto real del mes por categoría — se rellena bajo demanda.
  const consumoPorCategoria = useState('pcat-consumo', () => ({}))
  const ultimaCargaMes = useState('pcat-consumo-mes', () => '')
  const cargando = ref(false)

  const { apiFetch } = useApiFetch()

  function setPresupuesto({ categoriaId, montoMensual, alertaUmbral = UMBRAL_ALERTA }) {
    const existente = items.value.find(i => i.categoriaId === categoriaId)
    if (existente) {
      items.value = items.value.map(i =>
        i.categoriaId === categoriaId ? { ...i, montoMensual: Number(montoMensual) || 0, alertaUmbral } : i,
      )
    } else {
      items.value = [
        ...items.value,
        {
          id: nuevoId(),
          categoriaId,
          montoMensual: Number(montoMensual) || 0,
          alertaUmbral,
          createdAt: new Date().toISOString(),
        },
      ]
    }
  }

  function eliminarPresupuesto(categoriaId) {
    items.value = items.value.filter(i => i.categoriaId !== categoriaId)
  }

  function porCategoria(categoriaId) {
    return items.value.find(i => i.categoriaId === categoriaId) || null
  }

  // Carga el consumo del mes por categoría desde /api/gastos.
  async function cargarConsumo(mes, anio) {
    const key = `${anio}-${mes}`
    if (ultimaCargaMes.value === key && Object.keys(consumoPorCategoria.value).length > 0) return
    cargando.value = true
    try {
      const data = await apiFetch('/api/gastos', { query: { mes, anio } })
      const acc = {}
      for (const g of data || []) {
        if (!g.categoriaId) continue
        acc[g.categoriaId] = (acc[g.categoriaId] || 0) + (Number(g.monto) || 0)
      }
      consumoPorCategoria.value = acc
      ultimaCargaMes.value = key
    } catch (e) {
      console.warn('[presupuestos-cat] no se pudo cargar consumo:', e)
    } finally {
      cargando.value = false
    }
  }

  function consumoDe(categoriaId) {
    return consumoPorCategoria.value[categoriaId] || 0
  }

  function porcentajeUsado(categoriaId) {
    const p = porCategoria(categoriaId)
    if (!p || !p.montoMensual) return 0
    return (consumoDe(categoriaId) / p.montoMensual) * 100
  }

  function estadoSemaforo(categoriaId) {
    const pct = porcentajeUsado(categoriaId)
    const p = porCategoria(categoriaId)
    const alerta = p?.alertaUmbral ?? UMBRAL_ALERTA
    if (pct >= UMBRAL_CRITICO) return 'critico'
    if (pct >= alerta) return 'alerta'
    return 'ok'
  }

  const totalPresupuestado = computed(() =>
    items.value.reduce((sum, i) => sum + (Number(i.montoMensual) || 0), 0),
  )
  const totalConsumido = computed(() =>
    items.value.reduce((sum, i) => sum + consumoDe(i.categoriaId), 0),
  )

  return {
    items, cargando,
    totalPresupuestado, totalConsumido,
    setPresupuesto, eliminarPresupuesto, porCategoria,
    cargarConsumo, consumoDe, porcentajeUsado, estadoSemaforo,
  }
}
