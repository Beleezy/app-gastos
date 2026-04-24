<template>
  <div class="px-4 lg:px-0 pt-0 lg:pt-0 pb-2">
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
          <div v-if="editandoPresupuesto" class="flex items-center gap-1">
            <span class="text-2xl font-bold text-theme-text-muted">{{ currencySymbol }}</span>
            <input
              ref="inputPresupuesto"
              v-model="presupuestoTemp"
              type="number"
              step="0.01"
              class="w-36 bg-theme-input border border-theme-accent rounded-lg px-2 py-1 text-3xl font-extrabold text-theme-text focus:outline-none"
              @keyup.enter="guardarPresupuesto"
              @blur="guardarPresupuesto"
            />
          </div>
          <div v-else class="flex items-baseline gap-0.5">
            <button class="flex items-baseline gap-0.5 hover:text-theme-accent-light transition-colors" @click="iniciarEdicion">
              <span class="text-2xl font-bold text-theme-text-muted">{{ currencySymbol }}</span>
              <span class="text-3xl font-extrabold text-theme-text tracking-tight">
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
          <p class="text-[15px] font-bold truncate leading-tight" :class="resumen.saldoReal >= 0 ? 'text-white' : 'text-red-400'">
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
        <p class="text-[13px] font-bold text-orange-400">
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
                  Al ritmo actual terminarías en {{ currencySymbol }} {{ formatMonto(analitica.proyeccionFinMes) }}
                  ({{ currencySymbol }} {{ formatMonto(analitica.excesoProyectado) }} sobre presupuesto)
                </p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-theme-input rounded-xl p-3">
                <p class="text-[9px] text-theme-text-sec uppercase tracking-wider font-medium">Ritmo por día</p>
                <p class="text-base font-bold text-theme-text mt-1">{{ currencySymbol }} {{ formatMonto(analitica.ritmoDiarioRecomendado) }}</p>
                <p class="text-[9px] text-theme-text-muted leading-tight mt-0.5">por {{ analitica.diasRestantes }} día{{ analitica.diasRestantes === 1 ? '' : 's' }} rest.</p>
              </div>
              <div class="bg-theme-input rounded-xl p-3">
                <p class="text-[9px] text-theme-text-sec uppercase tracking-wider font-medium">Proyección</p>
                <p class="text-base font-bold mt-1" :class="analitica.excedeProyeccion ? 'text-red-400' : 'text-theme-text'">{{ currencySymbol }} {{ formatMonto(analitica.proyeccionFinMes) }}</p>
                <p class="text-[9px] text-theme-text-muted leading-tight mt-0.5">a fin de mes</p>
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button
              class="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-theme-accent/20 bg-theme-accent-bg text-theme-accent text-xs font-semibold hover:bg-theme-accent-bg-hover active:scale-95 transition-all"
              :disabled="duplicando"
              :title="gastosPlaneados.length > 0 ? 'Copiar gastos de otro mes (los duplicados por concepto se omiten)' : 'Copiar gastos de otro mes'"
              @click="abrirSelectorMes"
            >
              <svg v-if="!duplicando" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              <svg v-else class="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Copiar mes
            </button>
            <button
              class="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-theme-border bg-theme-input text-theme-text-sec text-xs font-semibold hover:border-emerald-500/30 hover:text-emerald-400 active:scale-95 transition-all"
              @click="$emit('exportar')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar Excel
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>

  <!-- Modal: selector de mes origen para duplicar -->
  <div v-if="showSelectorMes" class="fixed inset-0 z-50 flex items-center justify-center px-6">
    <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="showSelectorMes = false"></div>
    <div class="relative bg-theme-card rounded-2xl p-5 w-full max-w-sm border border-theme-border">
      <h3 class="text-base font-semibold text-theme-text mb-1">Copiar mes</h3>
      <p class="text-xs text-theme-text-sec mb-4">Elige el mes de origen para copiar los gastos planificados.</p>
      <div class="flex gap-2 mb-4">
        <select
          v-model.number="origenMes"
          class="flex-1 bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-theme-text text-sm focus:outline-none focus:border-theme-accent"
        >
          <option v-for="(m, i) in MESES" :key="i" :value="i + 1">{{ m }}</option>
        </select>
        <input
          v-model.number="origenAnio"
          type="number"
          :min="anioActual - 5"
          :max="anioActual"
          class="w-24 bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-theme-text text-sm focus:outline-none focus:border-theme-accent"
        />
      </div>
      <div class="space-y-2">
        <button
          class="w-full py-2.5 rounded-xl bg-theme-accent-bg text-theme-accent text-sm font-medium hover:bg-theme-accent-bg-hover transition-colors disabled:opacity-50"
          :disabled="duplicando || (origenMes === mesActual && origenAnio === anioActual)"
          @click="ejecutarDuplicar"
        >
          {{ duplicando ? 'Copiando...' : 'Copiar' }}
        </button>
        <button
          class="w-full py-2.5 rounded-xl text-theme-text-sec text-sm hover:text-theme-text-sec transition-colors"
          @click="showSelectorMes = false"
        >
          Cancelar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { MESES } from '~/utils/constants'

const emit = defineEmits(['exportar'])

const {
  mesActual, anioActual, nombreMes, esHoy,
  resumen, gastosPlaneados, mesSiguiente, mesAnterior, updatePresupuesto, fetchPlan, duplicarMes, totalGastoReal,
  analitica, fetchMesAnterior,
} = usePlanificador()

const duplicando = ref(false)
const showSelectorMes = ref(false)
useOverlayBack(showSelectorMes, () => { showSelectorMes.value = false })
const { success, error: toastError } = useToast()

const { config, fetchConfig: fetchConfigData } = useConfiguraciones()
const presupuestoDefault = computed(() => parseFloat(config.value?.presupuestoMensualDefault) || 0)

onMounted(() => { fetchConfigData() })

async function sincronizarPresupuesto() {
  await updatePresupuesto(presupuestoDefault.value)
  success('Presupuesto sincronizado con configuracion')
}

// Inicializar origen en el mes anterior al actual
const origenMes = ref(mesActual.value === 1 ? 12 : mesActual.value - 1)
const origenAnio = ref(mesActual.value === 1 ? anioActual.value - 1 : anioActual.value)

// Resetea origen al mes inmediatamente anterior al mes visible actual
// y abre el modal. Sin este reset, los valores quedan desfasados cuando
// el usuario navega entre meses y reabre el selector.
function abrirSelectorMes() {
  if (mesActual.value === 1) {
    origenMes.value = 12
    origenAnio.value = anioActual.value - 1
  } else {
    origenMes.value = mesActual.value - 1
    origenAnio.value = anioActual.value
  }
  showSelectorMes.value = true
}

async function ejecutarDuplicar() {
  duplicando.value = true
  try {
    const result = await duplicarMes(origenMes.value, origenAnio.value)
    success(`${result.gastosCopied} gastos copiados correctamente`)
    showSelectorMes.value = false
  } catch (e) {
    const msg = e?.data?.message
      || e?.statusMessage
      || e?.message
      || 'Error al copiar el mes'
    toastError(msg)
  } finally {
    duplicando.value = false
  }
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
  max-height: 300px;
  transform: translateY(0);
}
</style>
