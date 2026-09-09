<template>
  <!-- Active debts section -->
  <div class="mb-5">
    <div class="flex items-center gap-2 mb-2.5">
      <span
        class="w-1.5 h-1.5 rounded-full"
        :class="tab === 'me_deben' ? 'bg-emerald-400' : 'bg-red-400'"
      ></span>
      <h3 class="text-xs font-semibold text-theme-text-muted uppercase tracking-wider">
        Pendientes
      </h3>
      <span class="text-xs text-theme-text-sec ml-auto">{{ deudas.length }}</span>
    </div>

    <div
      v-for="deuda in deudas"
      :key="deuda.id"
      class="bg-theme-card rounded-xl p-3.5 mb-2 border border-theme-border"
      data-testid="deuda-item"
    >
      <!-- Concepto a todo el ancho: con texto grande, partir la tarjeta en
           dos columnas dejaba el concepto apretado y la derecha vacía -->
      <p class="text-sm font-medium text-theme-text leading-snug break-words">
        {{ deuda.concepto }}
      </p>
      <div class="flex items-start justify-between gap-3 mt-1">
        <div class="flex-1 min-w-0">
          <p class="text-xs text-theme-text-sec">
            {{ formatFecha(deuda.fechaCreacion) }}
            <span class="text-theme-text-muted"
              >· {{ formatRelativo(deuda.createdAt || deuda.fechaCreacion) }}</span
            >
          </p>
          <div v-if="deuda.fechaPago" class="flex items-center gap-1.5 mt-1 flex-wrap">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-3 h-3"
              :class="esVencida(deuda) ? 'text-red-400' : 'text-theme-accent'"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p
              class="text-[0.6875rem] font-medium"
              :class="esVencida(deuda) ? 'text-red-400' : 'text-theme-accent'"
            >
              {{ esVencida(deuda) ? 'Vencida:' : 'Pago:' }} {{ formatFecha(deuda.fechaPago) }}
            </p>
            <span
              v-if="esVencida(deuda)"
              class="text-[0.6875rem] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-semibold"
              >VENCIDA</span
            >
          </div>
          <div v-if="deuda.notas" class="mt-1">
            <p class="text-[0.6875rem] text-theme-text-muted italic">{{ deuda.notas }}</p>
          </div>
        </div>
        <div class="text-right shrink-0">
          <p class="text-sm font-semibold text-theme-text">
            {{ currencySymbol }}&nbsp;{{ formatMonto(deuda.montoOriginal) }}
          </p>
          <p v-if="deuda.estado === 'parcial'" class="text-[0.6875rem] text-orange-400 mt-0.5">
            Pendiente: {{ currencySymbol }}&nbsp;{{ formatMonto(deuda.montoPendiente) }}
          </p>
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium mt-1"
            :class="
              deuda.estado === 'parcial'
                ? 'bg-orange-500/15 text-orange-400'
                : 'bg-yellow-500/15 text-yellow-400'
            "
          >
            {{ deuda.estado === 'parcial' ? 'Parcial' : 'Pendiente' }}
          </span>
        </div>
      </div>

      <!-- Progress bar for partial payments -->
      <div v-if="deuda.montoOriginal !== deuda.montoPendiente" class="mt-2.5">
        <div class="w-full h-1.5 bg-theme-input rounded-full overflow-hidden">
          <div
            class="h-full rounded-full bg-gradient-to-r from-theme-accent to-theme-accent transition-all duration-500"
            :style="{ width: (1 - deuda.montoPendiente / deuda.montoOriginal) * 100 + '%' }"
          ></div>
        </div>
        <p class="text-[0.6875rem] text-theme-text-muted mt-0.5">
          {{ ((1 - deuda.montoPendiente / deuda.montoOriginal) * 100).toFixed(0) }}% pagado
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-theme-border">
        <button
          class="min-w-[44px] min-h-[44px] h-11 px-2.5 flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium text-theme-accent bg-theme-accent-bg hover:bg-theme-accent-bg active:bg-theme-accent-bg transition-colors"
          data-testid="btn-nuevo-pago"
          @click="$emit('registrar-pago', deuda)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          Pago
        </button>
        <button
          class="min-w-[44px] min-h-[44px] h-11 px-2.5 flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 transition-colors"
          data-testid="btn-editar-deuda"
          @click="$emit('editar', deuda)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4 shrink-0"
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
          Editar
        </button>
        <button
          class="min-w-[44px] min-h-[44px] h-11 px-2.5 flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 transition-colors"
          @click="$emit('saldar', deuda)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Saldar
        </button>
        <button
          class="min-w-[44px] min-h-[44px] h-11 px-2.5 flex items-center justify-center rounded-lg text-red-400 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 transition-colors"
          data-testid="btn-eliminar-deuda"
          aria-label="Eliminar deuda"
          @click="$emit('eliminar', deuda)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Lista de deudas pendientes de una persona, dentro de su detalle.
//
// Extraída de `DetallePersona.vue`, que tenía 765 líneas de plantilla con
// la tarjeta de la persona, las deudas, el histórico de pagos, el vínculo
// y ocho modales en el mismo archivo. Este bloque es de presentación: los
// diálogos de confirmación siguen viviendo en el padre, que es quien
// conoce el estado de la página.
//
// `esVencida` se recibe como función en vez de calcularse aquí para no
// duplicar la noción de "hoy": el padre la resuelve en la zona horaria
// del usuario y una segunda fuente acabaría discrepando.
defineProps({
  deudas: { type: Array, required: true },
  /** 'me_deben' | 'yo_debo' — decide el color del acento. */
  tab: { type: String, required: true },
  /** (deuda) => boolean, con el "hoy" del usuario ya aplicado. */
  esVencida: { type: Function, required: true },
})

defineEmits(['registrar-pago', 'editar', 'saldar', 'eliminar'])

// `formatFecha` sale de useFormatters, no de una copia local: al extraer
// este bloque se vio que DetallePersona.vue llevaba su propia versión —el
// mismo resultado con el array de meses duplicado inline— y por eso no
// dependía del composable compartido.
const { formatFecha } = useFormatters()
const { currencySymbol, formatMonto } = useCurrency()
</script>
