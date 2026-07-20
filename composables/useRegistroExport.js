export function useRegistroExport({ mesFormateado, gastosMensuales }) {
  const { exportarExcel } = useExportExcel()

  const columnas = [
    { label: 'Fecha', getValue: (g) => g.fecha },
    { label: 'Hora', getValue: (g) => g.hora || '' },
    { label: 'Concepto', getValue: (g) => g.concepto },
    { label: 'Categoría', getValue: (g) => g.categoriaNombre || '' },
    { label: 'Monto', getValue: (g) => g.monto },
    { label: 'Método', getValue: (g) => g.metodoRegistro || '' },
    { label: 'Notas', getValue: (g) => g.notas || '' },
  ]

  function exportarGastos() {
    const nombre = `gastos_${mesFormateado.value.replace(' ', '_')}`
    exportarExcel(nombre, columnas, gastosMensuales.value)
  }

  return { exportarGastos }
}
