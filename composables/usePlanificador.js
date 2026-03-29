export function usePlanificador() {
  const plan = ref(null)
  const gastosPlaneados = ref([])
  const isLoading = ref(false)

  async function fetchPlan(mes, anio) {
    // TODO: GET /api/planificador?mes=&anio=
  }

  async function createPlan(data) {
    // TODO: POST /api/planificador
  }

  async function createGastoPlaneado(data) {
    // TODO: POST /api/planificador/gastos
  }

  async function updateGastoPlaneado(id, data) {
    // TODO: PUT /api/planificador/gastos/:id
  }

  return {
    plan,
    gastosPlaneados,
    isLoading,
    fetchPlan,
    createPlan,
    createGastoPlaneado,
    updateGastoPlaneado,
  }
}
