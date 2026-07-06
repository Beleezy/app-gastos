<template>
  <div class="px-4 py-3">
    <div class="bg-theme-card rounded-2xl p-4">
      <h3 class="text-sm font-semibold text-theme-text mb-4">Distribución por categoría</h3>

      <!-- Empty state -->
      <div v-if="datosGrafico.length === 0" class="text-center py-6">
        <p class="text-theme-text-sec text-sm">Sin datos para mostrar</p>
      </div>

      <!-- Chart -->
      <div v-else class="flex flex-col items-center gap-4">
        <!-- SVG donut -->
        <div class="relative w-32 h-32 shrink-0">
          <svg
            viewBox="0 0 36 36"
            class="w-full h-full -rotate-90"
            role="img"
            :aria-label="`Gráfico de distribución por categoría: ${datosGrafico.length} categorías, total ${currencySymbol} ${formatMonto(resumen.totalPlanificado)}`"
          >
            <circle
              v-for="(seg, idx) in datosGrafico"
              :key="idx"
              cx="18" cy="18" r="14"
              fill="none"
              :stroke="seg.color"
              :stroke-width="segmentoActivo === idx ? 5 : 4"
              pathLength="100"
              :stroke-dasharray="seg.dasharray"
              :stroke-dashoffset="seg.dashoffset"
              stroke-linecap="butt"
              class="cursor-pointer transition-all duration-400"
              :opacity="segmentoActivo !== null && segmentoActivo !== idx ? 0.2 : 1"
              @click="toggleSegmento(idx)"
            />
          </svg>
          <!-- Center text -->
          <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
            <template v-if="segmentoActivo !== null">
              <span class="text-[0.6875rem] text-theme-text-sec leading-tight truncate max-w-full">{{ datosGrafico[segmentoActivo].nombre }}</span>
              <span class="text-xs font-bold text-theme-text leading-tight">{{ datosGrafico[segmentoActivo].porcentaje }}%</span>
              <span class="text-[0.6875rem] text-theme-text-muted leading-tight tabular-nums">{{ currencySymbol }}&nbsp;{{ formatMonto(datosGrafico[segmentoActivo].total) }}</span>
            </template>
            <template v-else>
              <span class="text-xs text-theme-text-sec leading-tight">Total</span>
              <span class="text-sm font-bold text-theme-text leading-tight tabular-nums">{{ currencySymbol }}&nbsp;{{ formatMonto(resumen.totalPlanificado) }}</span>
            </template>
          </div>
        </div>

        <!-- Hint cuando hay filtro activo -->
        <p v-if="segmentoActivo !== null" class="text-center text-[0.6875rem] text-theme-text-muted -mt-2">
          Toca de nuevo para quitar el filtro
        </p>

        <!-- Legend con barras comparativas real vs planificado -->
        <div class="space-y-2 w-full">
          <button
            v-for="(seg, idx) in datosGrafico"
            :key="seg.nombre"
            class="w-full flex flex-col gap-1 px-2 py-1.5 rounded-lg transition-all duration-200 text-left"
            :class="[
              segmentoActivo === idx ? 'bg-theme-border-md' : 'hover:bg-theme-border-md',
              segmentoActivo !== null && segmentoActivo !== idx ? 'opacity-40' : 'opacity-100'
            ]"
            @click="toggleSegmento(idx)"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: seg.color }"></span>
                <span class="text-xs text-theme-text-muted truncate">{{ seg.nombre }}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[0.6875rem] text-theme-text-sec">{{ currencySymbol }}&nbsp;{{ formatMonto(seg.total) }}</span>
                <span class="text-xs font-semibold w-8 text-right" :style="{ color: seg.color }">{{ seg.porcentaje }}%</span>
              </div>
            </div>
            <!-- Comparativa real vs planificado -->
            <div v-if="gastosPorCategoria[idx]?.totalReal > 0" class="flex items-center gap-1.5 w-full">
              <div class="flex-1 h-1 bg-theme-input rounded-full relative overflow-hidden">
                <!-- planned baseline -->
                <div class="absolute inset-y-0 left-0 right-0 opacity-30" :style="{ backgroundColor: seg.color }"></div>
                <!-- real progress -->
                <div
                  class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  :class="gastosPorCategoria[idx].totalReal > seg.total ? 'bg-red-400' : ''"
                  :style="{
                    width: Math.min((gastosPorCategoria[idx].totalReal / seg.total) * 100, 100) + '%',
                    backgroundColor: gastosPorCategoria[idx].totalReal > seg.total ? undefined : seg.color,
                  }"
                ></div>
              </div>
              <span
                class="text-[0.6875rem] font-medium shrink-0 min-w-[50px] text-right"
                :class="gastosPorCategoria[idx].totalReal > seg.total ? 'text-red-400' : 'text-emerald-400'"
              >
                {{ currencySymbol }}&nbsp;{{ formatMonto(gastosPorCategoria[idx].totalReal) }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- Tooltip de segmento activo -->
      <Transition name="tooltip-slide">
        <div
          v-if="segmentoActivo !== null"
          class="mt-3 px-3 py-2 rounded-xl border"
          :style="{ backgroundColor: datosGrafico[segmentoActivo].color + '18', borderColor: datosGrafico[segmentoActivo].color + '40' }"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-theme-text">{{ datosGrafico[segmentoActivo].nombre }}</span>
            <button class="text-theme-text-sec hover:text-theme-text-sec text-xs" @click="segmentoActivo = null">✕</button>
          </div>
          <div class="flex items-center gap-4 mt-1">
            <div>
              <p class="text-[0.6875rem] text-theme-text-sec">Planificado</p>
              <p class="text-sm font-bold text-theme-text">{{ currencySymbol }}&nbsp;{{ formatMonto(datosGrafico[segmentoActivo].total) }}</p>
            </div>
            <div v-if="gastosPorCategoria[segmentoActivo]?.totalReal > 0">
              <p class="text-[0.6875rem] text-theme-text-sec">Gastado</p>
              <p class="text-sm font-bold" :class="gastosPorCategoria[segmentoActivo].totalReal > datosGrafico[segmentoActivo].total ? 'text-red-400' : 'text-emerald-400'">
                {{ currencySymbol }}&nbsp;{{ formatMonto(gastosPorCategoria[segmentoActivo].totalReal) }}
              </p>
            </div>
            <div>
              <p class="text-[0.6875rem] text-theme-text-sec">Del total</p>
              <p class="text-sm font-bold" :style="{ color: datosGrafico[segmentoActivo].color }">{{ datosGrafico[segmentoActivo].porcentaje }}%</p>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Lista de gastos de la categoría activa (fuera del card del gráfico para ancho completo) -->
    <Transition name="tooltip-slide">
      <div
        v-if="segmentoActivo !== null && gastosDelSegmento.length > 0"
        class="mt-3"
      >
        <div class="px-1 mb-2 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: datosGrafico[segmentoActivo].color }"></span>
          <p class="text-[0.6875rem] font-semibold text-theme-text-sec uppercase tracking-wider">
            Gastos de {{ datosGrafico[segmentoActivo].nombre }} ({{ gastosDelSegmento.length }})
          </p>
        </div>
        <div class="space-y-2">
            <div
              v-for="g in gastosDelSegmento"
              :key="g.id"
              class="bg-theme-card rounded-xl p-3.5 border-l-[3px] border border-theme-border transition-all"
              :class="
                g.estado === 'pagado' ? 'border-l-emerald-500' :
                esVencido(g) ? 'border-l-red-500' :
                esHoyGasto(g) && g.estado === 'pendiente' ? 'border-l-orange-500' :
                'border-l-orange-400/50'
              "
            >
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-3 min-w-0">
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    :style="{ backgroundColor: datosGrafico[segmentoActivo].color + '26' }"
                  >
                    <span class="text-base">{{ getEmoji(datosGrafico[segmentoActivo].nombre) }}</span>
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-theme-text truncate">{{ g.concepto }}</p>
                    <p class="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span class="inline-flex items-center gap-1 text-theme-text-sec">
                        <span class="w-1.5 h-1.5 rounded-full inline-block" :style="{ backgroundColor: datosGrafico[segmentoActivo].color }"></span>
                        {{ datosGrafico[segmentoActivo].nombre }}
                      </span>
                      <span
                        class="inline-flex items-center gap-1 font-medium"
                        :class="esVencido(g) ? 'text-red-400' : (esHoyGasto(g) && g.estado === 'pendiente' ? 'text-orange-400' : 'text-theme-text-sec')"
                        :title="formatFecha(g.fechaProbablePago)"
                      >
                        <svg v-if="esVencido(g)" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.19 16a2 2 0 001.74 3z" />
                        </svg>
                        {{ fechaRelativa(g.fechaProbablePago) }}
                      </span>
                    </p>
                    <div v-if="g.notas" class="text-[0.6875rem] text-theme-text-muted mt-1 line-clamp-2">{{ g.notas }}</div>
                    <div v-if="g.esRecurrente" class="flex items-center gap-1 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span class="text-[0.6875rem] text-theme-accent">Recurrente</span>
                    </div>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-sm font-semibold text-theme-text">{{ currencySymbol }}&nbsp;{{ formatMonto(g.montoEstimado) }}</p>
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium mt-1 transition-colors"
                    :class="g.estado === 'pagado' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'"
                  >
                    {{ g.estado === 'pagado' ? 'Pagado' : 'Pendiente' }}
                  </span>
                  <p v-if="g.gastoRegistradoFecha" class="mt-1 text-[0.6875rem] text-theme-text-sec">
                    Registrado: {{ formatFecha(g.gastoRegistradoFecha) }}
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap justify-end items-center gap-x-3 gap-y-1.5 mt-2 pt-2 border-t border-theme-border">
                <button
                  v-if="g.estado === 'pendiente'"
                  class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-medium"
                  :title="esCategoriaAhorro(g) ? 'Registrar pago de ahorro' : 'Marcar como pagado con el monto estimado y la fecha de hoy'"
                  @click="esCategoriaAhorro(g) ? emit('registrar', g) : marcarPagadoRapido(g)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Pagar
                </button>
                <button
                  class="text-xs transition-colors flex items-center gap-1"
                  :class="g.gastoRegistradoFecha ? 'text-emerald-400 hover:text-emerald-300' : 'text-orange-400 hover:text-orange-300'"
                  @click="emit('registrar', g)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v8m-4-4h8" />
                  </svg>
                  {{ g.gastoRegistradoFecha ? 'Editar registro' : 'Registrar' }}
                </button>
                <button
                  class="text-xs text-theme-text-muted hover:text-theme-accent transition-colors flex items-center gap-1"
                  @click="emit('editar', g)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
                <button
                  class="text-xs text-theme-text-muted hover:text-red-400 transition-colors flex items-center gap-1"
                  @click="pedirConfirmarEliminar(g)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

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
        <p v-if="gastoParaEliminar?.gastoRegistradoFecha" class="mt-3 text-[0.9375rem] font-bold text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
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
          <p v-if="gastoParaEliminar?.gastoRegistradoFecha" class="mt-3 text-[0.9375rem] font-bold text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
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
  </div>
</template>

<script setup>
const emit = defineEmits(['editar', 'registrar'])

const {
  datosGrafico,
  resumen,
  gastosPorCategoria,
  softDeleteGastoPlaneado,
  deleteGastoPlaneado,
  updateGastoPlaneado,
} = usePlanificador()
const { currencySymbol, formatMonto } = useCurrency()
const { success, show: toastShow } = useToast()

const segmentoActivo = ref(null)

function toggleSegmento(idx) {
  segmentoActivo.value = segmentoActivo.value === idx ? null : idx
}

const gastosDelSegmento = computed(() => {
  if (segmentoActivo.value === null) return []
  const cat = gastosPorCategoria.value[segmentoActivo.value]
  if (!cat) return []
  // Orden por fecha (los sin fecha al final), luego por monto desc
  return [...cat.gastos].sort((a, b) => {
    const fa = a.fechaProbablePago || '9999'
    const fb = b.fechaProbablePago || '9999'
    if (fa !== fb) return fa.localeCompare(fb)
    return (b.montoEstimado || 0) - (a.montoEstimado || 0)
  })
})

function formatFechaCorta(fecha) {
  if (!fecha) return 'Sin fecha'
  const d = new Date(fecha + 'T00:00:00')
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate()} ${meses[d.getMonth()]}`
}

function formatFecha(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha + 'T00:00:00')
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${d.getDate()} de ${meses[d.getMonth()]}, ${d.getFullYear()}`
}

function hoyISO() {
  return useFechaPeru().fechaHoy()
}

function esVencido(gasto) {
  return gasto.estado === 'pendiente' && gasto.fechaProbablePago && gasto.fechaProbablePago < hoyISO()
}

function esHoyGasto(gasto) {
  return gasto.fechaProbablePago === hoyISO()
}

function diasDesdeHoy(fecha) {
  if (!fecha) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const d = new Date(fecha + 'T00:00:00')
  return Math.round((d - hoy) / 86400000)
}

function fechaRelativa(fecha) {
  if (!fecha) return 'Sin fecha'
  const diff = diasDesdeHoy(fecha)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  if (diff > 1 && diff <= 7) return `En ${diff} días`
  if (diff < -1 && diff >= -30) return `Vencido hace ${Math.abs(diff)} días`
  return formatFechaCorta(fecha)
}

const { getCategoriaIcono } = useCategorias()
function getEmoji(nombre) {
  return getCategoriaIcono(nombre)
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

<style scoped>
.tooltip-slide-enter-active { transition: all 0.2s ease-out; }
.tooltip-slide-leave-active { transition: all 0.15s ease-in; }
.tooltip-slide-enter-from { opacity: 0; transform: translateY(-4px); }
.tooltip-slide-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
