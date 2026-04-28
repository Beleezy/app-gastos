// Store Pinia de plantillas de mes.
// Ver §4.2 / §5.A punto 4 de planifica.md.

import { defineStore } from 'pinia'

export const usePlantillasStore = defineStore('plantillas', {
  state: () => ({
    plantillas: [],
    cargando: false,
    error: null,
  }),

  getters: {
    porId: (state) => (id) => state.plantillas.find((p) => p.id === id) || null,
    cantidad: (state) => state.plantillas.length,
    masReciente: (state) =>
      state.plantillas.length > 0
        ? [...state.plantillas].sort((a, b) =>
            String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
          )[0]
        : null,
  },

  actions: {
    async cargar({ force = false } = {}) {
      if (this.cargando) return
      if (!force && this.plantillas.length > 0) return
      this.cargando = true
      this.error = null
      try {
        const { apiFetch } = useApiFetch()
        this.plantillas = await apiFetch('/api/planificador/plantillas')
      } catch (e) {
        this.error = e?.data?.message || e?.message || 'Error cargando plantillas'
      } finally {
        this.cargando = false
      }
    },

    async crear(payload) {
      const { apiFetch } = useApiFetch()
      const creada = await apiFetch('/api/planificador/plantillas', {
        method: 'POST',
        body: payload,
      })
      this.plantillas = [creada, ...this.plantillas]
      return creada
    },

    async aplicar({ plantillaId, planMensualId }) {
      const { apiFetch } = useApiFetch()
      return await apiFetch(`/api/planificador/plantillas/${plantillaId}/aplicar`, {
        method: 'POST',
        body: { planMensualId },
      })
    },

    async eliminar(plantillaId) {
      const { apiFetch } = useApiFetch()
      await apiFetch(`/api/planificador/plantillas/${plantillaId}`, { method: 'DELETE' })
      this.plantillas = this.plantillas.filter((p) => p.id !== plantillaId)
    },

    limpiar() {
      this.plantillas = []
      this.error = null
    },
  },
})
