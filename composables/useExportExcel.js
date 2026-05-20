export function useExportExcel() {
  async function exportarExcel(nombreArchivo, columnas, filas) {
    const ExcelJS = (await import('exceljs')).default || (await import('exceljs'))

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Datos')

    ws.columns = columnas.map((c) => {
      const maxLen = Math.max(
        c.label.length,
        ...filas.map((f) => String(c.getValue(f) ?? '').length),
      )
      return { header: c.label, key: c.label, width: Math.min(maxLen + 2, 40) }
    })

    filas.forEach((fila) => {
      const row = {}
      columnas.forEach((c) => {
        row[c.label] = c.getValue(fila) ?? ''
      })
      ws.addRow(row)
    })

    const buffer = await wb.xlsx.writeBuffer()
    descargar(buffer, `${nombreArchivo}.xlsx`)
  }

  return { exportarExcel }
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
