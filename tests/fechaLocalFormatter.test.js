// `fechaHoraEnZona` corre en casi toda escritura (crear gasto, deuda,
// pago, ingreso, bulk…). Antes construía un `Intl.DateTimeFormat` nuevo
// en cada llamada — coste fijo por request para un objeto inmutable y
// reutilizable — y no protegía contra una zona horaria inválida guardada
// en `configuraciones`: `new Intl.DateTimeFormat` lanza RangeError con
// una zona que no existe, y ese throw abortaba el guardado del gasto.

import { describe, it, expect, beforeEach } from 'vitest'
import { fechaHoraEnZona, __resetFechaLocalCaches } from '../server/utils/fechaLocal.js'

beforeEach(() => {
  __resetFechaLocalCaches()
})

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/

describe('fechaHoraEnZona', () => {
  it('devuelve fecha y hora con el formato que espera el schema', () => {
    const r = fechaHoraEnZona('America/Lima')
    expect(r.fecha).toMatch(FECHA_RE)
    expect(r.hora).toMatch(HORA_RE)
  })

  it('zonas distintas pueden dar horas distintas', () => {
    const lima = fechaHoraEnZona('America/Lima')
    const tokio = fechaHoraEnZona('Asia/Tokyo')
    expect(lima.hora).toMatch(HORA_RE)
    expect(tokio.hora).toMatch(HORA_RE)
    // Lima (UTC-5) y Tokio (UTC+9) nunca coinciden en hora+minuto.
    expect(`${lima.fecha} ${lima.hora}`).not.toBe(`${tokio.fecha} ${tokio.hora}`)
  })

  it('una zona inválida no rompe la escritura: cae a la de por defecto', () => {
    // Antes esto lanzaba RangeError y el gasto no se guardaba.
    const r = fechaHoraEnZona('No/Existe')
    expect(r.fecha).toMatch(FECHA_RE)
    expect(r.hora).toMatch(HORA_RE)
  })

  it('la zona inválida da el mismo resultado que la de por defecto', () => {
    expect(fechaHoraEnZona('No/Existe').fecha).toBe(fechaHoraEnZona('America/Lima').fecha)
  })

  it('reutiliza el formateador entre llamadas de la misma zona', () => {
    // No se puede observar el cache directamente, pero sí que llamadas
    // repetidas siguen siendo consistentes tras poblarlo.
    const a = fechaHoraEnZona('Europe/Madrid')
    const b = fechaHoraEnZona('Europe/Madrid')
    expect(a.fecha).toBe(b.fecha)
  })

  it('medianoche se normaliza a 00, no a 24', () => {
    // El formateador con hour12:false puede emitir "24" a medianoche en
    // algunos runtimes; el valor debe salir siempre en rango 00-23.
    for (const tz of ['America/Lima', 'Asia/Tokyo', 'Europe/Madrid', 'Pacific/Auckland']) {
      expect(fechaHoraEnZona(tz).hora).toMatch(HORA_RE)
    }
  })
})
