export function useExportExcel() {
  // Migrado de `xlsx` (CVE high sin fix, ~800 KB) a `write-excel-file`
  // (~150 KB, sin CVEs). Misma API expuesta hacia los consumidores.
  async function exportarExcel(nombreArchivo, columnas, filas) {
    const writeXlsxFile = (await import('write-excel-file/browser')).default

    // Schema: una columna por cada entrada de `columnas`.
    const schema = columnas.map(c => ({
      column: c.label,
      type: String,
      value: (fila) => {
        const v = c.getValue(fila)
        return v == null ? '' : String(v)
      },
      width: Math.min(Math.max(
        c.label.length,
        ...filas.map(f => String(c.getValue(f) ?? '').length),
      ) + 2, 40),
    }))

    await writeXlsxFile(filas, {
      schema,
      sheet: 'Datos',
      fileName: `${nombreArchivo}.xlsx`,
    })
  }

  return { exportarExcel }
}
