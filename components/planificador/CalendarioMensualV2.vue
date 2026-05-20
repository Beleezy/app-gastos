<!--
  CalendarioMensualV2 — versión rediseñada del calendario del Planificador.

  Cambios visuales respecto a V1 (CalendarioMensual.vue):
    • Celdas mínimo 64px (V1: 56px) con texto 12–15px (V1: 8–10px).
    • Barra inferior con color de categoría dominante (V1: dots tipo fueguitos).
    • "Hoy" con borde accent 2px + tinte (V1: solo color).
    • Total compacto con tabular-nums centrado.
    • Panel del día seleccionado: avatar de categoría 44px + chevron acción + mejor jerarquía.

  Lógica idéntica a V1: usePlanificador, useCurrency, useOverlayBack, useToast.
  Mismo contrato de emits (editar, registrar).
-->
<template>
  <div class="px-4 py-2">
    <!-- Cabecera días de la semana -->
    <div class="grid grid-cols-7 mb-2">
      <div v-for="d in DIAS" :key="d" class="text-center text-xs font-semibold text-theme-text-muted uppercase tracking-wider py-1">
        {{ d }}
      </div>
    </div>

    <!-- Grilla de días -->
    <div class="grid grid-cols-7 gap-1.5">
      <div v-for="_ in primerDiaSemana" :key="'e-' + _" class="h-16"></div>

      <button
        v-for="dia in diasEnMesTotal"
        :key="dia"
        type="button"
        class="relative h-16 rounded-xl p-1.5 flex flex-col text-left transition-all active:scale-95 border-2"
        :class="claseDia(dia)"
        @click="seleccionarDia(dia)"
      >
        <div class="flex items-center justify-center">
          <span class="text-[15px] font-bold leading-none tabular-nums" :class="claseNumero(dia)">
            {{ dia }}
          </span>
        </div>
        <span
          v-if="gastosDelDia(dia).length > 0 && !esDiaSeleccionado(dia)"
          class="text-[11px] font-semibold leading-none text-center mt-1 tabular-nums"
          :class="esVencidoDia(dia) ? 'text-red-400' : 'text-theme-text'"
        >{{ formatCompact(totalDia(dia)) }}</span>

        <!-- Barra de categoría dominante (sustituye dots) -->
        <div
          v-if="gastosDelDia(dia).length > 0"
          class="absolute left-1.5 right-1.5 bottom-1 h-1 rounded-full overflow-hidden flex"
        >
          <span
            v-for="(seg, i) in segmentosDia(dia)"
            :key="i"
            class="block h-full"
            :style="{ backgroundColor: seg.color, width: seg.pct + '%' }"
          ></span>
        </div>
      </button>
    </div>

    <!-- Panel de día seleccionado -->
    <div v-if="diaSel" class="mt-4 rounded-2xl bg-theme-card border border-theme-border overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-theme-border">
        <div>
          <p class="text-base font-semibold text-theme-text">{{ tituloDiaSel }}</p>
          <p class="text-xs text-theme-text-muted mt-0.5">
            {{ gastosDelDia(diaSel).length }} gasto{{ gastosDelDia(diaSel).length === 1 ? '' : 's' }}
            ·
            <span class="font-semibold text-theme-text">{{ currencySymbol }} {{ formatMonto(totalDia(diaSel)) }}</span>
          </p>
        </div>
        <button
          class="w-9 h-9 rounded-full text-theme-text-muted hover:text-theme-text bg-theme-border-md/50 hover:bg-theme-border-md flex items-center justify-center tap-44 transition-colors"
          aria-label="Cerrar día"
          @click="diaSel = null"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div v-if="gastosDelDia(diaSel).length === 0" class="px-3 py-8 text-center">
        <p class="text-sm text-theme-text-sec">Sin gastos planificados este día</p>
      </div>

      <ul v-else class="divide-y divide-theme-border">
        <li v-for="g in gastosDelDia(diaSel)" :key="g.id" class="px-4 py-3">
          <div class="flex items-center gap-3">
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-base"
              :style="{ backgroundColor: (g.categoriaColor || '#6b7280') + '26', color: g.categoriaColor || '#9ca3af' }"
            >●</div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-theme-text truncate">{{ g.concepto }}</p>
              <p class="text-xs text-theme-text-muted truncate">{{ g.categoriaNombre || 'Sin categoría' }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm font-bold text-theme-text tabular-nums">{{ currencySymbol }} {{ formatMonto(g.montoEstimado) }}</p>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1"
                :class="g.estado === 'pagado' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'"
              >{{ g.estado === 'pagado' ? 'Pagado' : 'Pendiente' }}</span>
            </div>
          </div>

          <!-- Acciones rápidas en chips de 44px -->
          <div class="flex flex-wrap gap-2 mt-3">
            <button
              v-if="g.estado === 'pendiente' && !esCategoriaAhorro(g)"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 active:scale-95 transition-all tap-44"
              @click="marcarPagadoRapido(g)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Pagar
            </button>
            <button
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-80 active:scale-95 transition-all tap-44"
              :class="g.gastoRegistradoFecha ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'"
              @click="emit('registrar', g)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v8m-4-4h8" />
              </svg>
              {{ g.gastoRegistradoFecha ? 'Editar registro' : 'Registrar' }}
            </button>
            <button
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-theme-input text-theme-text-sec text-xs font-semibold hover:bg-theme-border-md active:scale-95 transition-all tap-44"
              @click="emit('editar', g)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <button
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 active:scale-95 transition-all tap-44"
              @click="pedirConfirmarEliminar(g)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Confirm eliminar (gasto simple) — idéntico a V1 -->
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

    <!-- Confirm eliminar (gasto recurrente) — idéntico a V1 -->
    <div v-if="showModalRecurrente && gastoParaEliminar" class="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="cancelarEliminar"></div>
      <div class="relative bg-theme-card rounded-2xl p-5 w-full max-w-sm border border-theme-border">
        <h3 class="text-base font-semibold text-theme-text mb-2">Eliminar gasto recurrente</h3>
        <div class="text-sm text-theme-text-muted mb-5">
          Este gasto se repite en meses futuros. ¿Qué deseas hacer?
        </div>
        <div class="space-y-2">
          <button class="w-full py-3 rounded-xl bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-colors tap-44" @click="confirmarEliminarRecurrente(true)">
            Eliminar este y todos los futuros
          </button>
          <button class="w-full py-3 rounded-xl bg-theme-border-md text-theme-text-sec text-sm font-medium hover:bg-primary-600 transition-colors tap-44" @click="confirmarEliminarRecurrente(false)">
            Eliminar solo este mes
          </button>
          <button class="w-full py-3 rounded-xl text-theme-text-sec text-sm font-medium tap-44" @click="cancelarEliminar">
            Cancelar
          </button>
        </div>
      </div>
    </div>

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

const primerDiaSemana = computed(() => {
  const jsDay = new Date(anioActual.value, mesActual.value - 1, 1).getDay()
  return jsDay === 0 ? 6 : jsDay - 1
})

const hoy = new Date()
function esHoy(dia) {
  return hoy.getDate() === dia && hoy.getMonth() + 1 === mesActual.value && hoy.getFullYear() === anioActual.value
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

// Segmentos: agrupa gastos del día por categoría → barra inferior proporcional
function segmentosDia(dia) {
  const gastos = gastosDelDia(dia)
  if (!gastos.length) return []
  const total = gastos.reduce((s, g) => s + (g.montoEstimado || 0), 0) || 1
  const porCat = new Map()
  for (const g of gastos) {
    const key = g.categoriaId || g.categoriaColor || 'otros'
    const acc = porCat.get(key) || { color: g.categoriaColor || '#6b7280', total: 0 }
    acc.total += g.montoEstimado || 0
    porCat.set(key, acc)
  }
  return [...porCat.values()].map(s => ({ color: s.color, pct: (s.total / total) * 100 }))
}

const diaSel = ref(null)
function seleccionarDia(dia) { diaSel.value = diaSel.value === dia ? null : dia }
function esDiaSeleccionado(dia) { return diaSel.value === dia }

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
  if (sel) return 'bg-theme-accent/20 border-theme-accent ring-2 ring-theme-accent/30'
  if (esHoy(dia)) return 'bg-theme-accent-bg border-theme-accent'
  if (esVencidoDia(dia)) return 'bg-red-500/10 border-red-500/40'
  if (gastosDelDia(dia).length > 0) return 'bg-theme-card border-theme-border'
  return 'bg-theme-card/30 border-transparent'
}

function claseNumero(dia) {
  if (esHoy(dia)) return 'text-theme-accent'
  if (esVencidoDia(dia)) return 'text-red-400'
  return 'text-theme-text-sec'
}

function esCategoriaAhorro(gasto) {
  const nombre = gasto?.categoriaNombre || ''
  return nombre.toLowerCase() === 'ahorro'
}

async function marcarPagadoRapido(gasto) {
  try {
    await updateGastoPlaneado(gasto.id, { estado: 'pagado' })
    success(`"${gasto.concepto}" marcado como pagado`)
  } catch {
    /* error en composable */
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
      onClick: () => { if (handle.undo()) success('Restaurado') },
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
