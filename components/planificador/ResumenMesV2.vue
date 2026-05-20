<!--
  Versión V2 (rediseño UI mobile-first) de ResumenMes.

  Mismo contrato de props/emits que ResumenMes.vue (V1) — mismas dependencias
  (usePlanificador, useToast, useConfiguraciones, useGoogleCalendar). Solo
  cambia la presentación visual:

    1) Hero único de presupuesto (etiqueta + monto grande + sub-línea con
       gastado/disponible) en lugar de 3 montos compitiendo.
    2) Barra de progreso continua bajo el hero (gastado/presupuesto).
    3) Tira de 3 chips de stats compactos (Planificado / Pagados / Pendientes).
    4) Footer de insights SIEMPRE visible: Ritmo, Proyección, Δ vs mes anterior.
       (la V1 esconde esto bajo "Ver más" — lo movemos a una sección secundaria
       con acciones Plantillas/Excel/GCal).

  No toca lógica de negocio. Solo template + estilos.
-->
<template>
  <div class="px-4 lg:px-0 pt-0 lg:pt-0 pb-2" data-testid="resumen-mes-v2">
    <!-- Month Selector -->
    <SharedMonthSelector
      :label="`${nombreMes} ${anioActual}`"
      :es-actual="esHoy"
      class="mb-3"
      @prev="mesAnterior"
      @next="mesSiguiente"
      @go-to-current="fetchPlan"
    />

    <!-- Hero Card: Presupuesto -->
    <div class="relative bg-gradient-to-br from-theme-card to-theme-card/95 rounded-3xl p-5 border border-theme-accent/15 overflow-hidden">
      <!-- Decorative accent (más sutil que V1) -->
      <div class="absolute -top-16 -right-16 w-40 h-40 bg-theme-accent/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Etiqueta + monto editable -->
      <div class="relative">
        <p class="text-hero-label">Presupuesto del mes</p>

        <div v-if="editandoPresupuesto" class="flex items-baseline gap-1 mt-1.5">
          <span class="text-xl font-medium text-theme-text-muted">{{ currencySymbol }}</span>
          <input
            ref="inputPresupuesto"
            v-model="presupuestoTemp"
            type="number"
            step="0.01"
            class="flex-1 min-w-0 bg-theme-input border border-theme-accent rounded-lg px-2 py-1 text-hero text-theme-text focus:outline-none"
            @keyup.enter="guardarPresupuesto"
            @blur="guardarPresupuesto"
          />
          <button
            class="ml-2 flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 tap-44 transition-colors"
            aria-label="Confirmar"
            @click="guardarPresupuesto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            class="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 tap-44 transition-colors"
            aria-label="Cancelar"
            @click="cancelarEdicion"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <button
          v-else
          class="group flex items-baseline gap-1 mt-1.5 hover:opacity-90 transition-opacity"
          @click="iniciarEdicion"
        >
          <span class="text-xl font-medium text-theme-text-muted">{{ currencySymbol }}</span>
          <span class="text-hero text-theme-text" data-testid="monto-presupuesto">
            {{ formatMonto(resumen.presupuesto) }}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 ml-1 text-theme-text-muted/60 group-hover:text-theme-accent transition-colors self-center" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      <!-- Sub-línea: Gastado · Disponible -->
      <p class="relative text-sm text-theme-text-sec mt-2">
        Gastado
        <strong class="text-theme-text font-semibold" data-testid="monto-gastado-real">
          {{ currencySymbol }} {{ formatMonto(totalGastoReal) }}
        </strong>
        ·
        Disponible
        <strong
          class="font-semibold"
          :class="resumen.saldoReal >= 0 ? 'text-emerald-400' : 'text-red-400'"
          data-testid="monto-saldo"
        >
          {{ currencySymbol }} {{ formatMonto(resumen.saldoReal) }}
        </strong>
      </p>

      <!-- Barra de progreso única (gastado/presupuesto) -->
      <div class="relative mt-3 h-2.5 bg-theme-input rounded-full overflow-hidden">
        <div
          class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          :class="resumen.excedeGastoReal ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
          :style="{ width: Math.min(resumen.porcentajeGastadoReal, 100) + '%' }"
        ></div>
      </div>

      <!-- Stats: Planificado · Pagados · Pendientes -->
      <div class="relative grid grid-cols-3 gap-2 mt-4">
        <div class="bg-theme-input/60 rounded-xl px-2 py-2 text-center border border-theme-border">
          <p class="text-[10px] text-theme-text-muted uppercase tracking-wider font-semibold">Planif.</p>
          <p class="text-sm font-bold text-orange-400 mt-1 tabular-nums" data-testid="monto-asignado">
            <span class="text-[10px] font-medium opacity-75 mr-0.5">{{ currencySymbol }}</span>
            {{ formatMonto(resumen.totalPlanificado) }}
          </p>
        </div>
        <div class="bg-theme-input/60 rounded-xl px-2 py-2 text-center border border-emerald-500/15">
          <p class="text-[10px] text-theme-text-muted uppercase tracking-wider font-semibold">Pagados</p>
          <p class="text-sm font-bold text-emerald-400 mt-1 tabular-nums">{{ resumen.countPagados }}</p>
        </div>
        <div class="bg-theme-input/60 rounded-xl px-2 py-2 text-center border border-amber-500/15">
          <p class="text-[10px] text-theme-text-muted uppercase tracking-wider font-semibold">Pend.</p>
          <p class="text-sm font-bold text-amber-400 mt-1 tabular-nums">{{ resumen.countPendientes }}</p>
        </div>
      </div>

      <!-- Insights footer: SIEMPRE visible (no bajo "Ver más") -->
      <div class="relative mt-4 pt-3 border-t border-theme-border flex flex-wrap gap-x-4 gap-y-1.5">
        <span
          v-if="analitica.esMesActual && resumen.presupuesto > 0"
          class="inline-flex items-center gap-1.5 text-xs"
          :class="analitica.excedeProyeccion ? 'text-red-400' : 'text-theme-text-sec'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span class="font-medium">Ritmo</span>
          <strong class="text-theme-text font-semibold tabular-nums">{{ currencySymbol }} {{ formatMonto(analitica.ritmoDiarioRecomendado) }}/día</strong>
        </span>

        <span
          v-if="analitica.esMesActual && resumen.presupuesto > 0"
          class="inline-flex items-center gap-1.5 text-xs"
          :class="analitica.excedeProyeccion ? 'text-red-400' : 'text-theme-text-sec'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span class="font-medium">Proyección</span>
          <strong class="font-semibold tabular-nums" :class="analitica.excedeProyeccion ? 'text-red-400' : 'text-theme-text'">{{ currencySymbol }} {{ formatMonto(analitica.proyeccionFinMes) }}</strong>
        </span>

        <span
          v-if="analitica.deltaPct !== null"
          class="inline-flex items-center gap-1 text-xs"
          :class="analitica.deltaPct > 0 ? 'text-red-400' : 'text-emerald-400'"
        >
          <svg v-if="analitica.deltaPct > 0" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 17l9.2-9.2M17 17V8H8" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 7L7.8 16.2M7 7v9h9" />
          </svg>
          <span class="font-semibold">{{ analitica.deltaPct > 0 ? '+' : '' }}{{ analitica.deltaPct.toFixed(0) }}% vs {{ mesAnteriorNombre }}</span>
        </span>
      </div>

      <!-- Alerta proyección excede (compacta, sin esconder) -->
      <div
        v-if="analitica.esMesActual && analitica.excedeProyeccion"
        class="relative mt-3 flex items-start gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.19 16a2 2 0 001.74 3z" />
        </svg>
        <p class="text-[11px] text-red-400 leading-tight">
          Al ritmo actual excederías el presupuesto en
          <strong>{{ currencySymbol }} {{ formatMonto(analitica.excesoProyectado) }}</strong>.
        </p>
      </div>
    </div>

    <!-- Acciones secundarias (Plantillas · Excel · GCal) -->
    <div class="grid gap-2 mt-3" :class="gcalEstado.conectado ? 'grid-cols-3' : 'grid-cols-2'">
      <button
        class="flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-theme-border bg-theme-card text-theme-text-sec text-xs font-semibold hover:border-theme-accent/30 hover:text-theme-accent active:scale-95 transition-all tap-44"
        data-testid="btn-abrir-plantillas"
        @click="emit('abrir-plantillas')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H7a2 2 0 00-2 2v2m4-6h6" />
        </svg>
        Plantillas
      </button>
      <button
        class="flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-theme-border bg-theme-card text-theme-text-sec text-xs font-semibold hover:border-emerald-500/30 hover:text-emerald-400 active:scale-95 transition-all tap-44"
        @click="emit('exportar')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Excel
      </button>
      <button
        v-if="gcalEstado.conectado"
        class="flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-theme-border bg-theme-card text-theme-text-sec text-xs font-semibold hover:border-blue-500/30 hover:text-blue-400 active:scale-95 transition-all disabled:opacity-50 tap-44"
        :disabled="sincronizandoGcal"
        @click="onSincronizarGcal"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {{ sincronizandoGcal ? '...' : 'GCal' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { MESES } from '~/utils/constants'

const emit = defineEmits(['exportar', 'abrir-plantillas'])

const {
  mesActual, anioActual, nombreMes, esHoy,
  resumen, mesSiguiente, mesAnterior, updatePresupuesto, fetchPlan, totalGastoReal,
  analitica, fetchMesAnterior,
} = usePlanificador()

const { success, error: toastError } = useToast()
const { fetchConfig: fetchConfigData } = useConfiguraciones()

const { estado: gcalEstado, fetchEstado: fetchGcalEstado, resincronizar: gcalResincronizar } = useGoogleCalendar()
const sincronizandoGcal = ref(false)

onMounted(() => {
  fetchConfigData()
  if (gcalEstado.value.loading) fetchGcalEstado()
})

async function onSincronizarGcal() {
  sincronizandoGcal.value = true
  try {
    const r = await gcalResincronizar()
    success(`Sincronizado: ${r.creados} creados, ${r.actualizados} actualizados, ${r.eliminados} eliminados`)
  } catch (e) {
    toastError('Error al sincronizar: ' + (e?.message || e))
  } finally {
    sincronizandoGcal.value = false
  }
}

const editandoPresupuesto = ref(false)
const presupuestoTemp = ref(0)
const inputPresupuesto = ref(null)

watch([mesActual, anioActual], () => {
  fetchPlan()
  fetchMesAnterior()
}, { immediate: true })

const { currencySymbol, formatMonto } = useCurrency()

const mesAnteriorNombre = computed(() => {
  const m = mesActual.value === 1 ? 12 : mesActual.value - 1
  return MESES[m - 1]?.toLowerCase() || ''
})

function iniciarEdicion() {
  presupuestoTemp.value = resumen.value.presupuesto
  editandoPresupuesto.value = true
  nextTick(() => {
    inputPresupuesto.value?.focus()
    inputPresupuesto.value?.select()
  })
}

function cancelarEdicion() {
  editandoPresupuesto.value = false
}

async function guardarPresupuesto() {
  const monto = parseFloat(presupuestoTemp.value)
  if (!isNaN(monto) && monto >= 0) {
    await updatePresupuesto(monto)
    success('Presupuesto actualizado')
  }
  editandoPresupuesto.value = false
}
</script>
