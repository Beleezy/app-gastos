<template>
  <div class="min-h-screen flex flex-col">
    <div class="relative px-5 pt-8 pb-4 overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/15 rounded-full blur-3xl"></div>
      <div class="relative flex items-center gap-3">
        <button
          class="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors shrink-0"
          @click="toggleDrawer"
          aria-label="Abrir menú"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold text-gradient-blue">Presupuestos por categoría</h1>
          <p class="text-[11px] text-theme-text-sec mt-0.5">{{ mesAnioActual }}</p>
        </div>
      </div>
    </div>

    <!-- Resumen -->
    <div class="px-5 lg:px-0 mb-4 grid grid-cols-2 gap-2.5">
      <div class="bg-theme-card rounded-2xl p-3.5 border border-theme-border">
        <p class="text-[10px] text-theme-text-muted font-medium">Presupuestado</p>
        <p class="text-lg font-bold text-theme-text mt-1">{{ currencySymbol }} {{ formatMonto(totalPresupuestado) }}</p>
      </div>
      <div class="bg-theme-card rounded-2xl p-3.5 border border-theme-border">
        <p class="text-[10px] text-theme-text-muted font-medium">Consumido</p>
        <p class="text-lg font-bold mt-1" :class="totalConsumido > totalPresupuestado ? 'text-red-400' : 'text-amber-400'">
          {{ currencySymbol }} {{ formatMonto(totalConsumido) }}
        </p>
      </div>
    </div>

    <!-- Tabla de categorías -->
    <div class="px-5 lg:px-0 mb-4">
      <p class="text-[10px] uppercase tracking-wider text-theme-text-muted mb-2 px-1">Categorías</p>

      <div v-if="cargandoCat || cargandoCons" class="space-y-2">
        <div v-for="i in 4" :key="i" class="h-20 w-full rounded-2xl bg-theme-border-md shimmer"></div>
      </div>

      <div v-else-if="!categorias.length" class="bg-theme-card rounded-2xl border border-theme-border p-6 text-center text-xs text-theme-text-muted">
        Sin categorías. Crea categorías en /categorias primero.
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="c in categoriasOrdenadas"
          :key="c.id"
          class="bg-theme-card rounded-2xl border border-theme-border p-3"
        >
          <div class="flex items-center gap-3 mb-2">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
              :style="{ backgroundColor: (c.color || '#6b7280') + '20' }"
            >{{ c.icono || '📦' }}</div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-theme-text truncate">{{ c.nombre }}</p>
              <p class="text-[10px] text-theme-text-muted">
                <span v-if="!presupuestoDe(c.id)">Sin presupuesto · </span>
                Consumido: {{ currencySymbol }} {{ formatMonto(consumoDe(c.id)) }}
              </p>
            </div>
            <div class="shrink-0 flex items-center gap-1.5">
              <input
                v-model.number="inputsLimite[c.id]"
                type="number"
                step="0.01"
                min="0"
                :placeholder="presupuestoDe(c.id)?.montoMensual?.toString() || '0'"
                class="w-24 bg-theme-input border border-theme-border rounded-lg px-2 py-1.5 text-xs text-theme-text text-right focus:outline-none focus:border-theme-accent"
                @keyup.enter="guardar(c.id)"
                @blur="guardar(c.id)"
              />
              <button
                v-if="presupuestoDe(c.id)"
                class="w-7 h-7 rounded-lg text-theme-text-muted hover:text-red-400 hover:bg-red-500/10"
                @click="quitar(c.id)"
                aria-label="Eliminar presupuesto"
                title="Quitar presupuesto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
          <div v-if="presupuestoDe(c.id)">
            <div class="w-full h-2 bg-theme-input rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="claseSemaforo(c.id)"
                :style="{ width: Math.min(porcentajeUsado(c.id), 100) + '%' }"
              ></div>
            </div>
            <div class="flex items-center justify-between mt-1.5 text-[10px]">
              <span :class="textoSemaforo(c.id)">
                {{ porcentajeUsado(c.id).toFixed(0) }}% del presupuesto
              </span>
              <span class="text-theme-text-muted">
                {{ currencySymbol }} {{ formatMonto(presupuestoDe(c.id).montoMensual - consumoDe(c.id)) }} disponible
              </span>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Alertas activas -->
    <div v-if="alertas.length" class="px-5 lg:px-0 mb-4">
      <p class="text-[10px] uppercase tracking-wider text-theme-text-muted mb-2 px-1">⚠️ Alertas</p>
      <ul class="bg-theme-card rounded-2xl border border-amber-500/30 overflow-hidden">
        <li
          v-for="a in alertas"
          :key="a.categoriaId"
          class="p-3 border-b border-amber-500/10 last:border-b-0 flex items-center gap-3"
        >
          <div class="text-lg">{{ a.icono }}</div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-theme-text">{{ a.nombre }}</p>
            <p class="text-[10px]" :class="a.estado === 'critico' ? 'text-red-400' : 'text-amber-400'">
              {{ a.estado === 'critico' ? `Superaste el presupuesto en ${currencySymbol} ${formatMonto(a.exceso)}` : `Llegaste al ${a.porcentaje.toFixed(0)}% del límite` }}
            </p>
          </div>
        </li>
      </ul>
    </div>

    <!-- Nota integración -->
    <div class="px-5 lg:px-0 mb-8">
      <div class="rounded-2xl border border-dashed border-theme-border bg-theme-card/40 p-3 flex items-start gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-[11px] text-theme-text-muted leading-relaxed">
          <p><strong class="text-theme-text">Submódulo independiente.</strong> Lee categorías y gastos reales (endpoints existentes); los límites viven en localStorage.</p>
          <p class="mt-1">Integraciones planificadas: mostrar el semáforo en /registro al añadir un gasto, badge en BottomNav cuando hay alerta crítica, notificación push al cruzar umbral. Ver <code>docs/INTEGRACION-SUBMODULOS.md</code>.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { MESES } from '~/utils/constants'

const { currencySymbol, formatMonto } = useCurrency()
const { toggle: toggleDrawer } = useMobileDrawer()
const { categorias, fetchCategorias } = useCategorias()
const cargandoCat = ref(true)
const cargandoCons = ref(false)

const {
  items: presupuestos,
  totalPresupuestado, totalConsumido,
  fetchItems: fetchPresupuestos,
  setPresupuesto, eliminarPresupuesto, porCategoria,
  cargarConsumo, consumoDe, porcentajeUsado, estadoSemaforo,
  migrarLocalStorageSiHaceFalta,
} = usePresupuestosCategoria()

const hoy = new Date()
const mesActual = hoy.getMonth() + 1
const anioActual = hoy.getFullYear()
const mesAnioActual = `${MESES[mesActual - 1]} ${anioActual}`

const inputsLimite = ref({})

const categoriasOrdenadas = computed(() => {
  // Primero las que tienen presupuesto, luego por nombre
  return [...categorias.value].sort((a, b) => {
    const aHas = presupuestos.value.some(p => p.categoriaId === a.id)
    const bHas = presupuestos.value.some(p => p.categoriaId === b.id)
    if (aHas && !bHas) return -1
    if (!aHas && bHas) return 1
    return a.nombre.localeCompare(b.nombre)
  })
})

const alertas = computed(() => {
  const out = []
  for (const p of presupuestos.value) {
    const cat = categorias.value.find(c => c.id === p.categoriaId)
    if (!cat) continue
    const estado = estadoSemaforo(p.categoriaId)
    if (estado === 'ok') continue
    const pct = porcentajeUsado(p.categoriaId)
    out.push({
      categoriaId: p.categoriaId,
      nombre: cat.nombre,
      icono: cat.icono || '📦',
      estado,
      porcentaje: pct,
      exceso: consumoDe(p.categoriaId) - p.montoMensual,
    })
  }
  return out.sort((a, b) => b.porcentaje - a.porcentaje)
})

function presupuestoDe(id) { return porCategoria(id) }

function claseSemaforo(id) {
  const e = estadoSemaforo(id)
  if (e === 'critico') return 'bg-red-500'
  if (e === 'alerta') return 'bg-amber-500'
  return 'bg-emerald-500'
}
function textoSemaforo(id) {
  const e = estadoSemaforo(id)
  if (e === 'critico') return 'text-red-400 font-semibold'
  if (e === 'alerta') return 'text-amber-400 font-semibold'
  return 'text-emerald-400'
}

async function guardar(catId) {
  const v = inputsLimite.value[catId]
  if (v == null || v === '') return
  if (Number(v) === 0) {
    await eliminarPresupuesto(catId)
    inputsLimite.value[catId] = ''
    return
  }
  await setPresupuesto({ categoriaId: catId, montoMensual: v })
  await cargarConsumo(mesActual, anioActual)
}

async function quitar(catId) {
  if (!confirm('¿Quitar el presupuesto de esta categoría?')) return
  await eliminarPresupuesto(catId)
  inputsLimite.value[catId] = ''
}

onMounted(async () => {
  try {
    await fetchCategorias()
  } finally {
    cargandoCat.value = false
  }
  // Cargar presupuestos del backend + migrar legacy en paralelo con consumo.
  cargandoCons.value = true
  try {
    await Promise.all([
      (async () => {
        await migrarLocalStorageSiHaceFalta()
        await fetchPresupuestos(true)
      })(),
      cargarConsumo(mesActual, anioActual),
    ])
  } finally {
    cargandoCons.value = false
  }
  // pre-llenar inputs con los presupuestos existentes para edición rápida
  for (const p of presupuestos.value) {
    inputsLimite.value[p.categoriaId] = p.montoMensual
  }
})
</script>
