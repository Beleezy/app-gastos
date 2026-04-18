<template>
  <div class="px-4 lg:px-0 pt-0 lg:pt-0 pb-2">
    <!-- Month Selector -->
    <SharedMonthSelector
      :label="`${nombreMes} ${anioActual}`"
      :es-actual="esHoy"
      class="mb-4"
      @prev="mesAnterior"
      @next="mesSiguiente"
      @go-to-current="fetchPlan"
    />

    <!-- Budget Summary Card -->
    <div class="relative bg-gradient-to-br from-theme-card to-theme-card/90 rounded-2xl p-4 space-y-4 border border-theme-border overflow-hidden">
      <!-- Decorative accent -->
      <div class="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent)]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>

      <!-- Income / Budget -->
      <div class="relative flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-accent)]/25 to-indigo-500/15 flex items-center justify-center">
            <span class="text-xs font-bold text-theme-accent leading-none">S/</span>
          </div>
          <span class="text-sm text-theme-text-muted">Presupuesto</span>
        </div>
        <!-- Editable budget -->
        <div v-if="editandoPresupuesto" class="flex items-center gap-1">
          <span class="text-sm text-theme-text-muted">{{ currencySymbol }}</span>
          <input
            ref="inputPresupuesto"
            v-model="presupuestoTemp"
            type="number"
            step="0.01"
            class="w-28 bg-theme-input border border-theme-accent rounded-lg px-2 py-1 text-right text-theme-text text-lg font-bold focus:outline-none"
            @keyup.enter="guardarPresupuesto"
            @blur="guardarPresupuesto"
          />
        </div>
        <div v-else class="flex items-center gap-1.5">
          <button class="text-lg font-bold text-theme-text hover:text-theme-accent-light transition-colors whitespace-nowrap" @click="iniciarEdicion">
            {{ currencySymbol }} {{ formatMonto(resumen.presupuesto) }}
          </button>
          <button
            v-if="presupuestoDefault > 0 && resumen.presupuesto !== presupuestoDefault"
            class="w-6 h-6 flex items-center justify-center rounded-lg bg-theme-accent-bg text-theme-accent hover:bg-theme-accent-bg-hover transition-colors"
            title="Sincronizar con presupuesto predeterminado"
            @click="sincronizarPresupuesto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Divider -->
      <div class="border-t border-theme-border"></div>

      <!-- Stats Row -->
      <div class="relative grid grid-cols-3 gap-1.5">
        <div class="bg-theme-input rounded-xl p-2.5 border border-orange-500/5 min-w-0">
          <p class="text-[10px] text-theme-text-sec mb-1 uppercase tracking-wider leading-none">Planificado</p>
          <p class="text-[13px] font-bold text-orange-400 truncate">{{ formatMonto(resumen.totalPlanificado) }}</p>
        </div>
        <div class="bg-theme-input rounded-xl p-2.5 border min-w-0" :class="resumen.excedeGastoReal ? 'border-red-500/10' : 'border-emerald-500/5'">
          <p class="text-[10px] text-theme-text-sec mb-1 uppercase tracking-wider leading-none">Gastado</p>
          <p class="text-[13px] font-bold truncate" :class="resumen.excedeGastoReal ? 'text-red-400' : 'text-emerald-400'">
            {{ formatMonto(totalGastoReal) }}
          </p>
        </div>
        <div class="bg-theme-input rounded-xl p-2.5 border min-w-0" :class="resumen.saldoReal >= 0 ? 'border-emerald-500/5' : 'border-red-500/10'">
          <p class="text-[10px] text-theme-text-sec mb-1 uppercase tracking-wider leading-none" title="Presupuesto menos gasto real">Disponible</p>
          <p class="text-[13px] font-bold truncate" :class="resumen.saldoReal >= 0 ? 'text-emerald-400' : 'text-red-400'">
            {{ formatMonto(resumen.saldoReal) }}
          </p>
        </div>
      </div>

      <!-- Dual progress: asignado + gastado real overlay -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 text-xs text-theme-text-muted">
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-sm bg-[var(--color-accent)]"></span>Asignado
            </span>
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-sm bg-emerald-400"></span>Gastado
            </span>
          </div>
          <span
            class="text-xs font-semibold px-2 py-0.5 rounded-full"
            :class="resumen.excedeGastoReal ? 'text-red-400 bg-red-500/10' : (resumen.porcentajeAsignado > 90 ? 'text-orange-400 bg-orange-500/10' : 'text-theme-accent bg-theme-accent-bg')"
          >
            {{ resumen.porcentajeAsignado.toFixed(0) }}% / {{ resumen.porcentajeGastadoReal.toFixed(0) }}%
          </span>
        </div>
        <div class="relative w-full h-2.5 bg-theme-input rounded-full overflow-hidden">
          <div
            class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
            :class="resumen.porcentajeAsignado > 90 ? 'bg-gradient-to-r from-orange-500/70 to-orange-400/70' : 'bg-gradient-to-r from-[var(--color-accent-dark)]/70 via-[var(--color-accent)]/70 to-indigo-400/70'"
            :style="{ width: resumen.porcentajeAsignado + '%' }"
          ></div>
          <div
            class="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
            :class="resumen.excedeGastoReal ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
            :style="{ width: resumen.porcentajeGastadoReal + '%' }"
          ></div>
        </div>
      </div>

      <!-- Analítica: proyección, ritmo, delta -->
      <div v-if="analitica.esMesActual && resumen.presupuesto > 0" class="relative space-y-2">
        <!-- Alerta de sobregiro proyectado -->
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
              Al ritmo actual terminarías el mes en {{ currencySymbol }} {{ formatMonto(analitica.proyeccionFinMes) }}
              ({{ currencySymbol }} {{ formatMonto(analitica.excesoProyectado) }} sobre el presupuesto)
            </p>
          </div>
        </div>

        <!-- Ritmo diario + proyección -->
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-theme-input rounded-xl p-2.5">
            <p class="text-[9px] text-theme-text-sec uppercase tracking-wider">Ritmo por día</p>
            <p class="text-sm font-bold text-theme-text mt-0.5">
              {{ currencySymbol }} {{ formatMonto(analitica.ritmoDiarioRecomendado) }}
            </p>
            <p class="text-[9px] text-theme-text-muted leading-tight">
              por {{ analitica.diasRestantes }} día{{ analitica.diasRestantes === 1 ? '' : 's' }} restante{{ analitica.diasRestantes === 1 ? '' : 's' }}
            </p>
          </div>
          <div class="bg-theme-input rounded-xl p-2.5">
            <p class="text-[9px] text-theme-text-sec uppercase tracking-wider">Proyección</p>
            <p
              class="text-sm font-bold mt-0.5"
              :class="analitica.excedeProyeccion ? 'text-red-400' : 'text-theme-text'"
            >
              {{ currencySymbol }} {{ formatMonto(analitica.proyeccionFinMes) }}
            </p>
            <p class="text-[9px] text-theme-text-muted leading-tight">a fin de mes</p>
          </div>
        </div>

        <!-- Delta vs mes anterior -->
        <div
          v-if="analitica.deltaPct !== null"
          class="flex items-center justify-between px-3 py-2 rounded-xl bg-theme-input"
        >
          <span class="text-[10px] text-theme-text-sec uppercase tracking-wider">vs mes anterior</span>
          <div class="flex items-center gap-1">
            <svg
              v-if="analitica.deltaPct > 0"
              xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 11l5-5 5 5M7 17l5-5 5 5" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 13l5 5 5-5M7 7l5 5 5-5" />
            </svg>
            <span class="text-xs font-bold" :class="analitica.deltaPct > 0 ? 'text-red-400' : 'text-emerald-400'">
              {{ analitica.deltaPct > 0 ? '+' : '' }}{{ analitica.deltaPct.toFixed(0) }}%
            </span>
            <span class="text-[10px] text-theme-text-muted">
              ({{ currencySymbol }} {{ formatMonto(analitica.gastoRealMesAnterior) }})
            </span>
          </div>
        </div>
      </div>

      <!-- Paid vs Pending mini stats -->
      <div class="flex items-center justify-between pt-1">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5 bg-emerald-500/8 px-2 py-1 rounded-lg">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span class="text-[11px] text-theme-text-muted">Pagados: <span class="text-emerald-400 font-semibold">{{ resumen.countPagados }}</span></span>
          </div>
          <div class="flex items-center gap-1.5 bg-orange-500/8 px-2 py-1 rounded-lg">
            <span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            <span class="text-[11px] text-theme-text-muted">Pendientes: <span class="text-orange-400 font-semibold">{{ resumen.countPendientes }}</span></span>
          </div>
        </div>
        <!-- Duplicar mes - siempre accesible -->
        <button
          class="flex items-center justify-center gap-1.5 px-2.5 h-7 rounded-lg bg-theme-accent-bg text-theme-accent hover:bg-theme-accent-bg-hover active:scale-95 transition-all border border-theme-accent/10 text-xs font-medium"
          :disabled="duplicando"
          :title="gastosPlaneados.length > 0 ? 'Copiar gastos de otro mes (los duplicados por concepto se omiten)' : 'Copiar gastos de otro mes'"
          @click="showSelectorMes = true"
        >
          <svg v-if="!duplicando" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          <svg v-else class="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          Copiar
        </button>
      </div>
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

async function ejecutarDuplicar() {
  duplicando.value = true
  try {
    const result = await duplicarMes(origenMes.value, origenAnio.value)
    success(`${result.gastosCopied} gastos copiados correctamente`)
    showSelectorMes.value = false
  } catch (e) {
    const msg = e?.data?.message || e?.message || 'Error al copiar el mes'
    toastError(msg)
  } finally {
    duplicando.value = false
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
