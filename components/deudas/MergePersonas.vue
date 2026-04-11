<template>
  <SharedBaseBottomSheet title="Fusionar personas duplicadas" @close="$emit('close')">
    <!-- Descripción -->
    <div class="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
      <p class="text-xs text-amber-300">
        Se detectan personas con nombres similares (ej: "juan", "Juan", "Juan P."). Selecciona cuál conservar como principal y las demás se fusionarán en ella.
      </p>
    </div>

    <!-- Cargando -->
    <div v-if="cargando" class="flex items-center justify-center py-8">
      <div class="w-6 h-6 border-2 border-theme-accent border-t-transparent rounded-full animate-spin"></div>
      <span class="ml-3 text-sm text-gray-400">Buscando duplicados...</span>
    </div>

    <!-- Sin duplicados -->
    <div v-else-if="grupos.length === 0" class="text-center py-8">
      <p class="text-sm text-gray-400">No se detectaron personas con nombres similares.</p>
    </div>

    <!-- Grupos de duplicados -->
    <div v-else class="space-y-4">
      <div
        v-for="(grupo, gi) in grupos"
        :key="gi"
        class="bg-primary-900/50 rounded-xl p-3 border border-primary-700/30"
      >
        <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Posibles duplicados</p>

        <div class="space-y-2">
          <div
            v-for="persona in grupo"
            :key="persona.id"
            class="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
            :class="selecciones[gi]?.principal === persona.id
              ? 'bg-theme-accent-bg border border-theme-accent'
              : selecciones[gi]?.secundarias?.includes(persona.id)
                ? 'bg-red-500/10 border border-red-500/20'
                : 'bg-primary-800/50 border border-primary-700/20'"
            @click="toggleSeleccion(gi, persona.id)"
          >
            <div class="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-xs font-semibold text-gray-300 shrink-0">
              {{ persona.nombre.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-white font-medium truncate">{{ persona.nombre }}</p>
              <p class="text-[10px] text-gray-500">
                {{ persona.deudasActivas }} deuda{{ persona.deudasActivas !== 1 ? 's' : '' }} activa{{ persona.deudasActivas !== 1 ? 's' : '' }}
                · S/ {{ formatMonto(persona.totalPendiente) }} pendiente
              </p>
            </div>
            <div class="shrink-0">
              <span v-if="selecciones[gi]?.principal === persona.id"
                class="text-[10px] px-2 py-0.5 rounded-full bg-theme-accent-bg text-theme-accent font-medium">
                Principal
              </span>
              <span v-else-if="selecciones[gi]?.secundarias?.includes(persona.id)"
                class="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-medium">
                Fusionar
              </span>
            </div>
          </div>
        </div>

        <p class="text-[10px] text-gray-600 mt-2">
          Toca una vez para marcar como Principal, dos veces para marcar como Fusionar, tres para deseleccionar.
        </p>

        <!-- Botón fusionar este grupo -->
        <button
          v-if="selecciones[gi]?.principal && selecciones[gi]?.secundarias?.length > 0"
          class="w-full mt-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          :class="fusionando[gi] ? 'bg-theme-accent cursor-not-allowed text-white' : 'bg-theme-accent-bg text-theme-accent hover:bg-theme-accent-bg'"
          :disabled="fusionando[gi]"
          @click="fusionarGrupo(gi)"
        >
          <svg v-if="fusionando[gi]" class="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {{ fusionando[gi] ? 'Fusionando...' : `Fusionar en "${nombrePrincipal(gi)}"` }}
        </button>
      </div>
    </div>

    <p v-if="errorMsg" class="text-red-400 text-xs">{{ errorMsg }}</p>
  </SharedBaseBottomSheet>
</template>

<script setup>
defineEmits(['close'])

const { mergePersonas } = useDeudas()
const { formatMonto } = useCurrency()

const cargando = ref(true)
const grupos = ref([])
const selecciones = ref([])
const fusionando = ref([])
const errorMsg = ref('')

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function detectarGrupos(personas) {
  const umbral = 2
  const visitados = new Set()
  const resultado = []

  for (let i = 0; i < personas.length; i++) {
    if (visitados.has(i)) continue
    const grupo = [personas[i]]
    visitados.add(i)
    const ai = personas[i].nombre.toLowerCase().trim()

    for (let j = i + 1; j < personas.length; j++) {
      if (visitados.has(j)) continue
      const bj = personas[j].nombre.toLowerCase().trim()
      if (levenshtein(ai, bj) <= umbral) {
        grupo.push(personas[j])
        visitados.add(j)
      }
    }

    if (grupo.length > 1) resultado.push(grupo)
  }
  return resultado
}

onMounted(async () => {
  try {
    const personas = await $fetch('/api/deudas/personas')
    grupos.value = detectarGrupos(personas)
    selecciones.value = grupos.value.map(() => ({ principal: null, secundarias: [] }))
    fusionando.value = grupos.value.map(() => false)
  } catch (e) {
    errorMsg.value = 'Error al cargar personas'
  } finally {
    cargando.value = false
  }
})

function toggleSeleccion(gi, personaId) {
  const sel = selecciones.value[gi]
  if (sel.principal === personaId) {
    // Principal → Fusionar
    sel.principal = null
    sel.secundarias = [...(sel.secundarias || []), personaId]
  } else if (sel.secundarias?.includes(personaId)) {
    // Fusionar → Ninguno
    sel.secundarias = sel.secundarias.filter(id => id !== personaId)
  } else {
    // Ninguno → Principal (reemplaza el anterior principal si lo había)
    if (sel.principal) {
      // El anterior principal pasa a ninguno
    }
    sel.principal = personaId
  }
}

function nombrePrincipal(gi) {
  const sel = selecciones.value[gi]
  const persona = grupos.value[gi]?.find(p => p.id === sel.principal)
  return persona?.nombre || ''
}

async function fusionarGrupo(gi) {
  const sel = selecciones.value[gi]
  if (!sel.principal || !sel.secundarias?.length) return

  fusionando.value[gi] = true
  errorMsg.value = ''
  try {
    await mergePersonas(sel.principal, sel.secundarias)
    // Remover el grupo fusionado de la lista
    grupos.value.splice(gi, 1)
    selecciones.value.splice(gi, 1)
    fusionando.value.splice(gi, 1)
  } catch (e) {
    errorMsg.value = e.data?.message || 'Error al fusionar'
    fusionando.value[gi] = false
  }
}
</script>
