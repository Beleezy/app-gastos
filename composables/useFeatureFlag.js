/**
 * Composable de feature flags ligero. Ver §6.6 de planifica.md.
 *
 * Resuelve flags en este orden de precedencia:
 *   1. Override en localStorage (`gastos.featureFlags.v1`) — útil
 *      en QA / desarrollo sin redeploy.
 *   2. Configuración del usuario (`useUsuarioStore.configuracion.flags`).
 *   3. runtimeConfig.public.featureFlags (defaults globales).
 *   4. Default literal pasado al composable.
 *
 * Uso:
 *   const { isEnabled } = useFeatureFlag()
 *   if (isEnabled('cola_offline_v2', false)) {...}
 *
 *   // o reactivo:
 *   const colaV2 = useFeatureFlag().flag('cola_offline_v2', false)
 *   watchEffect(() => { if (colaV2.value) ... })
 */

import { useLocalStorage } from './useLocalStorage'

const OVERRIDES_KEY = 'gastos.featureFlags.v1'

export function useFeatureFlag() {
  const overrides = useLocalStorage(OVERRIDES_KEY, {})

  function getFromRuntime(name) {
    try {
      const cfg = useRuntimeConfig?.()?.public?.featureFlags
      if (cfg && Object.prototype.hasOwnProperty.call(cfg, name)) return cfg[name]
    } catch {
      // sin runtimeConfig (fuera de Nuxt)
    }
    return undefined
  }

  function getFromUsuario(name) {
    try {
      const store = useUsuarioStore?.()
      const flags = store?.configuracion?.flags
      if (flags && Object.prototype.hasOwnProperty.call(flags, name)) return flags[name]
    } catch {
      // store no inicializado
    }
    return undefined
  }

  function isEnabled(name, defaultValue = false) {
    const ov = overrides.value?.[name]
    if (ov !== undefined) return !!ov
    const fromUser = getFromUsuario(name)
    if (fromUser !== undefined) return !!fromUser
    const fromRuntime = getFromRuntime(name)
    if (fromRuntime !== undefined) return !!fromRuntime
    return !!defaultValue
  }

  function flag(name, defaultValue = false) {
    return computed(() => isEnabled(name, defaultValue))
  }

  function setOverride(name, value) {
    const next = { ...(overrides.value || {}) }
    if (value === undefined || value === null) {
      delete next[name]
    } else {
      next[name] = value
    }
    overrides.value = next
  }

  function clearOverrides() {
    overrides.value = {}
  }

  return {
    isEnabled,
    flag,
    setOverride,
    clearOverrides,
    overrides,
  }
}
