export function useExportCsv() {
  function exportarCsv(nombreArchivo, columnas, filas) {
    const header = columnas.map(c => `"${c.label}"`).join(',')
    const rows = filas.map(fila =>
      columnas.map(c => {
        const val = c.getValue(fila)
        if (val === null || val === undefined) return '""'
        const str = String(val).replace(/"/g, '""')
        return `"${str}"`
      }).join(',')
    )

    const bom = '\uFEFF'
    const csv = bom + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${nombreArchivo}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return { exportarCsv }
}
