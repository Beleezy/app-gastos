<template>
  <div class="px-4 pt-3 pb-32">
    <PreviewPageHeader icon="📋" title="Planificador" subtitle="Tu presupuesto y gastos del mes" />

    <PreviewMonthNav :label="mesLabel" @prev="cambiar(-1)" @next="cambiar(1)" />

    <div v-if="loading" class="space-y-3">
      <div class="h-36 rounded-2xl bg-theme-card shimmer"></div>
      <div class="h-28 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <!-- Resumen del presupuesto -->
      <div class="rounded-3xl border border-theme-border bg-gradient-to-br from-theme-card to-theme-card/60 p-4 mb-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted">Presupuesto</p>
          <span class="text-[0.68rem] text-theme-text-sec tabular-nums shrink-0">{{ pctAsignado.toFixed(0) }}% asignado</span>
        </div>
        <PreviewMoney :value="presupuesto" class="text-[1.7rem] font-extrabold text-gradient-blue block mt-1" />
        <div class="h-2 w-full rounded-full bg-theme-input overflow-hidden mt-3">
          <div
            class="h-full rounded-full transition-all duration-700"
            :class="pctAsignado > 100 ? 'bg-gradient-to-r from-red-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
            :style="{ width: Math.min(pctAsignado, 100) + '%' }"
          ></div>
        </div>
        <div class="grid grid-cols-2 gap-2.5 mt-3">
          <div class="rounded-xl bg-theme-input p-3 min-w-0">
            <p class="text-[0.62rem] uppercase tracking-wide text-theme-text-muted">Asignado</p>
            <PreviewMoney :value="totalAsignado" entero class="text-base font-bold text-theme-text block mt-0.5" />
          </div>
          <div class="rounded-xl bg-theme-input p-3 min-w-0">
            <p class="text-[0.62rem] uppercase tracking-wide text-theme-text-muted">Saldo proyectado</p>
            <PreviewMoney :value="saldo" entero tone="auto" class="text-base font-bold block mt-0.5" />
          </div>
        </div>
        <div class="flex items-center gap-3 mt-3 text-[0.72rem]">
          <span class="text-emerald-400 font-medium">● {{ countPagados }} pagados</span>
          <span class="text-amber-400 font-medium">● {{ countPendientes }} pendientes</span>
        </div>
      </div>

      <!-- Gastos planificados agrupados por categoría -->
      <div v-if="grupos.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
        <p class="text-sm text-theme-text">Sin gastos planificados este mes</p>
        <button class="mt-3 min-h-[44px] px-4 rounded-xl bg-theme-accent text-theme-on-accent text-sm font-semibold active:scale-[0.98] transition-transform" @click="abrirNuevo">
          + Planificar un gasto
        </button>
      </div>
      <div v-else class="space-y-3">
        <section v-for="g in grupos" :key="g.nombre" class="rounded-2xl border border-theme-border bg-theme-card overflow-hidden">
          <div class="flex items-center justify-between gap-2 px-4 py-2.5 bg-theme-input/40">
            <span class="flex items-center gap-2 min-w-0">
              <span class="text-base shrink-0">{{ g.icono || '📦' }}</span>
              <span class="text-sm font-semibold text-theme-text truncate">{{ g.nombre }}</span>
            </span>
            <PreviewMoney :value="g.total" entero class="text-sm font-bold text-theme-text shrink-0" />
          </div>
          <div class="divide-y divide-theme-border/50">
            <!-- Fila apilada con acciones reales: pagar (pendientes) y editar -->
            <div v-for="item in g.items" :key="item.id" class="px-4 py-3">
              <p class="text-sm text-theme-text leading-snug line-clamp-2 break-words">{{ item.concepto }}</p>
              <div class="flex items-center justify-between gap-2 mt-1.5">
                <span class="flex items-center gap-1.5 min-w-0">
                  <span
                    class="text-[0.62rem] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                    :class="item.estado === 'pagado' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'"
                  >{{ item.estado === 'pagado' ? 'Pagado' : 'Pendiente' }}</span>
                  <span class="text-[0.66rem] text-theme-text-muted truncate">{{ fechaCorta(item.fechaProbablePago) }}</span>
                </span>
                <PreviewMoney :value="item.montoEstimado" class="text-sm font-semibold text-theme-text shrink-0" />
              </div>
              <div class="flex items-center justify-end gap-2 mt-2">
                <button
                  v-if="item.estado !== 'pagado'"
                  class="min-h-[40px] px-3 rounded-lg bg-emerald-500/15 text-emerald-400 text-[0.74rem] font-semibold active:scale-[0.97] transition-transform"
                  @click="abrirPago(item)"
                >✓ Registrar pago</button>
                <button
                  class="min-h-[40px] px-3 rounded-lg bg-theme-input text-theme-text-sec text-[0.74rem] font-medium active:scale-[0.97] transition-transform"
                  @click="abrirEdicion(item)"
                >Editar</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <!-- FAB: nuevo gasto planificado con el formulario REAL -->
    <button
      class="fixed bottom-24 right-4 z-20 w-14 h-14 rounded-full bg-theme-accent text-theme-on-accent shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      aria-label="Agregar gasto planificado"
      @click="abrirNuevo"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
    </button>

    <PlanificadorFormGastoPlaneado
      v-if="formAbierto"
      :gasto-editar="gastoEditar"
      @close="cerrarForms"
      @saved="onGuardado"
    />
    <PlanificadorFormRegistrarPago
      v-if="gastoPagar"
      :gasto="gastoPagar"
      @close="cerrarForms"
      @saved="onGuardado"
    />
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()
// El mes/año del preview vive en el estado compartido del planificador:
// así el formulario real (day-picker) crea los gastos en el mes que se
// está viendo, igual que en producción.
const { mesActual, anioActual, fetchCategorias } = usePlanificador()

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const loading = ref(true)
const plan = ref(null)
const gastos = ref([])

const formAbierto = ref(false)
const gastoEditar = ref(null)
const gastoPagar = ref(null)

const mesLabel = computed(() => `${MESES[mesActual.value - 1]} ${anioActual.value}`)
const presupuesto = computed(() => Number(plan.value?.montoPresupuesto) || 0)
const totalAsignado = computed(() => gastos.value.reduce((s, g) => s + (Number(g.montoEstimado) || 0), 0))
const saldo = computed(() => presupuesto.value - totalAsignado.value)
const pctAsignado = computed(() => (presupuesto.value > 0 ? (totalAsignado.value / presupuesto.value) * 100 : 0))
const countPagados = computed(() => gastos.value.filter(g => g.estado === 'pagado').length)
const countPendientes = computed(() => gastos.value.length - countPagados.value)

function fechaCorta(f) {
  if (!f) return ''
  const [, m, d] = f.split('-').map(Number)
  return `${d} ${MES_CORTO[m - 1]}`
}

const grupos = computed(() => {
  const map = new Map()
  for (const g of gastos.value) {
    const k = g.categoriaNombre || 'Sin categoría'
    if (!map.has(k)) map.set(k, { nombre: k, icono: g.categoriaIcono, total: 0, items: [] })
    const grp = map.get(k)
    grp.items.push(g)
    grp.total += Number(g.montoEstimado) || 0
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
})

function abrirNuevo() {
  gastoEditar.value = null
  formAbierto.value = true
}
function abrirEdicion(item) {
  gastoEditar.value = item
  formAbierto.value = true
}
function abrirPago(item) {
  gastoPagar.value = item
}
function cerrarForms() {
  formAbierto.value = false
  gastoEditar.value = null
  gastoPagar.value = null
}
function onGuardado() {
  cerrarForms()
  cargar()
}

function cambiar(delta) {
  let m = mesActual.value + delta
  let a = anioActual.value
  if (m < 1) { m = 12; a-- }
  if (m > 12) { m = 1; a++ }
  mesActual.value = m; anioActual.value = a
  cargar()
}

async function cargar() {
  loading.value = true
  try {
    const r = await apiFetch('/api/planificador', { query: { mes: mesActual.value, anio: anioActual.value } })
    plan.value = r.plan || null
    gastos.value = Array.isArray(r.gastos) ? r.gastos : []
  } catch {
    plan.value = null; gastos.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  cargar()
  // Las categorías las necesita el formulario real.
  fetchCategorias?.().catch?.(() => {})
})
</script>
