import { computed, ref } from 'vue'
import { useOverlayBack } from './useOverlayBack'

/**
 * Estado del borrado de un gasto planificado. Es el MISMO flujo en los tres
 * sitios donde se puede borrar uno (la lista, el calendario y el gráfico del
 * planificador): un `SharedConfirmDialog` para el gasto suelto y un modal
 * propio para el recurrente, que pregunta si borrar solo este mes o también
 * los futuros.
 *
 * Por qué vive aquí y no copiado tres veces: los tres registraban
 * `useOverlayBack` sobre `gastoParaEliminar !== null` Y además renderizaban
 * `SharedConfirmDialog`, que ya gestiona su propio botón atrás y su propio
 * bloqueo de scroll. Al cancelar, el diálogo solo apaga SU booleano, así que
 * `gastoParaEliminar` seguía puesto: el overlay del padre no se liberaba
 * nunca, el contador de `useModalLayer` no bajaba a cero y el
 * `position: fixed` que ese contador pone en el `body` se quedaba puesto.
 * Resultado: tras cancelar un borrado, la página no volvía a hacer scroll.
 *
 * El arreglo no es acordarse de limpiar: es que no haya dos verdades que
 * puedan discrepar. Un único ref (`modo`) dice qué diálogo está abierto y
 * los dos booleanos que consume la plantilla son computados sobre él, con
 * setter: apagar cualquiera de los dos cierra todo y suelta el gasto. Así,
 * venga el cierre de confirmar, de cancelar, del backdrop, de Escape o del
 * botón atrás, el estado siempre queda consistente.
 *
 * El overlay se registra SOLO sobre el modal recurrente, que es el único
 * escrito a mano; el diálogo compartido ya se gestiona solo y registrarlo
 * aquí otra vez era el segundo bloqueo de scroll que nadie soltaba.
 */
export function useConfirmarEliminarPlanificado() {
  const gastoParaEliminar = ref(null)
  // null | 'simple' | 'recurrente'
  const modo = ref(null)

  function cancelarEliminar() {
    modo.value = null
    gastoParaEliminar.value = null
  }

  const showConfirmSimple = computed({
    get: () => modo.value === 'simple',
    set: (v) => {
      if (!v && modo.value === 'simple') cancelarEliminar()
    },
  })

  const showModalRecurrente = computed({
    get: () => modo.value === 'recurrente',
    set: (v) => {
      if (!v && modo.value === 'recurrente') cancelarEliminar()
    },
  })

  useOverlayBack(showModalRecurrente, cancelarEliminar)

  /** Punto de entrada único: elige el diálogo según el gasto. */
  function pedirConfirmarEliminar(gasto) {
    if (!gasto) return
    gastoParaEliminar.value = gasto
    modo.value = gasto.esRecurrente && gasto.recurrenteGrupoId ? 'recurrente' : 'simple'
  }

  /**
   * Cierra los diálogos y devuelve el gasto que estaba elegido, para que
   * quien confirma no tenga que acordarse de limpiar el estado a mano (que
   * es justo lo que se olvidaba en el camino de cancelar).
   */
  function tomarGastoYCerrar() {
    const gasto = gastoParaEliminar.value
    cancelarEliminar()
    return gasto
  }

  return {
    gastoParaEliminar,
    showConfirmSimple,
    showModalRecurrente,
    pedirConfirmarEliminar,
    cancelarEliminar,
    tomarGastoYCerrar,
  }
}
