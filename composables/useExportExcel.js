export function useExportExcel() {
  async function exportarExcel(nombreArchivo, columnas, filas) {
    const XLSX = await import('xlsx')

    const datos = filas.map(fila => {
      const obj = {}
      columnas.forEach(c => {
        obj[c.label] = c.getValue(fila) ?? ''
      })
      return obj
    })

    const ws = XLSX.utils.json_to_sheet(datos)

    // Auto-ajustar ancho de columnas
    const anchos = columnas.map(c => {
      const maxLen = Math.max(
        c.label.length,
        ...filas.map(f => String(c.getValue(f) ?? '').length)
      )
      return { wch: Math.min(maxLen + 2, 40) }
    })
    ws['!cols'] = anchos

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Datos')

    XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
  }

  return { exportarExcel }
}
