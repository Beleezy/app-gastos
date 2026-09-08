// Proyección de gasto del módulo Compartido — matemática pura, sin BD.
//
// Responde la pregunta del módulo: "van S/ 450 de S/ 600 y estamos a mitad
// de mes, ¿en cuánto cierra?". Vive en shared/ porque el cliente recalcula
// al cambiar de mes sin ir al servidor.

const redondear = (n) => Math.round(n * 100) / 100

/**
 * Estado semáforo de una categoría. Misma convención que
 * /api/presupuestos-categoria/estado para que el color signifique lo mismo
 * en todo el app. 'sin_presupuesto' es propio de Compartido: el emisor puede
 * compartir una categoría para la que nunca definió un límite.
 */
export function estadoDesdePorcentaje(porcentaje, umbral = 75) {
  if (porcentaje === null || porcentaje === undefined) return 'sin_presupuesto'
  if (porcentaje >= 100) return 'critico'
  if (porcentaje >= umbral) return 'alerta'
  return 'ok'
}

/**
 * @param {object} p
 * @param {number} p.consumido - gastado en el mes
 * @param {number} p.presupuesto - límite mensual (0 = no definido)
 * @param {number} p.diasTranscurridos - días del mes ya vividos (1 = hoy es día 1)
 * @param {number} p.diasDelMes - días que tiene el mes
 * @param {number} [p.umbral] - umbral de alerta del observador (%)
 */
export function calcularProyeccion({
  consumido = 0,
  presupuesto = 0,
  diasTranscurridos = 0,
  diasDelMes = 30,
  umbral = 75,
} = {}) {
  const diasDelMesSeguro = Math.max(1, Math.trunc(diasDelMes) || 1)
  // Un mes pasado se ve completo; uno futuro, con 0 días vividos.
  const dias = Math.min(Math.max(0, Math.trunc(diasTranscurridos) || 0), diasDelMesSeguro)
  const diasRestantes = diasDelMesSeguro - dias

  const ritmoDiario = dias > 0 ? redondear(consumido / dias) : 0
  // Sin días transcurridos no hay ritmo del cual proyectar: la proyección es
  // lo ya gastado, no cero, para no mentir "cierra en 0".
  const proyectado =
    dias > 0 ? redondear((consumido / dias) * diasDelMesSeguro) : redondear(consumido)

  const tienePresupuesto = presupuesto > 0
  const porcentaje = tienePresupuesto ? redondear((consumido / presupuesto) * 100) : null
  const porcentajeProyectado = tienePresupuesto ? redondear((proyectado / presupuesto) * 100) : null

  const disponible = tienePresupuesto ? redondear(presupuesto - consumido) : null
  const excedido = tienePresupuesto && consumido > presupuesto
  const disponiblePorDia =
    tienePresupuesto && diasRestantes > 0
      ? redondear(Math.max(0, disponible) / diasRestantes)
      : null

  // Día del mes en que el ritmo actual agota el presupuesto. Puede caer
  // después del último día (no se agota) o ya haber pasado (ya se pasó).
  const diaAgotamiento =
    tienePresupuesto && ritmoDiario > 0 ? Math.ceil(presupuesto / ritmoDiario) : null
  const seAgotaAntesDeFin = diaAgotamiento !== null && diaAgotamiento <= diasDelMesSeguro

  return {
    consumido: redondear(consumido),
    presupuesto: redondear(presupuesto),
    tienePresupuesto,
    diasTranscurridos: dias,
    diasRestantes,
    diasDelMes: diasDelMesSeguro,
    ritmoDiario,
    proyectado,
    porcentaje,
    porcentajeProyectado,
    disponible,
    disponiblePorDia,
    excedido,
    diaAgotamiento,
    seAgotaAntesDeFin,
    estado: estadoDesdePorcentaje(porcentaje, umbral),
    // Si el ritmo se mantiene, ¿termina pasado del límite?
    estadoProyectado: estadoDesdePorcentaje(porcentajeProyectado, umbral),
  }
}

/** Días del mes y días transcurridos a partir de una fecha YYYY-MM-DD. */
export function diasDelMesDesdeFecha(fechaIso, mes, anio) {
  const [a, m, d] = fechaIso.split('-').map(Number)
  const diasDelMes = new Date(anio, mes, 0).getDate()
  // Mes distinto al de la fecha de referencia: pasado = completo, futuro = 0.
  if (anio !== a || mes !== m) {
    const esPasado = anio < a || (anio === a && mes < m)
    return { diasDelMes, diasTranscurridos: esPasado ? diasDelMes : 0 }
  }
  return { diasDelMes, diasTranscurridos: d }
}
