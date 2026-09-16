export const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

// MESES[0] = 'Enero', índices 0-11
// Para uso con mes numérico (1-12): MESES[mes - 1]
// Para uso con Date.getMonth() (0-11): MESES[d.getMonth()]

export function getInitials(nombre) {
  return nombre
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Meses anteriores al indicado, del más reciente al más antiguo.
 *
 * Lo usan el gráfico de categorías y las comparativas de /registro, que
 * antes lo construían cada uno por su cuenta con el mismo bucle y el mismo
 * formato de etiqueta. Devuelve dos etiquetas porque no caben en el mismo
 * sitio: `label` (con año) para el desplegable, donde hay espacio y la
 * lista cruza años; `labelCorto` (sin año cuando coincide con el que se
 * está viendo) para los botones de acceso rápido, que a 370 px partían el
 * texto en dos líneas.
 *
 * @param {number} mes - mes de referencia (1-12); la lista empieza en el anterior
 * @param {number} anio
 * @param {number} total - cuántos meses devolver
 */
export function mesesAnteriores(mes, anio, total = 24) {
  const lista = []
  // `Number(null)` es 0, que pasa `isFinite`: sin este descarte una llamada
  // con un mes sin cargar todavía devolvía claves como «0-8».
  const valido = (v) => typeof v === 'number' && Number.isInteger(v) && v !== 0
  if (!valido(mes) || !valido(anio)) return lista
  let m = mes
  let a = anio
  for (let i = 0; i < total; i++) {
    m--
    if (m === 0) {
      m = 12
      a--
    }
    const abrev = (MESES[m - 1] || '').slice(0, 3)
    lista.push({
      key: `${a}-${m}`,
      mes: m,
      anio: a,
      label: `${abrev} ${a}`,
      labelCorto: a === anio ? abrev : `${abrev} ${a}`,
    })
  }
  return lista
}
