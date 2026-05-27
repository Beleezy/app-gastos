<template>
  <div class="px-4 lg:px-0 pt-0 lg:pt-0 pb-2" data-testid="resumen-mes">
    <!-- Month Selector (outside card) -->
    <SharedMonthSelector
      :label="`${nombreMes} ${anioActual}`"
      :es-actual="esHoy"
      class="mb-3"
      @prev="mesAnterior"
      @next="mesSiguiente"
      @go-to-current="fetchPlan"
    />

    <!-- Budget Summary Card -->
    <div class="relative bg-gradient-to-br from-theme-card to-theme-card/90 rounded-2xl px-4 pt-4 pb-4 border border-theme-border overflow-hidden">
      <!-- Decorative accent -->
      <div class="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent)]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>

      <!-- PRESUPUESTO MENSUAL label + big amount + Editar -->
      <div class="relative mt-1">
        <p class="text-[10px] text-theme-text-sec uppercase tracking-widest font-semibold mb-1">Presupuesto mensual</p>
        <div class="flex items-end justify-between">
          <div v-if="editandoPresupuesto" class="flex flex-1 min-w-0 items-center gap-1">
            <span class="text-2xl font-bold text-theme-text-muted">{{ currencySymbol }}</span>
            <input
              ref="inputPresupuesto"
              v-model="presupuestoTemp"
              type="number"
              step="0.01"
              class="w-full min-w-0 bg-theme-input border border-theme-accent rounded-lg px-2 py-1 text-3xl font-extrabold text-theme-text focus:outline-none"
              @keyup.enter="guardarPresupuesto"
              @blur="guardarPresupuesto"
            />
          </div>
          <div v-else class="flex items-baseline gap-0.5">
            <button class="flex items-baseline gap-0.5 hover:text-theme-accent-light transition-colors" @click="iniciarEdicion">
              <span class="text-2xl font-bold text-theme-text-muted">{{ currencySymbol }}</span>
              <span class="text-3xl font-extrabold text-theme-text tracking-tight" data-testid="monto-presupuesto">
                {{ formatMonto(resumen.presupuesto) }}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 ml-1 text-theme-text-muted/50 hover:text-theme-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
          
          <div class="flex items-center gap-2 mb-1 shrink-0">
            <button
              v-if="editandoPresupuesto"
              class="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              @click="guardarPresupuesto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              v-if="editandoPresupuesto"
              class="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              @click="cancelarEdicion"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              v-else
              class="text-xs font-semibold text-theme-accent hover:text-theme-accent-light transition-colors"
              @click="iniciarEdicion"
            >
              Editar
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Row: Gastado / Disponible -->
      <div class="relative grid grid-cols-2 gap-2 mt-4">
        <div class="bg-theme-input rounded-xl px-2.5 py-1.5 border min-w-0 flex flex-col justify-between" :class="resumen.excedeGastoReal ? 'border-red-500/10' : 'border-emerald-500/10'">
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="w-2 h-2 rounded-full" :class="resumen.excedeGastoReal ? 'bg-red-400' : 'bg-emerald-400'"></span>
            <span class="text-[9px] text-theme-text-sec uppercase tracking-wider font-medium leading-none">Gastado</span>
          </div>
          <p class="text-[15px] font-bold truncate leading-tight" :class="resumen.excedeGastoReal ? 'text-red-400' : 'text-emerald-400'">
            <span class="text-[11px] font-medium mr-0.5 opacity-75">{{ currencySymbol }}</span>
            {{ formatMonto(totalGastoReal) }}
          </p>
        </div>
        <div class="bg-theme-input rounded-xl px-2.5 py-1.5 border min-w-0 flex flex-col justify-between" :class="resumen.saldoReal >= 0 ? 'border-emerald-500/10' : 'border-red-500/10'">
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="w-2 h-2 rounded-full" :class="resumen.saldoReal >= 0 ? 'bg-blue-400' : 'bg-red-400'"></span>
            <span class="text-[9px] text-theme-text-sec uppercase tracking-wider font-medium leading-none">Disponible</span>
          </div>
          <p class="text-[15px] font-bold truncate leading-tight" :class="resumen.saldoReal >= 0 ? 'text-white' : 'text-red-400'" data-testid="monto-saldo">
            <span class="text-[11px] font-medium mr-0.5 opacity-75">{{ currencySymbol }}</span>
            {{ formatMonto(resumen.saldoReal) }}
          </p>
        </div>
      </div>

      <!-- Planificado (Single line) -->
      <div class="flex items-center justify-between bg-theme-input rounded-xl px-3 py-1.5 mt-2 border border-orange-500/10">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-orange-400"></span>
          <span class="text-[10px] text-theme-text-sec uppercase tracking-wider font-medium">Planificado</span>
        </div>
        <p class="text-[13px] font-bold text-orange-400" data-testid="monto-asignado">
          <span class="text-[10px] font-medium mr-0.5 opacity-75">{{ currencySymbol }}</span>
          {{ formatMonto(resumen.totalPlanificado) }}
        </p>
      </div>

      <!-- Paid vs Pending badges + Ver más -->
      <div class="flex items-center justify-between mt-4">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5 bg-emerald-500/8 px-2.5 py-1.5 rounded-lg">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span class="text-[11px] text-theme-text-muted">Pagados</span>
            <span class="text-[11px] text-emerald-400 font-bold ml-0.5">{{ resumen.countPagados }}</span>
          </div>
          <div class="flex items-center gap-1.5 bg-orange-500/8 px-2.5 py-1.5 rounded-lg">
            <span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            <span class="text-[11px] text-theme-text-muted">Pendientes</span>
            <span class="text-[11px] text-orange-400 font-bold ml-0.5">{{ resumen.countPendientes }}</span>
          </div>
        </div>
        <button
          class="text-xs font-semibold text-theme-accent hover:text-theme-accent-light transition-colors flex items-center gap-0.5"
          @click="showVerMas = !showVerMas"
        >
          {{ showVerMas ? 'Ver menos' : 'Ver más' }}
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 transition-transform duration-300" :class="showVerMas ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <!-- Collapsible: progress bars, analytics, action buttons -->
      <Transition name="slide-down">
        <div v-if="showVerMas" class="space-y-3 mt-4">
          <!-- Multi-segment progress bar -->
          <div class="space-y-2">
            <div>
              <div class="flex items-center justify-between text-[10px] font-medium mb-1">
                <span class="text-theme-text-sec uppercase tracking-wider">Planificado / Presupuesto</span>
                <span :class="resumen.porcentajeAsignado > 90 ? 'text-orange-400' : 'text-theme-text-muted'">
                  {{ resumen.porcentajeAsignado.toFixed(0) }}%
                </span>
              </div>
              <div class="relative w-full h-2 bg-theme-input rounded-full overflow-hidden flex">
                <div
                  class="h-full rounded-full transition-all duration-700 ease-out"
                  :class="resumen.porcentajeAsignado > 90 ? 'bg-gradient-to-r from-orange-500 to-orange-400' : 'bg-gradient-to-r from-[var(--color-accent-dark)] via-[var(--color-accent)] to-indigo-400'"
                  :style="{ width: Math.min(resumen.porcentajeAsignado, 100) + '%' }"
                ></div>
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between text-[10px] font-medium mb-1">
                <span class="text-theme-text-sec uppercase tracking-wider">Gastado real / Presupuesto</span>
                <span :class="resumen.excedeGastoReal ? 'text-red-400' : 'text-emerald-400'">
                  {{ resumen.porcentajeGastadoReal.toFixed(0) }}%
                </span>
              </div>
              <div class="relative w-full h-2 bg-theme-input rounded-full overflow-hidden">
                <div
                  class="absolute inset-y-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
                  :class="resumen.excedeGastoReal ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
                  :style="{ width: Math.min(resumen.porcentajeGastadoReal, 100) + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Delta vs mes anterior -->
          <div v-if="analitica.deltaPct !== null" class="flex items-center gap-1.5 px-1">
            <svg v-if="analitica.deltaPct > 0" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 11l5-5 5 5M7 17l5-5 5 5" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 13l5 5 5-5M7 7l5 5 5-5" />
            </svg>
            <span class="text-xs font-bold" :class="analitica.deltaPct > 0 ? 'text-red-400' : 'text-emerald-400'">
              {{ analitica.deltaPct > 0 ? '+' : '' }}{{ analitica.deltaPct.toFixed(0) }}%
            </span>
            <span class="text-xs text-theme-text-muted">vs {{ mesAnteriorNombre }}</span>
          </div>

          <!-- Analítica: ritmo + proyección -->
          <div v-if="analitica.esMesActual && resumen.presupuesto > 0" class="space-y-2">
            <div
              v-if="analitica.excedeProyeccion"
              class="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.19 16a2 2 0 001.74 3z" />
              </svg>
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-semibold text-red-400">Proyección excede presupuesto</p>
                <p class="text-[10px] text-theme-text-muted leading-tight mt-0.5">
                  Al ritmo actual terminarías en {{ currencySymbol }}&nbsp;{{ formatMonto(analitica.proyeccionFinMes) }}
                  ({{ currencySymbol }}&nbsp;{{ formatMonto(analitica.excesoProyectado) }} sobre presupuesto)
                </p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-theme-input rounded-xl p-3">
                <p class="text-[9px] text-theme-text-sec uppercase tracking-wider font-medium">Ritmo por día</p>
                <p class="text-base font-bold text-theme-text mt-1">{{ currencySymbol }}&nbsp;{{ formatMonto(analitica.ritmoDiarioRecomendado) }}</p>
                <p class="text-[9px] text-theme-text-muted leading-tight mt-0.5">por {{ analitica.diasRestantes }} día{{ analitica.diasRestantes === 1 ? '' : 's' }} rest.</p>
              </div>
              <div class="bg-theme-input rounded-xl p-3">
                <p class="text-[9px] text-theme-text-sec uppercase tracking-wider font-medium">Proyección</p>
                <p class="text-base font-bold mt-1" :class="analitica.excedeProyeccion ? 'text-red-400' : 'text-theme-text'">{{ currencySymbol }}&nbsp;{{ formatMonto(analitica.proyeccionFinMes) }}</p>
                <p class="text-[9px] text-theme-text-muted leading-tight mt-0.5">a fin de mes</p>
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button
              class="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-theme-border bg-theme-input text-theme-text-sec text-xs font-semibold hover:border-theme-accent/30 hover:text-theme-accent active:scale-95 transition-all"
              data-testid="btn-abrir-plantillas"
              title="Plantillas del mes"
              @click="emit('abrir-plantillas')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H7a2 2 0 00-2 2v2m4-6h6" />
              </svg>
              Plantillas
            </button>
            <button
              class="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-theme-border bg-theme-input text-theme-text-sec text-xs font-semibold hover:border-emerald-500/30 hover:text-emerald-400 active:scale-95 transition-all"
              @click="emit('exportar')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel
            </button>
          </div>

          <button
            class="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-theme-border bg-theme-input text-theme-text-sec text-xs font-semibold hover:border-amber-500/30 hover:text-amber-400 active:scale-95 transition-all mt-2"
            data-testid="btn-abrir-presupuestos"
            title="Topes por categoría"
            @click="emit('abrir-presupuestos')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Topes por categoría
          </button>

            <!-- Sincronizar con Google Calendar (solo si conectado) -->
            <button
              v-if="gcalEstado.conectado"
              class="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-theme-border bg-theme-input text-theme-text-sec text-xs font-semibold hover:border-blue-500/30 hover:text-blue-400 active:scale-95 transition-all disabled:opacity-50 mt-2"
              :disabled="sincronizandoGcal"
              @click="onSincronizarGcal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {{ sincronizandoGcal ? 'Sincronizando...' : 'Sincronizar con Google Calendar' }}
            </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { MESES } from '~/utils/constants'

const emit = defineEmits(['exportar', 'abrir-plantillas', 'abrir-presupuestos'])

const {
  mesActual, anioActual, nombreMes, esHoy,
  resumen, mesSiguiente, mesAnterior, updatePresupuesto, fetchPlan, totalGastoReal,
  analitica, fetchMesAnterior,
} = usePlanificador()

const { success, error: toastError } = useToast()

const { config, fetchConfig: fetchConfigData } = useConfiguraciones()
const presupuestoDefault = computed(() => parseFloat(config.value?.presupuestoMensualDefault) || 0)

// Google Calendar — solo aparece el boton si hay conexion activa
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

async function sincronizarPresupuesto() {
  await updatePresupuesto(presupuestoDefault.value)
  success('Presupuesto sincronizado con configuracion')
}

const editandoPresupuesto = ref(false)
const presupuestoTemp = ref(0)
const inputPresupuesto = ref(null)

const showVerMas = ref(false)

watch([mesActual, anioActual], () => {
  fetchPlan()
  fetchMesAnterior()
}, { immediate: true })

const { currencySymbol, formatMonto } = useCurrency()

// Nombre del mes anterior para el label "vs marzo"
const mesAnteriorNombre = computed(() => {
  const m = mesActual.value === 1 ? 12 : mesActual.value - 1
  return MESES[m - 1]?.toLowerCase() || ''
})

// Helpers para formato de monto grande: parte entera y decimal
function formatParteEntera(valor) {
  const num = parseFloat(valor) || 0
  return Math.floor(num).toLocaleString('es-PE')
}

function formatParteDecimal(valor) {
  const num = parseFloat(valor) || 0
  const dec = num.toFixed(2).split('.')[1]
  return dec
}

function iniciarEdicion() {
  presupuestoTemp.value = resumen.value.presupuesto
  editandoPresupuesto.value = true
  nextTick(() => {
    inputPresupuesto.value?.focus()
    inputPresupuesto.value?.select()
  })
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

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-8px);
}
.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 700px;
  transform: translateY(0);
}
</style>
