/**
 * Prepara los datos para una vista heatmap mensual de gastos por día.
 * Ver §5.B punto 6 de planifica.md.
 *
 * Uso:
 *   const { celdas, maximo, totalMes } = useHeatmapData({
 *     gastos,         // ref/array de { fecha: 'YYYY-MM-DD', monto }
 *     mes: ref(4),
 *     anio: ref(2026),
 *   })
 *
 * `celdas` es un array de 35-42 entradas (matriz de calendario alineada
 * a domingo o lunes según `weekStart`) con shape:
 *   { fecha: string|null, monto: number, intensidad: 0..1, esActual: bool }
 */

export function useHeatmapData({ gastos, mes, anio, weekStart = 1 } = {}) {
  const datos = computed(() => {
    const arr = unref(gastos) || []
    const m = unref(mes)
    const y = unref(anio)
    if (!m || !y) return { celdas: [], maximo: 0, totalMes: 0 }

    // sumar por fecha solo del mes pedido
    const porFecha = new Map()
    let maximo = 0
    let totalMes = 0
    for (const g of arr) {
      const fecha = g.fecha
      if (!fecha || typeof fecha !== 'string') continue
      const [yy, mm] = fecha.split('-').map(Number)
      if (yy !== y || mm !== m) continue
      const monto = parseFloat(g.monto) || 0
      const acumulado = (porFecha.get(fecha) || 0) + monto
      porFecha.set(fecha, acumulado)
      if (acumulado > maximo) maximo = acumulado
      totalMes += monto
    }

    const primerDia = new Date(y, m - 1, 1)
    const offset = (primerDia.getDay() - weekStart + 7) % 7
    const diasEnMes = new Date(y, m, 0).getDate()
    const totalCeldas = Math.ceil((offset + diasEnMes) / 7) * 7

    const celdas = []
    for (let i = 0; i < totalCeldas; i++) {
      const dia = i - offset + 1
      if (dia < 1 || dia > diasEnMes) {
        celdas.push({ fecha: null, monto: 0, intensidad: 0, esActual: false })
        continue
      }
      const fechaStr = `${y}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      const monto = porFecha.get(fechaStr) || 0
      const intensidad = maximo > 0 ? Math.min(1, monto / maximo) : 0
      celdas.push({ fecha: fechaStr, monto, intensidad, esActual: monto > 0 })
    }

    return { celdas, maximo, totalMes }
  })

  return {
    celdas: computed(() => datos.value.celdas),
    maximo: computed(() => datos.value.maximo),
    totalMes: computed(() => datos.value.totalMes),
  }
}
