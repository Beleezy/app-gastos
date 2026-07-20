export function useOptimisticGastos({ gastosMensuales, categorias, getCategoriaPorNombre }) {
  function mapGastosConIds(gastosEditados) {
    return gastosEditados.map((g) => {
      const cat = getCategoriaPorNombre(g.categoria)
      return {
        concepto: g.concepto,
        monto: parseFloat(g.monto),
        categoriaId: cat?.id || categorias.value[0]?.id,
        fecha: g.fecha,
      }
    })
  }

  function pushOptimisticGastos(gastosConIds) {
    const now = new Date()
    const hora = now.toTimeString().slice(0, 5)
    const optimistas = gastosConIds.map((g, i) => {
      const cat = categorias.value.find((c) => c.id === g.categoriaId)
      return {
        id: `tmp-${Date.now()}-${i}`,
        concepto: g.concepto,
        monto: g.monto,
        categoriaId: g.categoriaId,
        categoriaNombre: cat?.nombre || '',
        categoriaColor: cat?.color || null,
        categoriaIcono: cat?.icono || null,
        fecha: g.fecha,
        hora,
        pendiente: true,
      }
    })
    gastosMensuales.value = [...optimistas, ...gastosMensuales.value]
    return optimistas.map((o) => o.id)
  }

  function rollbackOptimistic(tempIds) {
    gastosMensuales.value = gastosMensuales.value.filter((g) => !tempIds.includes(g.id))
  }

  return { mapGastosConIds, pushOptimisticGastos, rollbackOptimistic }
}
