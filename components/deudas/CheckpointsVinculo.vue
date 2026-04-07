<template>
  <div class="mt-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Puntos de guardado</h3>
        <span class="text-xs text-gray-600">{{ checkpoints.length }}/3</span>
      </div>
      <button
        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/15 text-violet-400 text-xs font-medium hover:bg-violet-500/25 transition-colors disabled:opacity-40"
        :disabled="guardando"
        @click="showCrearCheckpoint = true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        Guardar punto
      </button>
    </div>

    <!-- Loading -->
    <div v-if="cargando" class="space-y-2">
      <div v-for="i in 2" :key="i" class="bg-primary-800 rounded-xl p-3 animate-pulse">
        <div class="h-3 bg-primary-700 rounded w-1/3 mb-2"></div>
        <div class="h-2 bg-primary-700 rounded w-2/3"></div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="checkpoints.length === 0" class="bg-primary-800/50 rounded-xl p-4 text-center border border-primary-700/20">
      <p class="text-xs text-gray-500">No hay puntos de guardado todavía</p>
      <p class="text-[10px] text-gray-600 mt-0.5">Se creará uno automáticamente al vincular</p>
    </div>

    <!-- Lista de checkpoints (orden: actual → anterior → inicio) -->
    <div v-else class="space-y-2">
      <div
        v-for="cp in checkpointsOrdenados"
        :key="cp.id"
        class="bg-primary-800 rounded-xl border border-primary-700/30 overflow-hidden"
      >
        <!-- Header del checkpoint -->
        <div
          class="flex items-center gap-2.5 p-3 cursor-pointer"
          @click="toggleExpand(cp.id)"
        >
          <!-- Badge tipo -->
          <div
            class="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            :class="tipoBadgeClass(cp.tipo)"
          >
            {{ tipoLabel(cp.tipo) }}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-white truncate">
              {{ cp.descripcion || 'Punto de guardado' }}
            </p>
            <p class="text-[10px] text-gray-500 mt-0.5">
              {{ formatFechaHora(cp.createdAt) }}
            </p>
          </div>

          <!-- Resumen numérico -->
          <div v-if="cp.snapshotResumen" class="text-right shrink-0">
            <p class="text-[10px] text-gray-400">
              {{ cp.snapshotResumen.totalDeudasA + cp.snapshotResumen.totalDeudasB }} deudas
            </p>
            <p class="text-[10px] text-violet-400">
              {{ currencySymbol }} {{ formatMonto(cp.snapshotResumen.totalPendienteA) }}
            </p>
          </div>

          <!-- Flecha expand -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-3.5 h-3.5 text-gray-600 transition-transform flex-shrink-0"
            :class="expandido === cp.id ? 'rotate-180' : ''"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <!-- Detalle expandido -->
        <div v-if="expandido === cp.id" class="border-t border-primary-700/30 p-3 space-y-3">

          <!-- Resumen del estado guardado -->
          <div v-if="cp.snapshotResumen" class="bg-primary-900/50 rounded-lg p-2.5">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Estado guardado</p>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <p class="text-[10px] text-gray-500">{{ cp.snapshotResumen.personaANombre }}</p>
                <p class="text-xs font-medium text-white">{{ currencySymbol }} {{ formatMonto(cp.snapshotResumen.totalPendienteA) }}</p>
                <p class="text-[10px] text-gray-600">{{ cp.snapshotResumen.totalDeudasA }} deuda(s)</p>
              </div>
              <div>
                <p class="text-[10px] text-gray-500">{{ cp.snapshotResumen.personaBNombre || 'Otro lado' }}</p>
                <p class="text-xs font-medium text-white">{{ currencySymbol }} {{ formatMonto(cp.snapshotResumen.totalPendienteB) }}</p>
                <p class="text-[10px] text-gray-600">{{ cp.snapshotResumen.totalDeudasB }} deuda(s)</p>
              </div>
            </div>
          </div>

          <!-- Auditoría de cambios en este período -->
          <div v-if="cp.auditoria && cp.auditoria.length > 0">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Cambios en este período ({{ cp.auditoria.length }})
            </p>
            <div class="space-y-1.5 max-h-48 overflow-y-auto">
              <div
                v-for="entrada in cp.auditoria"
                :key="entrada.id"
                class="flex items-start gap-2 bg-primary-900/30 rounded-lg p-2"
              >
                <!-- Ícono de acción -->
                <div
                  class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  :class="accionIconClass(entrada.accion)"
                >
                  <svg v-if="entrada.accion.includes('eliminada') || entrada.accion.includes('eliminado')" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <svg v-else-if="entrada.accion.includes('creada') || entrada.accion.includes('creado')" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <svg v-else-if="entrada.accion.includes('editada') || entrada.accion.includes('editado')" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[10px] text-gray-300 leading-relaxed">{{ entrada.descripcion }}</p>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span
                      class="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                      :class="entrada.esTuyo ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'"
                    >
                      {{ entrada.nombreActor }}
                    </span>
                    <span class="text-[9px] text-gray-600">{{ formatHora(entrada.createdAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-2">
            <p class="text-[10px] text-gray-600">Sin cambios registrados en este período</p>
          </div>

          <!-- Botón restaurar (solo para inicio_vinculo y anterior) -->
          <button
            v-if="cp.tipo !== 'actual'"
            class="w-full py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            :class="restaurando === cp.id
              ? 'bg-primary-700 text-gray-400 cursor-not-allowed'
              : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'"
            :disabled="restaurando !== null"
            @click="confirmarRestaurar(cp)"
          >
            <svg v-if="restaurando !== cp.id" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ restaurando === cp.id ? 'Restaurando...' : `Restaurar a este punto` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: crear checkpoint -->
    <div v-if="showCrearCheckpoint" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showCrearCheckpoint = false"></div>
      <div class="relative bg-primary-800 rounded-2xl p-5 w-full max-w-sm border border-primary-700/50">
        <h3 class="text-base font-semibold text-white mb-1">Guardar punto de guardado</h3>
        <p class="text-xs text-gray-400 mb-4">
          Se guardará el estado actual de todas las deudas con esta persona.
          <span v-if="checkpoints.length >= 2" class="text-amber-400"> El punto anterior será reemplazado.</span>
        </p>
        <div class="mb-4">
          <label class="text-xs text-gray-400 block mb-1.5">Descripción (opcional)</label>
          <input
            v-model="descripcionNuevoCheckpoint"
            type="text"
            placeholder="Ej: Cierre de mes, Liquidación parcial..."
            class="w-full bg-primary-900/50 border border-primary-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
            maxlength="100"
          />
        </div>
        <div class="space-y-2">
          <button
            class="w-full py-2.5 rounded-xl bg-violet-500/15 text-violet-400 text-sm font-medium hover:bg-violet-500/25 transition-colors disabled:opacity-50"
            :disabled="guardando"
            @click="ejecutarCrearCheckpoint"
          >
            {{ guardando ? 'Guardando...' : 'Guardar punto' }}
          </button>
          <button
            class="w-full py-2 rounded-xl text-gray-500 text-sm font-medium hover:text-gray-300 transition-colors"
            @click="showCrearCheckpoint = false"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: confirmar restaurar -->
    <div v-if="showConfirmRestaurar" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showConfirmRestaurar = false"></div>
      <div class="relative bg-primary-800 rounded-2xl p-5 w-full max-w-sm border border-primary-700/50">
        <h3 class="text-base font-semibold text-white mb-2">Restaurar punto de guardado</h3>
        <p class="text-sm text-gray-400 mb-2">
          Se restaurarán los datos de <span class="text-white font-medium">ambos usuarios</span> al estado guardado el
          <span class="text-violet-400">{{ checkpointARestaurar ? formatFechaHora(checkpointARestaurar.createdAt) : '' }}</span>.
        </p>
        <ul class="text-xs text-gray-500 space-y-1 mb-4 list-disc pl-4">
          <li>Las deudas y pagos actuales serán reemplazados</li>
          <li>El estado actual se guarda automáticamente antes de restaurar</li>
          <li>Esta acción aplica para <span class="text-white">ambos lados del vínculo</span></li>
        </ul>
        <div class="space-y-2">
          <button
            class="w-full py-2.5 rounded-xl bg-amber-500/15 text-amber-400 text-sm font-medium hover:bg-amber-500/25 transition-colors disabled:opacity-50"
            :disabled="restaurando !== null"
            @click="ejecutarRestaurar"
          >
            {{ restaurando ? 'Restaurando...' : 'Confirmar restauración' }}
          </button>
          <button
            class="w-full py-2 rounded-xl text-gray-500 text-sm font-medium hover:text-gray-300 transition-colors"
            @click="showConfirmRestaurar = false"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  personaId: { type: String, required: true },
})

const emit = defineEmits(['restaurado', 'creado'])

const { checkpoints, cargando, guardando, restaurando, fetchCheckpoints, crearCheckpoint, restaurarCheckpoint } = useDeudas()
const { currencySymbol, formatMonto } = useCurrency()

const expandido = ref(null)
const showCrearCheckpoint = ref(false)
const showConfirmRestaurar = ref(false)
const descripcionNuevoCheckpoint = ref('')
const checkpointARestaurar = ref(null)

onMounted(() => fetchCheckpoints(props.personaId))

const checkpointsOrdenados = computed(() => {
  const orden = { actual: 0, anterior: 1, inicio_vinculo: 2 }
  return [...checkpoints.value].sort((a, b) => (orden[a.tipo] ?? 3) - (orden[b.tipo] ?? 3))
})

function toggleExpand(id) {
  expandido.value = expandido.value === id ? null : id
}

function tipoLabel(tipo) {
  return { actual: 'Actual', anterior: 'Anterior', inicio_vinculo: 'Inicio' }[tipo] || tipo
}

function tipoBadgeClass(tipo) {
  return {
    actual: 'bg-emerald-500/20 text-emerald-400',
    anterior: 'bg-blue-500/20 text-blue-400',
    inicio_vinculo: 'bg-violet-500/20 text-violet-400',
  }[tipo] || 'bg-gray-500/20 text-gray-400'
}

function accionIconClass(accion) {
  if (accion.includes('eliminada') || accion.includes('eliminado')) return 'bg-red-500/20 text-red-400'
  if (accion.includes('creada') || accion.includes('creado')) return 'bg-emerald-500/20 text-emerald-400'
  if (accion.includes('editada') || accion.includes('editado')) return 'bg-amber-500/20 text-amber-400'
  if (accion.includes('restaurado')) return 'bg-violet-500/20 text-violet-400'
  return 'bg-gray-500/20 text-gray-400'
}

function formatFechaHora(fechaStr) {
  if (!fechaStr) return ''
  const d = new Date(fechaStr)
  const dia = d.getDate()
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const hora = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${dia} ${meses[d.getMonth()]} ${d.getFullYear()}, ${hora}:${min}`
}

function formatHora(fechaStr) {
  if (!fechaStr) return ''
  const d = new Date(fechaStr)
  const hora = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${hora}:${min}`
}

async function ejecutarCrearCheckpoint() {
  await crearCheckpoint(props.personaId, descripcionNuevoCheckpoint.value)
  descripcionNuevoCheckpoint.value = ''
  showCrearCheckpoint.value = false
  emit('creado')
}

function confirmarRestaurar(cp) {
  checkpointARestaurar.value = cp
  showConfirmRestaurar.value = true
}

async function ejecutarRestaurar() {
  if (!checkpointARestaurar.value) return
  showConfirmRestaurar.value = false
  await restaurarCheckpoint(checkpointARestaurar.value.id, props.personaId)
  checkpointARestaurar.value = null
  expandido.value = null
  emit('restaurado')
}
</script>
