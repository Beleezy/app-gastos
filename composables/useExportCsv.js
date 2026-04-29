/**
 * Export CSV puro sin dependencias externas.
 * Compatible con Excel: BOM UTF-8, separador configurable (default ;
 * para evitar problemas con la coma decimal de es-ES).
 *
 * Ver §5.B / §5.C de planifica.md (formatos extra del ExportButton).
 */

const NEEDS_QUOTE_RE = /[",\n\r;]/

function escapeCell(val, sep) {
  if (val == null) return ''
  const s = typeof val === 'string' ? val : String(val)
  const re = new RegExp(`["\\n\\r${sep}]`)
  if (re.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  // Si no se especifica separador, fallback a la regex genérica.
  return NEEDS_QUOTE_RE.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Genera el contenido CSV.
 *
 * @param {object} input
 * @param {Array<{label: string, getValue: (row) => any}>} input.columnas
 * @param {Array} input.filas
 * @param {string} [input.separator=';']
 * @param {boolean} [input.bom=true] Añade BOM UTF-8 para Excel.
 */
export function generarCsv({ columnas = [], filas = [], separator = ';', bom = true } = {}) {
  const head = columnas.map((c) => escapeCell(c.label, separator)).join(separator)
  const body = filas
    .map((fila) =>
      columnas.map((c) => escapeCell(c.getValue(fila), separator)).join(separator),
    )
    .join('\r\n')
  const contenido = body ? `${head}\r\n${body}` : head
  return bom ? `﻿${contenido}` : contenido
}

/**
 * Composable: descarga el CSV en el navegador.
 */
export function useExportCsv() {
  function descargar({ nombreArchivo = 'export', columnas, filas, separator = ';' } = {}) {
    if (typeof window === 'undefined') return
    const csv = generarCsv({ columnas, filas, separator, bom: true })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${nombreArchivo}.csv`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return { descargar, generarCsv }
}
