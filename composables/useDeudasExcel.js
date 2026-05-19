/**
 * Exportación a Excel de deudas, con dos hojas: "Deudas" y "Pagos".
 *
 * Migrado de `xlsx` (CVE high sin fix, ~800 KB) a `write-excel-file`
 * (~150 KB, sin CVEs). El import sigue siendo dinámico para no inflar
 * el bundle inicial.
 */

import { useFormatters } from './useFormatters'

export function useDeudasExcel() {
  const { formatCurrency, formatDate } = useFormatters()

  async function exportar({ nombreArchivo = 'deudas', deudas = [], pagos = [], persona = null } = {}) {
    const writeXlsxFile = (await import('write-excel-file/browser')).default

    const filasDeudas = deudas.map((d) => ({
      Persona: d.personaNombre || persona?.nombre || '',
      Tipo: d.tipoDeuda === 'me_deben' ? 'Me deben' : 'Yo debo',
      Concepto: d.concepto,
      'Monto original': formatCurrency(parseFloat(d.montoOriginal ?? d.monto ?? 0)),
      'Monto pendiente': formatCurrency(parseFloat(d.montoPendiente ?? 0)),
      Estado: d.estado || '',
      'Fecha creación': d.fechaCreacion ? formatDate(d.fechaCreacion) : '',
      'Fecha vencimiento': d.fechaVencimiento ? formatDate(d.fechaVencimiento) : '',
      Notas: d.notas || '',
    }))

    const filasPagos = pagos.map((p) => ({
      Concepto: p.deudaConcepto || p.concepto || '',
      'Monto pagado': formatCurrency(parseFloat(p.montoPagado ?? 0)),
      'Fecha pago': p.fechaPago ? formatDate(p.fechaPago) : '',
      Método: p.metodoPago || '',
      Notas: p.notas || '',
    }))

    const hojas = []
    if (filasDeudas.length > 0) {
      hojas.push({
        data: filasDeudas,
        sheet: 'Deudas',
        schema: schemaPorFila(filasDeudas),
      })
    }
    if (filasPagos.length > 0) {
      hojas.push({
        data: filasPagos,
        sheet: 'Pagos',
        schema: schemaPorFila(filasPagos),
      })
    }
    if (hojas.length === 0) {
      hojas.push({
        data: [{ Mensaje: 'Sin datos para exportar' }],
        sheet: 'Vacío',
        schema: [{ column: 'Mensaje', type: String, value: (r) => r.Mensaje, width: 30 }],
      })
    }

    if (hojas.length === 1) {
      const { data, sheet, schema } = hojas[0]
      await writeXlsxFile(data, { schema, sheet, fileName: `${nombreArchivo}.xlsx` })
    } else {
      await writeXlsxFile(
        hojas.map(h => ({ data: h.data, sheet: h.sheet, schema: h.schema })),
        { fileName: `${nombreArchivo}.xlsx` },
      )
    }
  }

  return { exportar }
}

function schemaPorFila(filas) {
  if (!filas.length) return []
  const cols = Object.keys(filas[0])
  return cols.map((c) => ({
    column: c,
    type: String,
    value: (fila) => (fila[c] == null ? '' : String(fila[c])),
    width: Math.min(Math.max(c.length, ...filas.map((f) => String(f[c] ?? '').length)) + 2, 40),
  }))
}
