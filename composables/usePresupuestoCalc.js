/**
 * Cálculos de presupuesto: progreso, alertas, proyección.
 * Ver §5.A punto 6 de planifica.md.
 *
 * Funciones puras testables. El composable que las consume vive en el
 * componente o en useGastos.
 */

/**
 * @param {object} input
 * @param {number} input.presupuesto Monto presupuestado del mes.
 * @param {number} input.gastado Monto real gastado a la fecha.
 * @param {number} [input.diasTranscurridos] Día del mes actual (1..31).
 * @param {number} [input.diasMes] Días totales del mes.
 * @returns {{
 *   porcentaje: number, restante: number,
 *   alerta: 'normal'|'cerca'|'sobrepaso',
 *   proyeccionMes: number, proyectadoSobrepaso: boolean,
 *   ritmoEsperado: number, diferenciaConRitmo: number
 * }}
 */
export function calcularPresupuesto({ presupuesto, gastado, diasTranscurridos, diasMes } = {}) {
  const p = parseFloat(presupuesto) || 0
  const g = parseFloat(gastado) || 0
  const dt = Math.max(1, parseInt(diasTranscurridos, 10) || 1)
  const dm = Math.max(dt, parseInt(diasMes, 10) || 30)

  const porcentaje = p > 0 ? Math.round((g / p) * 1000) / 10 : 0
  const restante = Math.round((p - g) * 100) / 100
  let alerta = 'normal'
  if (porcentaje >= 100) alerta = 'sobrepaso'
  else if (porcentaje >= 80) alerta = 'cerca'

  // Proyección: si se mantiene el ritmo actual hasta fin de mes
  const ritmoDiario = dt > 0 ? g / dt : 0
  const proyeccionMes = Math.round(ritmoDiario * dm * 100) / 100
  const proyectadoSobrepaso = p > 0 && proyeccionMes > p

  // Ritmo esperado para no sobrepasar el presupuesto
  const ritmoEsperado = p > 0 && dm > 0 ? Math.round((p / dm) * 100) / 100 : 0
  const diferenciaConRitmo = Math.round((ritmoDiario - ritmoEsperado) * 100) / 100

  return {
    porcentaje,
    restante,
    alerta,
    proyeccionMes,
    proyectadoSobrepaso,
    ritmoEsperado,
    diferenciaConRitmo,
  }
}

/**
 * Genera mensaje legible de la situación del presupuesto.
 */
export function mensajePresupuesto(calc) {
  if (!calc) return ''
  if (calc.alerta === 'sobrepaso') {
    return `Has sobrepasado el presupuesto en ${Math.abs(calc.restante)}.`
  }
  if (calc.proyectadoSobrepaso) {
    return `Al ritmo actual proyectarás ${calc.proyeccionMes} a fin de mes.`
  }
  if (calc.alerta === 'cerca') {
    return `Te queda ${calc.restante}. Estás al ${calc.porcentaje}% del presupuesto.`
  }
  return `Te queda ${calc.restante} (${calc.porcentaje}% gastado).`
}
