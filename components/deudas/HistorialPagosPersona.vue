<template>
  <div v-if="pagos.length > 0" class="mb-5">
    <button class="flex items-center gap-2 mb-3 w-full" @click="show = !show">
      <span class="w-1.5 h-1.5 rounded-full bg-theme-accent"></span>
      <h3 class="text-xs font-semibold text-theme-text-muted uppercase tracking-wider">
        Historial de pagos
      </h3>
      <span class="text-xs text-theme-text-sec">{{ totalPagos }}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-3 h-3 text-theme-text-muted ml-auto transition-transform"
        :class="show ? 'rotate-180' : ''"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Revert confirmation inline -->
    <div
      v-if="pagoRevertiendo"
      class="mb-3 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-center gap-3"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-4 h-4 text-orange-400 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
      <span class="text-xs text-theme-text-sec flex-1"
        >¿Revertir este pago? Se restaurará la deuda.</span
      >
      <button
        class="text-xs text-theme-text-sec px-2 py-1 hover:text-theme-text-sec"
        @click="pagoRevertiendo = null"
      >
        No
      </button>
      <button
        class="text-xs text-orange-400 font-semibold px-2 py-1 bg-orange-500/15 rounded-lg hover:bg-orange-500/25 active:scale-95 transition-all"
        :disabled="revirtiendo"
        @click="confirmarRevertir"
      >
        {{ revirtiendo ? '...' : 'Revertir' }}
      </button>
    </div>

    <!-- Modal editar pago individual -->
    <div v-if="pagoEditando" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div
        class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm"
        @click="pagoEditando = null"
      ></div>
      <div
        class="relative bg-theme-card rounded-2xl p-5 w-full max-w-sm border border-theme-border"
      >
        <h3 class="text-base font-semibold text-theme-text mb-4">Editar pago</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-theme-text-muted mb-1">Fecha</label>
            <input
              v-model="formEditar.fechaPago"
              type="date"
              class="w-full px-3 py-2.5 rounded-xl bg-theme-input border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-theme-text-muted mb-1"
              >Método de pago</label
            >
            <select
              v-model="formEditar.metodoPago"
              class="w-full px-3 py-2.5 rounded-xl bg-theme-input border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent"
            >
              <option value="">Sin especificar</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Yape">Yape</option>
              <option value="Plin">Plin</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="BCP">BCP</option>
              <option value="Interbank">Interbank</option>
              <option value="BBVA">BBVA</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-theme-text-muted mb-1">Notas</label>
            <input
              v-model="formEditar.notas"
              type="text"
              placeholder="Opcional"
              class="w-full px-3 py-2.5 rounded-xl bg-theme-input border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent"
            />
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button
            class="flex-1 py-2.5 rounded-xl text-theme-text-sec text-sm font-medium hover:text-theme-text-sec transition-colors"
            @click="pagoEditando = null"
          >
            Cancelar
          </button>
          <button
            class="flex-1 py-2.5 rounded-xl bg-theme-accent text-theme-on-accent text-sm font-medium hover:bg-theme-accent-dark transition-colors disabled:opacity-50"
            :disabled="guardandoEdicion"
            @click="guardarEdicion"
          >
            {{ guardandoEdicion ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <Transition name="collapse">
      <div v-if="show" class="relative pl-6">
        <!-- Vertical timeline line -->
        <div class="absolute left-2 top-2 bottom-2 w-px bg-theme-border-md"></div>

        <div v-for="(pago, idx) in pagos" :key="idx" class="relative mb-4 last:mb-0">
          <!-- Timeline dot -->
          <div
            class="absolute -left-4 top-3 w-2.5 h-2.5 rounded-full bg-theme-accent border-2 border-primary-900 z-10"
          ></div>

          <!-- Payment card -->
          <div class="bg-theme-card rounded-xl p-3.5 border border-theme-border">
            <!-- Header: date + amount + actions -->
            <div class="flex items-start justify-between mb-2.5">
              <div>
                <p class="text-xs font-semibold text-theme-text">
                  {{ formatFecha(pago.fechaPago) }}
                </p>
                <div v-if="pago.metodoPago" class="flex items-center gap-1 mt-0.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-3 h-3 text-theme-text-sec"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <span class="text-[0.6875rem] text-theme-accent font-medium">{{
                    pago.metodoPago
                  }}</span>
                </div>
                <p v-else class="text-[0.6875rem] text-theme-text-muted mt-0.5">
                  Sin método registrado
                </p>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-bold text-theme-accent"
                  >{{ currencySymbol }}&nbsp;{{ formatMonto(pago.montoTotal) }}</span
                >
                <!-- Editar pago -->
                <button
                  class="w-6 h-6 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                  title="Editar pago"
                  @click="abrirEditar(pago)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <!-- Revertir pago -->
                <button
                  class="w-6 h-6 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                  title="Revertir pago"
                  @click="pagoRevertiendo = pago"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Debts breakdown — each pago individual with its own method -->
            <div class="bg-theme-input rounded-lg p-2.5 space-y-2">
              <div
                v-for="(detalle, dIdx) in pago.detalles"
                :key="dIdx"
                class="flex items-start gap-2"
              >
                <span class="w-1 h-1 rounded-full bg-theme-accent/60 shrink-0 mt-1.5"></span>
                <div class="flex-1 min-w-0">
                  <p class="text-[0.6875rem] text-theme-text-muted truncate">
                    {{ detalle.concepto }}
                  </p>
                  <div
                    v-if="detalle.metodoPago && detalle.metodoPago !== pago.metodoPago"
                    class="text-[0.6875rem] text-theme-accent/70"
                  >
                    {{ detalle.metodoPago }}
                  </div>
                </div>
                <span class="text-[0.6875rem] text-theme-text-sec font-medium shrink-0"
                  >{{ currencySymbol }}&nbsp;{{ formatMonto(detalle.montoPagado) }}</span
                >
              </div>
            </div>

            <!-- Notes -->
            <p
              v-if="pago.notas && !pago.notas.startsWith('Pago global')"
              class="text-[0.6875rem] text-theme-text-muted italic mt-1.5"
            >
              {{ pago.notas }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
const props = defineProps({
  pagos: { type: Array, default: () => [] },
})

const { revertirPago, actualizarPago } = useDeudas()
const show = ref(false)
const pagoRevertiendo = ref(null)
const revirtiendo = ref(false)
const pagoEditando = ref(null)
const guardandoEdicion = ref(false)

const isPagoEditandoOpen = computed(() => pagoEditando.value !== null)
useOverlayBack(isPagoEditandoOpen, () => {
  pagoEditando.value = null
})
const { currencySymbol, formatMonto } = useCurrency()

const totalPagos = computed(() => props.pagos.reduce((s, g) => s + (g.pagoIds?.length || 1), 0))

const formEditar = reactive({
  fechaPago: '',
  metodoPago: '',
  notas: '',
})

function abrirEditar(pago) {
  pagoEditando.value = pago
  formEditar.fechaPago = pago.fechaPago || ''
  formEditar.metodoPago = pago.metodoPago || ''
  formEditar.notas = pago.notas && !pago.notas.startsWith('Pago global') ? pago.notas : ''
}

async function guardarEdicion() {
  if (!pagoEditando.value?.pagoIds?.length) return
  guardandoEdicion.value = true
  try {
    // Actualizar cada pago individual del grupo
    for (const pagoId of pagoEditando.value.pagoIds) {
      await actualizarPago(pagoId, {
        fechaPago: formEditar.fechaPago || undefined,
        metodoPago: formEditar.metodoPago || null,
        notas: formEditar.notas || null,
      })
    }
    pagoEditando.value = null
  } finally {
    guardandoEdicion.value = false
  }
}

async function confirmarRevertir() {
  if (!pagoRevertiendo.value?.pagoIds?.length) return
  revirtiendo.value = true
  try {
    for (const pagoId of pagoRevertiendo.value.pagoIds) {
      await revertirPago(pagoId)
    }
  } finally {
    revirtiendo.value = false
    pagoRevertiendo.value = null
  }
}

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha + 'T00:00:00')
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
}
</script>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition:
    opacity 0.2s ease,
    max-height 0.3s ease;
  max-height: 2000px;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
