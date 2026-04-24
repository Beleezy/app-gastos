<template>
  <div class="px-4 py-2">
    <!-- Cabecera días de la semana -->
    <div class="grid grid-cols-7 mb-1">
      <div v-for="d in DIAS" :key="d" class="text-center text-[10px] font-semibold text-theme-text-sec py-1">
        {{ d }}
      </div>
    </div>

    <!-- Grilla de días -->
    <div class="grid grid-cols-7 gap-1">
      <!-- Celdas vacías antes del día 1 -->
      <div v-for="_ in primerDiaSemana" :key="'e-' + _" class="h-16"></div>

      <!-- Días del mes -->
      <button
        v-for="dia in diasEnMesTotal"
        :key="dia"
        type="button"
        class="h-16 rounded-xl p-1 flex flex-col items-stretch border text-left transition-all active:scale-95"
        :class="claseDia(dia)"
        @click="seleccionarDia(dia)"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-[10px] font-semibold leading-none"
            :class="claseNumero(dia)"
          >{{ dia }}</span>
          <span
            v-if="gastosDelDia(dia).length > 0 && !esDiaSeleccionado(dia)"
            class="text-[8px] font-semibold leading-none"
            :class="esVencidoDia(dia) ? 'text-red-400' : 'text-theme-text-muted'"
          >{{ formatCompact(totalDia(dia)) }}</span>
        </div>

        <!-- Dots por categoría -->
        <div class="flex flex-wrap gap-[2px] mt-1 overflow-hidden flex-1 content-start">
          <span
            v-for="(g, i) in gastosDelDia(dia).slice(0, 6)"
            :key="g.id + '-' + i"
            class="w-1.5 h-1.5 rounded-full"
            :style="{ backgroundColor: g.categoriaColor || '#6b7280' }"
          ></span>
          <span v-if="gastosDelDia(dia).length > 6" class="text-[8px] text-theme-text-muted leading-none">+{{ gastosDelDia(dia).length - 6 }}</span>
        </div>
      </button>
    </div>

    <!-- Panel de día seleccionado -->
    <div v-if="diaSel" class="mt-4 rounded-2xl bg-theme-card border border-theme-border overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2.5 border-b border-theme-border">
        <div>
          <p class="text-xs font-semibold text-theme-text">{{ tituloDiaSel }}</p>
          <p class="text-[10px] text-theme-text-muted">
            {{ gastosDelDia(diaSel).length }} gasto{{ gastosDelDia(diaSel).length === 1 ? '' : 's' }}
            ·
            {{ currencySymbol }} {{ formatMonto(totalDia(diaSel)) }}
          </p>
        </div>
        <button
          class="w-7 h-7 rounded-full text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors flex items-center justify-center"
          @click="diaSel = null"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div v-if="gastosDelDia(diaSel).length === 0" class="px-3 py-6 text-center">
        <p class="text-xs text-theme-text-sec">Sin gastos planificados este día</p>
      </div>
      <div v-else class="divide-y divide-theme-border">
        <div
          v-for="g in gastosDelDia(diaSel)"
          :key="g.id"
          class="px-3 py-2.5"
        >
          <!-- Info + monto + estado -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: g.categoriaColor || '#6b7280' }"></span>
              <div class="min-w-0">
                <p class="text-xs text-theme-text truncate">{{ g.concepto }}</p>
                <p class="text-[10px] text-theme-text-muted truncate">{{ g.categoriaNombre || 'Sin categoría' }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span
                class="text-[9px] px-1.5 py-0.5 rounded-full"
                :class="g.estado === 'pagado' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'"
              >{{ g.estado === 'pagado' ? 'Pagado' : 'Pendiente' }}</span>
              <span class="text-xs font-semibold text-theme-text">{{ currencySymbol }} {{ formatMonto(g.montoEstimado) }}</span>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex justify-end gap-x-3 mt-1.5 pt-1.5 border-t border-theme-border">
            <button
              v-if="g.estado === 'pendiente' && !esCategoriaAhorro(g)"
              class="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-medium"
              title="Marcar como pagado"
              @click="marcarPagadoRapido(g)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Pagar
            </button>
            <button
              class="text-[11px] transition-colors flex items-center gap-1"
              :class="g.gastoRegistradoFecha ? 'text-emerald-400 hover:text-emerald-300' : 'text-orange-400 hover:text-orange-300'"
              @click="emit('registrar', g)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v8m-4-4h8" />
              </svg>
              {{ g.gastoRegistradoFecha ? 'Editar registro' : 'Registrar' }}
            </button>
            <button
              class="text-[11px] text-theme-text-muted hover:text-theme-accent transition-colors flex items-center gap-1"
              @click="emit('editar', g)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <button
              class="text-[11px] text-theme-text-muted hover:text-red-400 transition-colors flex items-center gap-1"
              @click="pedirConfirmarEliminar(g)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm eliminar (gasto simple) -->
    <SharedConfirmDialog
      v-model="showConfirmSimple"
      title="Eliminar gasto"
      :message="gastoParaEliminar ? `¿Eliminar &quot;${gastoParaEliminar.concepto}&quot;? Tendrás 5 segundos para deshacer.` : ''"
      confirm-label="Eliminar"
      variant="danger"
      @confirm="ejecutarEliminarSimple"
    >
      <template #message>
        <p>¿Eliminar "{{ gastoParaEliminar?.concepto }}"? Tendrás 5 segundos para deshacer.</p>
        <p v-if="gastoParaEliminar?.gastoRegistradoFecha" class="mt-3 text-[15px] font-bold text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
          ⚠️ Advertencia: Este gasto ya ha sido registrado. También se eliminará del registro de gastos.
        </p>
      </template>
    </SharedConfirmDialog>

    <!-- Confirm eliminar (gasto recurrente) -->
    <div v-if="showModalRecurrente && gastoParaEliminar" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="cancelarEliminar"></div>
      <div class="relative bg-theme-card rounded-2xl p-5 w-full max-w-sm border border-theme-border">
        <h3 class="text-base font-semibold text-theme-text mb-2">Eliminar gasto recurrente</h3>
        <div class="text-sm text-theme-text-muted mb-5">
          Este gasto se repite en meses futuros. ¿Qué deseas hacer?
          <p v-if="gastoParaEliminar?.gastoRegistradoFecha" class="mt-3 text-[15px] font-bold text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
            ⚠️ Advertencia: Este gasto ya ha sido registrado. También se eliminará del registro de gastos.
          </p>
        </div>
        <div class="space-y-2">
          <button
            class="w-full py-2.5 rounded-xl bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-colors"
            @click="confirmarEliminarRecurrente(true)"
          >
            Eliminar este y todos los futuros
          </button>
          <button
            class="w-full py-2.5 rounded-xl bg-theme-border-md text-theme-text-sec text-sm font-medium hover:bg-primary-600 transition-colors"
            @click="confirmarEliminarRecurrente(false)"
          >
            Eliminar solo este mes
          </button>
          <button
            class="w-full py-2.5 rounded-xl text-theme-text-sec text-sm font-medium hover:text-theme-text-sec transition-colors"
            @click="cancelarEliminar"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Spacer FAB -->
    <div class="h-20"></div>
  </div>
</template>

<script setup>
const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

const emit = defineEmits(['editar', 'registrar'])

const {
  gastosPlaneados,
  mesActual,
  anioActual,
  softDeleteGastoPlaneado,
  deleteGastoPlaneado,
  updateGastoPlaneado,
} = usePlanificador()
const { currencySymbol, formatMonto } = useCurrency()
const { success, show: toastShow } = useToast()

const diasEnMesTotal = computed(() => new Date(anioActual.value, mesActual.value, 0).getDate())

// 0=Lunes … 6=Domingo offset para la grilla (semana empieza en Lunes)
const primerDiaSemana = computed(() => {
  const jsDay = new Date(anioActual.value, mesActual.value - 1, 1).getDay()
  return jsDay === 0 ? 6 : jsDay - 1
})

const hoy = new Date()
function esHoy(dia) {
  return (
    hoy.getDate() === dia &&
    hoy.getMonth() + 1 === mesActual.value &&
    hoy.getFullYear() === anioActual.value
  )
}

function esPasado(dia) {
  const hoyD = new Date(); hoyD.setHours(0, 0, 0, 0)
  const d = new Date(anioActual.value, mesActual.value - 1, dia)
  return d < hoyD
}

const gastosConFecha = computed(() =>
  gastosPlaneados.value
    .filter(g => g.fechaProbablePago)
    .sort((a, b) => (a.fechaProbablePago || '').localeCompare(b.fechaProbablePago || ''))
)

function gastosDelDia(dia) {
  return gastosConFecha.value.filter(g => extraerDia(g.fechaProbablePago) === dia)
}

function totalDia(dia) {
  return gastosDelDia(dia).reduce((s, g) => s + (g.montoEstimado || 0), 0)
}

function esVencidoDia(dia) {
  return esPasado(dia) && gastosDelDia(dia).some(g => g.estado === 'pendiente')
}

function extraerDia(fecha) {
  if (!fecha) return 0
  return parseInt(fecha.split('-')[2])
}

function formatCompact(n) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k'
  return Math.round(n).toString()
}

// Selección de día
const diaSel = ref(null)
function seleccionarDia(dia) { diaSel.value = diaSel.value === dia ? null : dia }
function esDiaSeleccionado(dia) { return diaSel.value === dia }

// Reset cuando cambia el mes
watch([mesActual, anioActual], () => { diaSel.value = null })

const tituloDiaSel = computed(() => {
  if (!diaSel.value) return ''
  const d = new Date(anioActual.value, mesActual.value - 1, diaSel.value)
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${diasSemana[d.getDay()]} ${diaSel.value} de ${meses[d.getMonth()]}`
})

function claseDia(dia) {
  const sel = esDiaSeleccionado(dia)
  if (sel) return 'bg-theme-accent/20 border-theme-accent ring-2 ring-theme-accent/40'
  if (esHoy(dia)) return 'bg-theme-accent-bg border-theme-accent'
  if (esVencidoDia(dia)) return 'bg-red-500/8 border-red-500/30'
  if (gastosDelDia(dia).length > 0) return 'bg-theme-card border-theme-border'
  return 'bg-transparent border-transparent'
}

function claseNumero(dia) {
  if (esHoy(dia)) return 'text-theme-accent'
  if (esVencidoDia(dia)) return 'text-red-400'
  return 'text-theme-text-sec'
}

// ─── Acciones de mantenimiento sobre los gastos del día ──────────────
function esCategoriaAhorro(gasto) {
  const nombre = gasto?.categoriaNombre || ''
  return nombre.toLowerCase() === 'ahorro'
}

async function marcarPagadoRapido(gasto) {
  try {
    await updateGastoPlaneado(gasto.id, { estado: 'pagado' })
    success(`"${gasto.concepto}" marcado como pagado`)
  } catch {
    // error queda en composable
  }
}

const gastoParaEliminar = ref(null)
const showConfirmSimple = ref(false)
const showModalRecurrente = ref(false)
const isEliminarOpen = computed(() => gastoParaEliminar.value !== null)
useOverlayBack(isEliminarOpen, () => { cancelarEliminar() })

function cancelarEliminar() {
  gastoParaEliminar.value = null
  showConfirmSimple.value = false
  showModalRecurrente.value = false
}

function pedirConfirmarEliminar(gasto) {
  gastoParaEliminar.value = gasto
  if (gasto.esRecurrente && gasto.recurrenteGrupoId) {
    showModalRecurrente.value = true
  } else {
    showConfirmSimple.value = true
  }
}

function ejecutarEliminarSimple() {
  const gasto = gastoParaEliminar.value
  if (!gasto) return
  showConfirmSimple.value = false
  gastoParaEliminar.value = null
  const handle = softDeleteGastoPlaneado(gasto.id, 5000)
  if (!handle) return
  toastShow({
    message: `"${gasto.concepto}" eliminado`,
    type: 'info',
    duration: 5000,
    action: {
      label: 'Deshacer',
      onClick: () => {
        if (handle.undo()) success('Restaurado')
      },
    },
  })
}

async function confirmarEliminarRecurrente(incluirFuturos) {
  const gasto = gastoParaEliminar.value
  if (!gasto) return
  showModalRecurrente.value = false
  gastoParaEliminar.value = null
  await deleteGastoPlaneado(gasto.id, incluirFuturos)
}
</script>
