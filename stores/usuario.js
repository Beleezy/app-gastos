// Store del usuario y sus configuraciones.
// Ver §4.2 de planifica.md.
//
// Punto de entrada de la migración a Pinia. Otros composables
// (useGastos, useDeudas, usePlanificador) podrán moverse en sprints
// posteriores reutilizando este patrón.

import { defineStore } from 'pinia'

export const useUsuarioStore = defineStore('usuario', {
  state: () => ({
    perfil: null,
    configuracion: null,
    cargando: false,
    error: null,
  }),

  getters: {
    nombre: (state) => state.perfil?.nombre || '',
    email: (state) => state.perfil?.email || '',
    locale: (state) => state.configuracion?.locale || 'es-PE',
    monedaPreferida: (state) => state.configuracion?.monedaPreferida || 'PEN',
    zonaHoraria: (state) => state.configuracion?.zonaHoraria || 'America/Lima',
    presupuestoDefault: (state) => parseFloat(state.configuracion?.presupuestoDefault ?? 0) || 0,
    diaInicioCiclo: (state) => state.configuracion?.diaInicioCiclo ?? 1,
    diasPdfSaldadas: (state) => state.configuracion?.diasPdfSaldadas ?? 30,
    estaCargado: (state) => state.perfil != null && state.configuracion != null,
  },

  actions: {
    async cargar() {
      if (this.cargando) return
      this.cargando = true
      this.error = null
      try {
        const { apiFetch } = useApiFetch()
        const [perfil, config] = await Promise.all([
          apiFetch('/api/usuarios/me').catch(() => null),
          apiFetch('/api/configuraciones').catch(() => null),
        ])
        if (perfil) this.perfil = perfil
        if (config) this.configuracion = config
      } catch (e) {
        this.error = e?.message || 'Error cargando usuario'
      } finally {
        this.cargando = false
      }
    },

    async actualizarConfiguracion(parche) {
      const { apiFetch } = useApiFetch()
      const actualizada = await apiFetch('/api/configuraciones', {
        method: 'PUT',
        body: parche,
      })
      this.configuracion = actualizada
      return actualizada
    },

    limpiar() {
      this.perfil = null
      this.configuracion = null
      this.error = null
    },
  },
})
