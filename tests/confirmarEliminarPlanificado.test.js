// Borrar un gasto planificado y cancelar dejaba la página congelada.
//
// Los tres componentes que permiten borrar uno (lista, calendario y gráfico
// del planificador) registraban `useOverlayBack` sobre
// `gastoParaEliminar !== null` y además renderizaban `SharedConfirmDialog`,
// que ya gestiona su propio botón atrás y su bloqueo de scroll. Cancelar
// apagaba el booleano del diálogo pero NO el gasto elegido, así que el
// overlay del padre no se liberaba: el contador de `useModalLayer` se
// quedaba en uno y con él el `position: fixed` del body.
//
// Lo que se fija aquí: qué ref alimenta el overlay (solo el modal
// recurrente, el único escrito a mano) y que el gasto se limpie por
// cualquiera de los caminos de cierre — incluso cuando abrir y cerrar
// ocurren en el mismo tick, que es donde un `watch` sobre los dos
// booleanos no se entera (el valor vuelve al de partida y Vue no lo
// considera un cambio).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'

const overlays = []
vi.mock('../composables/useOverlayBack.js', () => ({
  useOverlayBack: (isVisible, closeFn) => {
    overlays.push({ isVisible, closeFn })
  },
}))

const { useConfirmarEliminarPlanificado } =
  await import('../composables/useConfirmarEliminarPlanificado.js')

const suelto = { id: 'g1', concepto: 'Luz', esRecurrente: false }
const recurrente = { id: 'g2', concepto: 'Alquiler', esRecurrente: true, recurrenteGrupoId: 'r1' }

beforeEach(() => {
  overlays.length = 0
})

describe('useConfirmarEliminarPlanificado', () => {
  it('el overlay se registra sobre el modal recurrente, no sobre el gasto elegido', () => {
    const s = useConfirmarEliminarPlanificado()
    expect(overlays).toHaveLength(1)
    // Elegir un gasto suelto NO debe abrir el overlay del padre: de eso se
    // encarga SharedConfirmDialog.
    s.pedirConfirmarEliminar(suelto)
    expect(overlays[0].isVisible.value).toBe(false)
    expect(s.showConfirmSimple.value).toBe(true)
    // El recurrente sí, porque ese modal está escrito a mano.
    s.pedirConfirmarEliminar(recurrente)
    expect(overlays[0].isVisible.value).toBe(true)
  })

  it('cancelar el diálogo simple limpia el gasto elegido (el bug)', async () => {
    const s = useConfirmarEliminarPlanificado()
    s.pedirConfirmarEliminar(suelto)
    expect(s.gastoParaEliminar.value).toEqual(suelto)
    // Esto es lo único que hace SharedConfirmDialog al cancelar.
    s.showConfirmSimple.value = false
    await nextTick()
    expect(s.gastoParaEliminar.value).toBeNull()
  })

  it('cerrar el modal recurrente también lo limpia, y libera el overlay', async () => {
    const s = useConfirmarEliminarPlanificado()
    s.pedirConfirmarEliminar(recurrente)
    s.showModalRecurrente.value = false
    await nextTick()
    expect(s.gastoParaEliminar.value).toBeNull()
    expect(overlays[0].isVisible.value).toBe(false)
  })

  it('el botón atrás cierra el modal recurrente y limpia', async () => {
    const s = useConfirmarEliminarPlanificado()
    s.pedirConfirmarEliminar(recurrente)
    overlays[0].closeFn()
    await nextTick()
    expect(s.showModalRecurrente.value).toBe(false)
    expect(s.gastoParaEliminar.value).toBeNull()
  })

  it('confirmar devuelve el gasto y deja todo cerrado', async () => {
    const s = useConfirmarEliminarPlanificado()
    s.pedirConfirmarEliminar(suelto)
    expect(s.tomarGastoYCerrar()).toEqual(suelto)
    expect(s.showConfirmSimple.value).toBe(false)
    expect(s.showModalRecurrente.value).toBe(false)
    expect(s.gastoParaEliminar.value).toBeNull()
    // Confirmar dos veces no repite el borrado.
    expect(s.tomarGastoYCerrar()).toBeNull()
  })

  it('pasar de un gasto a otro no deja los dos diálogos abiertos a la vez', () => {
    const s = useConfirmarEliminarPlanificado()
    s.pedirConfirmarEliminar(recurrente)
    s.pedirConfirmarEliminar(suelto)
    expect(s.showModalRecurrente.value).toBe(false)
    expect(s.showConfirmSimple.value).toBe(true)
  })

  it('sin gasto no abre nada', () => {
    const s = useConfirmarEliminarPlanificado()
    s.pedirConfirmarEliminar(null)
    expect(s.showConfirmSimple.value).toBe(false)
    expect(s.gastoParaEliminar.value).toBeNull()
  })
})
