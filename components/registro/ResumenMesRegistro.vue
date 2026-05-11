<template>
  <div
    class="relative bg-gradient-to-br from-theme-card/80 to-theme-card/60 rounded-2xl border border-theme-border px-4 py-3.5 overflow-hidden"
  >
    <div
      class="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl pointer-events-none transition-colors duration-500"
      :class="excedido ? 'bg-red-500/10' : porcentaje > 70 ? 'bg-amber-500/10' : 'bg-theme-accent-bg'"
    ></div>

    <!-- Fila principal: GASTADO + monto + meta + chevron -->
    <button
      class="relative w-full flex items-start gap-3 text-left group"
      :aria-expanded="detallesAbierto"
      aria-label="Ver detalle del resumen"
      @click="toggleDetalles"
    >
      <!-- Lado izquierdo: GASTADO + monto -->
      <div class="flex-1 min-w-0">
        <p class="text-[0.6rem] text-theme-text-sec uppercase tracking-wider font-semibold mb-0.5">
          Gastado
        </p>
        <p
          class="text-3xl font-bold leading-none tabular-nums"
          :class="excedido ? 'text-red-400' : 'text-gradient-blue'"
        >
          {{ formatMonto(totalMes) }}
        </p>
      </div>

      <!-- Lado derecho: meta / % / restante -->
      <div class="flex flex-col items-end justify-start text-right shrink-0 pt-0.5">
        <p v-if="presupuesto > 0" class="text-[0.7rem] text-theme-text-sec leading-tight">
          de {{ formatMonto(presupuesto) }}
        </p>
        <p v-else class="text-[0.7rem] text-theme-text-muted leading-tight italic">
          Sin presupuesto
        </p>

        <div v-if="presupuesto > 0" class="flex items-center gap-1.5 mt-0.5">
          <span
            class="text-sm font-bold tabular-nums leading-none"
            :class="excedido ? 'text-red-400' : porcentaje > 70 ? 'text-amber-400' : 'text-emerald-400'"
          >
            {{ porcentaje.toFixed(0) }}%
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4 text-theme-text-sec transition-transform duration-200 shrink-0"
            :class="detallesAbierto ? 'rotate-180' : ''"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <p
          v-if="presupuesto > 0"
          class="text-[0.7rem] font-semibold tabular-nums mt-0.5 leading-tight"
          :class="excedido ? 'text-red-400' : 'text-emerald-400'"
        >
          {{ excedido ? '+' : '' }}{{ formatMonto(Math.abs(saldo)) }} {{ excedido ? 'excedido' : 'restante' }}
        </p>

        <!-- Si no hay presupuesto, mostrar solo el chevron -->
        <svg
          v-if="presupuesto <= 0"
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 text-theme-text-sec transition-transform duration-200 mt-1"
          :class="detallesAbierto ? 'rotate-180' : ''"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>

    <!-- Barra de progreso -->
    <div v-if="presupuesto > 0 && !editando" class="relative mt-3">
      <div class="w-full h-1.5 bg-theme-input rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-700 ease-out"
          :class="excedido
            ? 'bg-gradient-to-r from-red-500 to-rose-400'
            : porcentaje > 70
              ? 'bg-gradient-to-r from-amber-500 to-amber-400'
              : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
          :style="{ width: Math.min(porcentaje, 100) + '%' }"
        ></div>
      </div>
    </div>

    <!-- Edit presupuesto inline -->
    <div v-if="editando" class="relative mt-3 flex items-center gap-2 px-1">
      <span class="text-xs text-theme-text-sec">Presupuesto:</span>
      <span class="text-sm text-theme-text-muted">{{ currencySymbol }}</span>
      <input
        ref="inputRef"
        v-model="presupuestoTemp"
        type="number"
        step="0.01"
        class="flex-1 bg-theme-input border border-theme-accent rounded-lg px-2 py-1 text-theme-text text-sm font-bold focus:outline-none"
        @keyup.enter="guardar"
        @keyup.escape="cancelarEdicion"
        @blur="guardar"
      />
    </div>

    <!-- Detalle expandible -->
    <Transition name="cat-expand">
      <div v-if="detallesAbierto" class="relative mt-3 pt-3 border-t border-theme-border/40 space-y-3 overflow-hidden">
        <!-- Hoy + acciones -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-baseline gap-2 min-w-0">
            <span class="text-[0.6rem] text-theme-text-sec uppercase tracking-wider font-semibold">Hoy</span>
            <span class="text-base font-bold text-theme-text tabular-nums">{{ formatMonto(totalDia) }}</span>
            <span class="text-[0.65rem] text-theme-text-sec truncate">
              · {{ gastosHoyCount }} {{ gastosHoyCount === 1 ? 'gasto' : 'gastos' }}
            </span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              class="px-2.5 py-1 rounded-lg text-[0.65rem] font-semibold uppercase tracking-wider text-theme-accent bg-theme-accent-bg border border-theme-accent/40 hover:bg-theme-accent-bg-hover active:scale-95 transition-all"
              @click.stop="iniciarEdicion"
            >
              Editar
            </button>
            <button
              v-if="presupuestoDefault > 0 && presupuesto !== presupuestoDefault"
              class="px-2 py-1 rounded-lg text-theme-text-sec hover:text-theme-accent hover:bg-theme-input transition-colors"
              aria-label="Sincronizar con presupuesto por defecto"
              @click.stop="onSincronizar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Ritmo de gasto / proyeccion -->
        <div
          v-if="mostrarProyeccion"
          class="rounded-xl border px-3 py-2.5 flex items-start gap-2.5"
          :class="[
            excedeProyeccion
              ? 'border-red-500/30 bg-red-500/8'
              : vaBien
                ? 'border-emerald-500/30 bg-emerald-500/8'
                : 'border-theme-accent/30 bg-theme-accent-bg/40'
          ]"
        >
          <div
            class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            :class="excedeProyeccion ? 'bg-red-500/15 text-red-400' : vaBien ? 'bg-emerald-500/15 text-emerald-400' : 'bg-theme-accent-bg text-theme-accent'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-[0.65rem] uppercase tracking-wider font-semibold text-theme-text-sec mb-0.5">
              Ritmo de gasto
            </p>
            <p class="text-xs text-theme-text leading-snug">
              A este ritmo gastarias <span class="font-bold tabular-nums">{{ currencySymbol }} {{ formatMonto(proyeccion) }}</span> este mes.
            </p>
            <p v-if="excedeProyeccion" class="text-xs font-semibold text-red-400 mt-0.5">
              Excederias el presupuesto.
            </p>
            <p v-else-if="vaBien" class="text-xs font-semibold text-emerald-400 mt-0.5">
              Vas bien.
            </p>
          </div>
        </div>

        <!-- Por categoria -->
        <div v-if="categoriasResumen.length > 0">
          <p class="text-[0.65rem] uppercase tracking-wider font-semibold text-theme-text-sec mb-1.5 px-1">
            Por categoria
          </p>
          <ul class="space-y-0.5">
            <li
              v-for="cat in categoriasTop"
              :key="cat.nombre"
              class="flex items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-theme-input/30 transition-colors"
            >
              <span class="text-base shrink-0" :style="{ color: cat.color }">{{ cat.icono || '●' }}</span>
              <span class="text-sm font-medium text-theme-text flex-1 min-w-0">
                {{ cat.nombre }}
              </span>
              <span class="text-sm font-semibold text-theme-text tabular-nums shrink-0">
                {{ currencySymbol }} {{ formatMonto(cat.total) }}
              </span>
            </li>
            <li
              v-if="categoriasResumen.length > maxCategorias"
              class="flex items-center gap-2 px-1 py-1.5"
            >
              <span class="text-base shrink-0 text-theme-text-muted">{{ '●' }}</span>
              <span class="text-sm font-medium text-theme-text-sec flex-1">
                Otros ({{ categoriasResumen.length - maxCategorias }})
              </span>
              <span class="text-sm font-semibold text-theme-text-sec tabular-nums shrink-0">
                {{ currencySymbol }} {{ formatMonto(otrosTotal) }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
const props = defineProps({
  totalMes: { type: Number, default: 0 },
  totalDia: { type: Number, default: 0 },
  gastosHoyCount: { type: Number, default: 0 },
  presupuesto: { type: Number, default: 0 },
  presupuestoDefault: { type: Number, default: 0 },
  categoriasResumen: { type: Array, default: () => [] },
  esMesActual: { type: Boolean, default: false },
  diasTranscurridos: { type: Number, default: 0 },
  diasDelMes: { type: Number, default: 30 },
})

const emit = defineEmits(['update:presupuesto'])

const { currencySymbol, formatMonto } = useCurrency()

const STORAGE_KEY = 'registro:resumen-detalles-expanded'
const MAX_CATEGORIAS_VISIBLES = 5
const maxCategorias = MAX_CATEGORIAS_VISIBLES

// ─── Edit presupuesto ────────────────────────────────────
const editando = ref(false)
const presupuestoTemp = ref(0)
const inputRef = ref(null)

function iniciarEdicion() {
  presupuestoTemp.value = props.presupuesto
  editando.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function guardar() {
  if (!editando.value) return
  const monto = parseFloat(presupuestoTemp.value)
  if (!isNaN(monto) && monto >= 0) {
    emit('update:presupuesto', monto)
  }
  editando.value = false
}

function cancelarEdicion() {
  editando.value = false
}

function onSincronizar() {
  emit('update:presupuesto', props.presupuestoDefault)
}

// ─── Calculados ──────────────────────────────────────────
import { calcularPresupuesto } from '~/composables/usePresupuestoCalc'

const calc = computed(() =>
  calcularPresupuesto({
    presupuesto: props.presupuesto,
    gastado: props.totalMes,
    diasTranscurridos: props.diasTranscurridos,
    diasMes: props.diasDelMes,
  }),
)

const porcentaje = computed(() => calc.value.porcentaje)
const saldo = computed(() => props.presupuesto - props.totalMes)
const excedido = computed(() => props.presupuesto > 0 && saldo.value < 0)
const proyeccion = computed(() => calc.value.proyeccionMes)

const mostrarProyeccion = computed(() =>
  props.esMesActual
  && props.presupuesto > 0
  && props.diasTranscurridos > 0
  && props.totalMes > 0
)

const excedeProyeccion = computed(() => calc.value.proyectadoSobrepaso)

const vaBien = computed(() =>
  proyeccion.value > 0 && proyeccion.value < props.presupuesto * 0.85
)

// ─── Detalles colapsable ──────────────────────────────────
const detallesAbierto = ref(false)

onMounted(() => {
  if (process.client) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved !== null) detallesAbierto.value = saved === 'true'
    } catch {}
  }
})

function toggleDetalles() {
  if (editando.value) return
  detallesAbierto.value = !detallesAbierto.value
  if (process.client) {
    try {
      localStorage.setItem(STORAGE_KEY, String(detallesAbierto.value))
    } catch {}
  }
}

const categoriasTop = computed(() =>
  props.categoriasResumen.slice(0, MAX_CATEGORIAS_VISIBLES)
)

const otrosTotal = computed(() => {
  if (props.categoriasResumen.length <= MAX_CATEGORIAS_VISIBLES) return 0
  return props.categoriasResumen
    .slice(MAX_CATEGORIAS_VISIBLES)
    .reduce((s, c) => s + (c.total || 0), 0)
})
</script>

<style scoped>
.cat-expand-enter-active, .cat-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.cat-expand-enter-from, .cat-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.cat-expand-enter-to, .cat-expand-leave-from {
  opacity: 1;
  max-height: 600px;
}
</style>
