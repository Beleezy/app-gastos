/**
 * Exportación a Excel de deudas, con dos hojas: "Deudas" y "Pagos".
 * Ver §5.C punto 6 de planifica.md.
 *
 * Reutiliza el mismo patrón de import dinámico de XLSX que
 * useExportExcel para no inflar el bundle inicial.
 */

import { useFormatters } from './useFormatters'

export function useDeudasExcel() {
  const { formatCurrency, formatDate } = useFormatters()

  async function exportar({ nombreArchivo = 'deudas', deudas = [], pagos = [], persona = null } = {}) {
    const XLSX = await import('xlsx')

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

    const wb = XLSX.utils.book_new()

    if (filasDeudas.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(filasDeudas)
      ws1['!cols'] = computeColWidths(filasDeudas)
      XLSX.utils.book_append_sheet(wb, ws1, 'Deudas')
    }
    if (filasPagos.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(filasPagos)
      ws2['!cols'] = computeColWidths(filasPagos)
      XLSX.utils.book_append_sheet(wb, ws2, 'Pagos')
    }
    if (filasDeudas.length === 0 && filasPagos.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([['Sin datos para exportar']])
      XLSX.utils.book_append_sheet(wb, ws, 'Vacío')
    }

    XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
  }

  return { exportar }
}

function computeColWidths(filas) {
  if (!filas.length) return []
  const cols = Object.keys(filas[0])
  return cols.map((c) => {
    const maxLen = Math.max(c.length, ...filas.map((f) => String(f[c] ?? '').length))
    return { wch: Math.min(maxLen + 2, 40) }
  })
}
