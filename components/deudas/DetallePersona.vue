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
          <!-- Export PDF (only me_deben) -->
          <button
            v-if="tabActual === 'me_deben' && totalPendientePersona > 0"
            class="w-8 h-8 rounded-lg bg-primary-700/50 flex items-center justify-center text-gray-500 hover:text-blue-400 transition-colors"
            title="Exportar PDF"
            @click="exportarPdf"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <!-- Share WhatsApp -->
          <button
            v-if="tabActual === 'me_deben' && totalPendientePersona > 0"
            class="w-8 h-8 rounded-lg bg-primary-700/50 flex items-center justify-center text-gray-500 hover:text-emerald-400 transition-colors"
            title="Enviar por WhatsApp"
            @click="enviarWhatsapp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </button>
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
              {{ currencySymbol }} {{ formatMonto(totalPendientePersona) }}
            </span>
          </div>
          <!-- Pago global button -->
          <button
            v-if="deudasActivasPersona.length > 1 && totalPendientePersona > 0"
            class="w-full mt-2 py-2 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-medium hover:bg-blue-500/25 transition-colors flex items-center justify-center gap-1.5"
            @click="emit('pagoGlobal')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Registrar pago global
          </button>
        </div>
      </div>
    </div>

    <!-- Stats: progress + breakdown -->
    <div v-if="!isLoading && (deudasActivasPersona.length > 0 || deudasSaldadasPersona.length > 0)" class="bg-primary-800 rounded-2xl p-4 mb-4">
      <!-- Overall collection progress -->
      <div class="mb-3">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs text-gray-400">Progreso de {{ tabActual === 'me_deben' ? 'cobro' : 'pago' }}</span>
          <span class="text-xs font-medium" :class="porcentajeCobrado > 70 ? 'text-emerald-400' : 'text-blue-400'">
            {{ porcentajeCobrado.toFixed(0) }}%
          </span>
        </div>
        <div class="w-full h-2 bg-primary-900/80 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
            :style="{ width: porcentajeCobrado + '%' }"
          ></div>
        </div>
        <div class="flex items-center justify-between mt-1">
          <span class="text-[10px] text-gray-600">{{ currencySymbol }} {{ formatMonto(totalCobrado) }} cobrado</span>
          <span class="text-[10px] text-gray-600">{{ currencySymbol }} {{ formatMonto(totalOriginal) }} total</span>
        </div>
      </div>

      <!-- Mini breakdown bars per debt -->
      <div v-if="deudasActivasPersona.length > 1" class="space-y-1.5">
        <p class="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Distribución</p>
        <div v-for="deuda in deudasActivasPersona" :key="deuda.id" class="flex items-center gap-2">
          <span class="text-[10px] text-gray-400 truncate w-24 shrink-0">{{ deuda.concepto }}</span>
          <div class="flex-1 h-1.5 bg-primary-900/80 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="tabActual === 'me_deben' ? 'bg-emerald-500' : 'bg-red-500'"
              :style="{ width: totalPendientePersona > 0 ? ((deuda.montoPendiente / totalPendientePersona) * 100) + '%' : '0%' }"
            ></div>
          </div>
          <span class="text-[10px] text-gray-500 shrink-0">{{ currencySymbol }} {{ formatMonto(deuda.montoPendiente) }}</span>
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
              <div v-if="deuda.fechaPago" class="flex items-center gap-1 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="text-[10px] text-blue-400 font-medium">Pago: {{ formatFecha(deuda.fechaPago) }}</p>
              </div>
              <div v-if="deuda.notas" class="mt-1">
                <p class="text-[10px] text-gray-600 italic">{{ deuda.notas }}</p>
              </div>
            </div>
            <div class="text-right shrink-0 ml-3">
              <p class="text-sm font-semibold text-white">{{ currencySymbol }} {{ formatMonto(deuda.montoOriginal) }}</p>
              <p v-if="deuda.estado === 'parcial'" class="text-[10px] text-orange-400 mt-0.5">
                Pendiente: {{ currencySymbol }} {{ formatMonto(deuda.montoPendiente) }}
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
                class="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                :style="{ width: ((1 - deuda.montoPendiente / deuda.montoOriginal) * 100) + '%' }"
              ></div>
            </div>
            <p class="text-[10px] text-gray-600 mt-0.5">
              {{ ((1 - deuda.montoPendiente / deuda.montoOriginal) * 100).toFixed(0) }}% pagado
            </p>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 mt-2 pt-2 border-t border-primary-700/20 flex-wrap">
            <button
              class="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              @click="emit('registrarPago', deuda)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Pago
            </button>
            <button
              class="text-xs text-gray-600 hover:text-amber-400 transition-colors flex items-center gap-1"
              @click="emit('editarDeuda', deuda)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
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

      <!-- Payment history section -->
      <div v-if="pagosPersona.length > 0" class="mb-5">
        <button
          class="flex items-center gap-2 mb-2.5 w-full"
          @click="showPagos = !showPagos"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Historial de pagos</h3>
          <span class="text-xs text-gray-500">{{ pagosPersona.length }}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-3 h-3 text-gray-600 ml-auto transition-transform"
            :class="showPagos ? 'rotate-180' : ''"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-if="showPagos" class="space-y-2">
          <div v-for="(pago, idx) in pagosPersona" :key="idx" class="bg-primary-800 rounded-xl p-3.5 border border-primary-700/30">
            <!-- Payment header -->
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs text-gray-500">{{ formatFecha(pago.fechaPago) }}</p>
                  <p v-if="pago.metodoPago" class="text-[10px] text-gray-600">{{ pago.metodoPago }}</p>
                </div>
              </div>
              <span class="text-sm font-bold text-blue-400">{{ currencySymbol }} {{ formatMonto(pago.montoTotal) }}</span>
            </div>

            <!-- Affected debts detail -->
            <div class="bg-primary-900/40 rounded-lg p-2.5 space-y-1.5">
              <div v-for="(detalle, dIdx) in pago.detalles" :key="dIdx" class="flex items-center justify-between">
                <p class="text-xs text-gray-400 truncate flex-1 min-w-0 mr-2">{{ detalle.concepto }}</p>
                <span class="text-xs text-gray-300 font-medium shrink-0">{{ currencySymbol }} {{ formatMonto(detalle.montoPagado) }}</span>
              </div>
            </div>

            <!-- Notes -->
            <p v-if="pago.notas && !pago.notas.startsWith('Pago global')" class="text-[10px] text-gray-600 italic mt-1.5">{{ pago.notas }}</p>
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
                <p class="text-sm font-semibold text-gray-500">{{ currencySymbol }} {{ formatMonto(deuda.montoOriginal) }}</p>
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
const emit = defineEmits(['registrarPago', 'agregarDeuda', 'editarDeuda', 'pagoGlobal'])

const {
  tabActual, personaSeleccionada,
  deudasActivasPersona, deudasSaldadasPersona,
  totalPendientePersona, isLoading,
  volverALista, deleteDeuda, archivarDeuda, deletePersona,
  registrarPago, pagosPersona,
} = useDeudas()

const { descargarPdf, compartirWhatsapp } = useDeudaPdf()

const showSaldadas = ref(false)
const showPagos = ref(false)
const showDeletePersona = ref(false)

const allDeudas = computed(() => [...deudasActivasPersona.value, ...deudasSaldadasPersona.value])
const totalOriginal = computed(() => allDeudas.value.reduce((s, d) => s + d.montoOriginal, 0))
const totalCobrado = computed(() => allDeudas.value.reduce((s, d) => s + (d.montoOriginal - d.montoPendiente), 0))
const porcentajeCobrado = computed(() => totalOriginal.value > 0 ? (totalCobrado.value / totalOriginal.value) * 100 : 0)

async function exportarPdf() {
  await descargarPdf(personaSeleccionada.value, deudasActivasPersona.value, deudasSaldadasPersona.value)
}

async function enviarWhatsapp() {
  await compartirWhatsapp(personaSeleccionada.value, deudasActivasPersona.value, deudasSaldadasPersona.value)
}

function getInitials(nombre) {
  return nombre
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const { currencySymbol, formatMonto } = useCurrency()

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
