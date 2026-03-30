<template>
  <div class="px-4 py-3">
    <!-- Back button + Person header -->
    <div class="mb-4">
      <button class="flex items-center gap-1.5 text-gray-400 text-sm mb-3 active:text-white transition-colors" @click="volverALista">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      <!-- Person card -->
      <div class="bg-primary-800 rounded-2xl p-4">
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold"
            :class="tabActual === 'me_deben' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'"
          >
            {{ getInitials(personaSeleccionada.nombre) }}
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-semibold text-white truncate">{{ personaSeleccionada.nombre }}</h2>
            <p v-if="personaSeleccionada.contacto" class="text-xs text-gray-500 truncate">{{ personaSeleccionada.contacto }}</p>
          </div>
          <!-- Delete persona -->
          <button
            class="w-8 h-8 rounded-lg bg-primary-700/50 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors"
            @click="confirmarEliminarPersona"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <!-- Total pendiente -->
        <div class="bg-primary-900/50 rounded-xl p-3">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">Total pendiente</span>
            <span
              class="text-lg font-bold"
              :class="tabActual === 'me_deben' ? 'text-emerald-400' : 'text-red-400'"
            >
              S/ {{ formatMonto(totalPendientePersona) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 2" :key="i" class="bg-primary-800 rounded-xl p-4 animate-pulse">
        <div class="space-y-2">
          <div class="h-4 bg-primary-700 rounded w-3/4"></div>
          <div class="h-3 bg-primary-700 rounded w-1/2"></div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Active debts section -->
      <div v-if="deudasActivasPersona.length > 0" class="mb-5">
        <div class="flex items-center gap-2 mb-2.5">
          <span class="w-1.5 h-1.5 rounded-full" :class="tabActual === 'me_deben' ? 'bg-emerald-400' : 'bg-red-400'"></span>
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pendientes</h3>
          <span class="text-xs text-gray-500 ml-auto">{{ deudasActivasPersona.length }}</span>
        </div>

        <div v-for="deuda in deudasActivasPersona" :key="deuda.id" class="bg-primary-800 rounded-xl p-3.5 mb-2 border border-primary-700/30">
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white">{{ deuda.concepto }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ formatFecha(deuda.fechaCreacion) }}</p>
              <div v-if="deuda.notas" class="mt-1">
                <p class="text-[10px] text-gray-600 italic">{{ deuda.notas }}</p>
              </div>
            </div>
            <div class="text-right shrink-0 ml-3">
              <p class="text-sm font-semibold text-white">S/ {{ formatMonto(deuda.montoOriginal) }}</p>
              <p v-if="deuda.estado === 'parcial'" class="text-[10px] text-orange-400 mt-0.5">
                Pendiente: S/ {{ formatMonto(deuda.montoPendiente) }}
              </p>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-1"
                :class="deuda.estado === 'parcial' ? 'bg-orange-500/15 text-orange-400' : 'bg-yellow-500/15 text-yellow-400'"
              >
                {{ deuda.estado === 'parcial' ? 'Parcial' : 'Pendiente' }}
              </span>
            </div>
          </div>

          <!-- Progress bar for partial payments -->
          <div v-if="deuda.montoOriginal !== deuda.montoPendiente" class="mt-2.5">
            <div class="w-full h-1.5 bg-primary-900/80 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
                :style="{ width: ((1 - deuda.montoPendiente / deuda.montoOriginal) * 100) + '%' }"
              ></div>
            </div>
            <p class="text-[10px] text-gray-600 mt-0.5">
              {{ ((1 - deuda.montoPendiente / deuda.montoOriginal) * 100).toFixed(0) }}% pagado
            </p>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-4 mt-2 pt-2 border-t border-primary-700/20">
            <button
              class="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              @click="emit('registrarPago', deuda)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Registrar pago
            </button>
            <button
              class="text-xs text-gray-600 hover:text-emerald-400 transition-colors flex items-center gap-1"
              @click="marcarSaldada(deuda)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saldar
            </button>
            <button
              class="text-xs text-gray-600 hover:text-red-400 transition-colors flex items-center gap-1"
              @click="eliminar(deuda)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>
          </div>
        </div>
      </div>

      <!-- Settled debts section -->
      <div v-if="deudasSaldadasPersona.length > 0">
        <button
          class="flex items-center gap-2 mb-2.5 w-full"
          @click="showSaldadas = !showSaldadas"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saldadas</h3>
          <span class="text-xs text-gray-600">{{ deudasSaldadasPersona.length }}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-3 h-3 text-gray-600 ml-auto transition-transform"
            :class="showSaldadas ? 'rotate-180' : ''"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-if="showSaldadas">
          <div v-for="deuda in deudasSaldadasPersona" :key="deuda.id" class="bg-primary-800/50 rounded-xl p-3.5 mb-2 border border-primary-700/20 opacity-60">
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-400 line-through">{{ deuda.concepto }}</p>
                <p class="text-xs text-gray-600 mt-0.5">{{ formatFecha(deuda.fechaCreacion) }}</p>
              </div>
              <div class="text-right shrink-0 ml-3">
                <p class="text-sm font-semibold text-gray-500">S/ {{ formatMonto(deuda.montoOriginal) }}</p>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 bg-emerald-500/15 text-emerald-400">
                  {{ deuda.estado === 'archivado' ? 'Archivada' : 'Pagada' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty debts state -->
      <div v-if="deudasActivasPersona.length === 0 && deudasSaldadasPersona.length === 0" class="text-center py-8">
        <p class="text-gray-500 text-sm">No hay deudas registradas</p>
        <p class="text-gray-600 text-xs mt-1">Agrega un concepto de deuda con el boton +</p>
      </div>

      <!-- Bottom spacer -->
      <div class="h-16"></div>
    </template>

    <!-- Delete persona confirmation -->
    <div v-if="showDeletePersona" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showDeletePersona = false"></div>
      <div class="relative bg-primary-800 rounded-2xl p-5 w-full max-w-sm border border-primary-700/50">
        <h3 class="text-base font-semibold text-white mb-2">Eliminar persona</h3>
        <p class="text-sm text-gray-400 mb-5">Se eliminaran todas las deudas y pagos asociados a <span class="text-white font-medium">{{ personaSeleccionada.nombre }}</span>.</p>
        <div class="space-y-2">
          <button
            class="w-full py-2.5 rounded-xl bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-colors"
            @click="ejecutarEliminarPersona"
          >
            Eliminar todo
          </button>
          <button
            class="w-full py-2.5 rounded-xl text-gray-500 text-sm font-medium hover:text-gray-300 transition-colors"
            @click="showDeletePersona = false"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['registrarPago', 'agregarDeuda'])

const {
  tabActual, personaSeleccionada,
  deudasActivasPersona, deudasSaldadasPersona,
  totalPendientePersona, isLoading,
  volverALista, deleteDeuda, archivarDeuda, deletePersona,
  registrarPago,
} = useDeudas()

const showSaldadas = ref(false)
const showDeletePersona = ref(false)

function getInitials(nombre) {
  return nombre
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatMonto(valor) {
  return Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha + 'T00:00:00')
  const dia = d.getDate()
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${dia} de ${meses[d.getMonth()]}, ${d.getFullYear()}`
}

async function marcarSaldada(deuda) {
  // Register the remaining amount as a payment, then mark as paid
  if (deuda.montoPendiente > 0) {
    await registrarPago(deuda.id, {
      monto: deuda.montoPendiente,
      fecha: new Date().toISOString().split('T')[0],
    })
  } else {
    await archivarDeuda(deuda.id)
  }
}

async function eliminar(deuda) {
  await deleteDeuda(deuda.id)
}

function confirmarEliminarPersona() {
  showDeletePersona.value = true
}

async function ejecutarEliminarPersona() {
  showDeletePersona.value = false
  await deletePersona(personaSeleccionada.value.id)
}
</script>
