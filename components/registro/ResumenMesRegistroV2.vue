<!--
  ResumenMesRegistroV2 — versión rediseñada del resumen del mes en /registro.

  Cambios respecto a V1 (ResumenMesRegistro.vue):
    • Hero único: monto gastado grande (.text-hero), sub-línea de presupuesto/restante,
      barra de progreso continua. No más botón colapsable ambiguo — todo a la vista.
    • Chip "Proyección" siempre visible (V1 lo escondía bajo "Ver más").
    • Top categorías separadas en su propia sección con avatares 36px (V1: lista 16px).
    • Editar presupuesto inline directo desde el chip.

  Mismas props/emits que V1.
-->
<template>
  <div
    class="relative bg-gradient-to-br from-theme-card to-theme-card/85 rounded-3xl border border-theme-accent/15 p-5 overflow-hidden"
    data-testid="resumen-mes-registro-v2"
  >
    <div
      class="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-colors duration-500"
      :class="excedido ? 'bg-red-500/15' : porcentaje > 70 ? 'bg-amber-500/15' : 'bg-theme-accent/10'"
    ></div>

    <!-- Hero -->
    <div class="relative">
      <p class="text-hero-label">Gastado este mes</p>
      <div class="flex items-baseline gap-1 mt-1.5">
        <span class="text-xl font-medium text-theme-text-muted">{{ currencySymbol }}</span>
        <span
          class="text-hero tabular-nums"
          :class="excedido ? 'text-red-400' : 'text-theme-text'"
          data-testid="monto-gastado-mes"
        >{{ formatMonto(totalMes) }}</span>
      </div>

      <p v-if="presupuesto > 0" class="text-sm text-theme-text-sec mt-1">
        de <strong class="text-theme-text font-semibold">{{ currencySymbol }} {{ formatMonto(presupuesto) }}</strong>
        ·
        <strong
          class="font-semibold"
          :class="excedido ? 'text-red-400' : 'text-emerald-400'"
        >
          {{ currencySymbol }} {{ formatMonto(Math.abs(saldo)) }} {{ excedido ? 'excedido' : 'restante' }}
        </strong>
      </p>
      <p v-else class="text-sm text-theme-text-muted italic mt-1">Sin presupuesto definido</p>
    </div>

    <!-- Progress -->
    <div v-if="presupuesto > 0 && !editando" class="relative mt-4">
      <div class="w-full h-2.5 bg-theme-input rounded-full overflow-hidden">
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
      <div class="flex items-center justify-between mt-1.5">
        <span class="text-[11px] font-bold tabular-nums"
          :class="excedido ? 'text-red-400' : porcentaje > 70 ? 'text-amber-400' : 'text-emerald-400'"
        >{{ porcentaje.toFixed(0) }}%</span>
        <button
          class="text-xs text-theme-accent font-semibold hover:text-theme-accent-light tap-44 transition-colors"
          @click="iniciarEdicion"
        >Editar presupuesto</button>
      </div>
    </div>

    <!-- Edit inline -->
    <div v-if="editando" class="relative mt-4 flex items-center gap-2">
      <span class="text-sm text-theme-text-muted">{{ currencySymbol }}</span>
      <input
        ref="inputRef"
        v-model="presupuestoTemp"
        type="number"
        step="0.01"
        class="flex-1 h-12 bg-theme-input border border-theme-accent rounded-xl px-3 text-theme-text text-base font-bold focus:outline-none"
        @keyup.enter="guardar"
        @keyup.escape="cancelarEdicion"
        @blur="guardar"
      />
      <button
        v-if="presupuestoDefault > 0 && presupuesto !== presupuestoDefault"
        class="px-3 h-10 rounded-lg bg-theme-accent-bg text-theme-accent text-xs font-medium hover:bg-theme-accent-bg-hover transition-colors tap-44"
        @click="onSincronizar"
      >Por defecto</button>
    </div>

    <!-- Insights row: Proyección + Hoy (SIEMPRE visibles) -->
    <div class="relative mt-4 pt-4 border-t border-theme-border flex flex-wrap gap-x-4 gap-y-2">
      <span class="inline-flex items-center gap-1.5 text-xs">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="text-theme-text-muted">Hoy</span>
        <strong class="text-theme-text tabular-nums">{{ currencySymbol }} {{ formatMonto(totalDia) }}</strong>
        <span class="text-theme-text-muted">· {{ gastosHoyCount }} {{ gastosHoyCount === 1 ? 'gasto' : 'gastos' }}</span>
      </span>

      <span
        v-if="mostrarProyeccion"
        class="inline-flex items-center gap-1.5 text-xs"
        :class="excedeProyeccion ? 'text-red-400' : vaBien ? 'text-emerald-400' : 'text-theme-text-sec'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span class="font-medium">Proyección</span>
        <strong class="font-semibold tabular-nums">{{ currencySymbol }} {{ formatMonto(proyeccion) }}</strong>
        <span v-if="excedeProyeccion" class="font-medium">· excedería</span>
        <span v-else-if="vaBien" class="font-medium">· vas bien</span>
      </span>
    </div>

    <!-- Top categorías (siempre visibles, no requieren click) -->
    <div v-if="categoriasTop.length > 0" class="relative mt-4 pt-4 border-t border-theme-border">
      <p class="text-hero-label mb-3">Top categorías</p>
      <ul class="space-y-1.5">
        <li
          v-for="cat in categoriasTop"
          :key="cat.nombre"
          class="flex items-center gap-3"
        >
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
            :style="{ backgroundColor: cat.color + '22', color: cat.color }"
          >{{ cat.icono || '●' }}</div>
          <span class="text-sm font-medium text-theme-text flex-1 min-w-0 truncate">{{ cat.nombre }}</span>
          <span class="text-sm font-bold text-theme-text tabular-nums shrink-0">
            {{ currencySymbol }} {{ formatMonto(cat.total) }}
          </span>
        </li>
        <li
          v-if="categoriasResumen.length > maxCategorias"
          class="flex items-center gap-3 pt-1"
        >
          <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-theme-border-md/60 text-theme-text-muted">⋯</div>
          <span class="text-sm text-theme-text-sec flex-1">Otros ({{ categoriasResumen.length - maxCategorias }})</span>
          <span class="text-sm font-semibold text-theme-text-sec tabular-nums shrink-0">
            {{ currencySymbol }} {{ formatMonto(otrosTotal) }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { calcularPresupuesto } from '~/composables/usePresupuestoCalc'

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

const MAX_CATEGORIAS_VISIBLES = 4
const maxCategorias = MAX_CATEGORIAS_VISIBLES

const editando = ref(false)
const presupuestoTemp = ref(0)
const inputRef = ref(null)

function iniciarEdicion() {
  presupuestoTemp.value = props.presupuesto
  editando.value = true
  nextTick(() => { inputRef.value?.focus(); inputRef.value?.select() })
}

function guardar() {
  if (!editando.value) return
  const m = parseFloat(presupuestoTemp.value)
  if (!isNaN(m) && m >= 0) emit('update:presupuesto', m)
  editando.value = false
}

function cancelarEdicion() { editando.value = false }

function onSincronizar() { emit('update:presupuesto', props.presupuestoDefault) }

const calc = computed(() =>
  calcularPresupuesto({
    presupuesto: props.presupuesto,
    gastado: props.totalMes,
    diasTranscurridos: props.diasTranscurridos,
    diasMes: props.diasDelMes,
  })
)
const porcentaje = computed(() => calc.value.porcentaje)
const saldo = computed(() => props.presupuesto - props.totalMes)
const excedido = computed(() => props.presupuesto > 0 && saldo.value < 0)
const proyeccion = computed(() => calc.value.proyeccionMes)
const mostrarProyeccion = computed(() =>
  props.esMesActual && props.presupuesto > 0 && props.diasTranscurridos > 0 && props.totalMes > 0
)
const excedeProyeccion = computed(() => calc.value.proyectadoSobrepaso)
const vaBien = computed(() => proyeccion.value > 0 && proyeccion.value < props.presupuesto * 0.85)

const categoriasTop = computed(() => props.categoriasResumen.slice(0, MAX_CATEGORIAS_VISIBLES))
const otrosTotal = computed(() => {
  if (props.categoriasResumen.length <= MAX_CATEGORIAS_VISIBLES) return 0
  return props.categoriasResumen.slice(MAX_CATEGORIAS_VISIBLES).reduce((s, c) => s + (c.total || 0), 0)
})
</script>
