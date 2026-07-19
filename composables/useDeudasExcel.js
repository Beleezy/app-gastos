/**
 * Exportación a Excel de deudas, con dos hojas: "Deudas" y "Pagos".
 *
 * Reutiliza el mismo patrón de import dinámico que useExportExcel para no
 * inflar el bundle inicial.
 */

import { useFormatters } from './useFormatters'

export function useDeudasExcel() {
  const { formatCurrency, formatDate } = useFormatters()

  async function exportar({
    nombreArchivo = 'deudas',
    deudas = [],
    pagos = [],
    persona = null,
  } = {}) {
    const ExcelJS = (await import('exceljs')).default || (await import('exceljs'))

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

    const wb = new ExcelJS.Workbook()

    if (filasDeudas.length > 0) {
      agregarHoja(wb, 'Deudas', filasDeudas)
    }
    if (filasPagos.length > 0) {
      agregarHoja(wb, 'Pagos', filasPagos)
    }
    if (filasDeudas.length === 0 && filasPagos.length === 0) {
      const ws = wb.addWorksheet('Vacío')
      ws.addRow(['Sin datos para exportar'])
    }

    const buffer = await wb.xlsx.writeBuffer()
    descargar(buffer, `${nombreArchivo}.xlsx`)
  }

  return { exportar }
}

function agregarHoja(wb, nombre, filas) {
  const ws = wb.addWorksheet(nombre)
  const cols = Object.keys(filas[0])
  ws.columns = cols.map((c) => {
    const maxLen = Math.max(c.length, ...filas.map((f) => String(f[c] ?? '').length))
    return { header: c, key: c, width: Math.min(maxLen + 2, 40) }
  })
  filas.forEach((f) => ws.addRow(f))
}

function descargar(buffer, nombre) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
