// Fixtures de datos para los tests E2E.
// Usados desde request.post() para sembrar antes de cada test.

export const fixtures = {
  gastoManual: {
    concepto: 'Pan E2E',
    monto: 5.5,
    fecha: '2026-04-28',
    categoriaId: null, // se rellena en el test con la primera categoría disponible
    metodoRegistro: 'manual',
  },

  deuda: {
    personaNombre: 'E2E Tester',
    personaTipo: 'persona',
    tipoDeuda: 'me_deben',
    concepto: 'Préstamo de prueba',
    monto: 100,
  },

  plantilla: {
    nombre: 'Plantilla E2E',
    montoPresupuesto: 1500,
    gastos: [
      { concepto: 'Alquiler', montoEstimado: 800, categoriaId: null, diaProbable: 1 },
      { concepto: 'Internet', montoEstimado: 100, categoriaId: null, diaProbable: 5 },
    ],
  },
}

export async function getPrimeraCategoria(request) {
  const r = await request.get('/api/categorias')
  if (!r.ok()) return null
  const list = await r.json()
  return Array.isArray(list) ? list[0]?.id : null
}
