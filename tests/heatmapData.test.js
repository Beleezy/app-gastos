import { describe, it, expect } from 'vitest'
import { ref, computed, unref } from 'vue'

globalThis.ref = ref
globalThis.computed = computed
globalThis.unref = unref

import { useHeatmapData } from '../composables/useHeatmapData.js'

describe('useHeatmapData', () => {
  it('genera matriz alineada y suma total del mes', () => {
    const gastos = [
      { fecha: '2026-04-01', monto: 10 },
      { fecha: '2026-04-01', monto: 5 },
      { fecha: '2026-04-15', monto: 20 },
      { fecha: '2026-03-31', monto: 50 }, // fuera del mes solicitado
    ]
    const { celdas, totalMes, maximo } = useHeatmapData({
      gastos: ref(gastos),
      mes: ref(4),
      anio: ref(2026),
      weekStart: 1,
    })

    expect(totalMes.value).toBe(35)
    expect(maximo.value).toBe(20)
    expect(celdas.value.length % 7).toBe(0)

    const dia1 = celdas.value.find((c) => c.fecha === '2026-04-01')
    expect(dia1?.monto).toBe(15)
    const dia15 = celdas.value.find((c) => c.fecha === '2026-04-15')
    expect(dia15?.intensidad).toBe(1)
  })

  it('maneja mes vacío', () => {
    const { celdas, totalMes } = useHeatmapData({
      gastos: ref([]),
      mes: ref(4),
      anio: ref(2026),
    })
    expect(totalMes.value).toBe(0)
    expect(celdas.value.length).toBeGreaterThan(0)
    expect(celdas.value.every((c) => c.monto === 0)).toBe(true)
  })

  it('sin mes/año devuelve estructura vacía', () => {
    const { celdas } = useHeatmapData({
      gastos: ref([]),
      mes: ref(null),
      anio: ref(null),
    })
    expect(celdas.value).toEqual([])
  })
})
