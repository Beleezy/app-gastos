<template>
  <div class="relative bg-gradient-to-br from-theme-card/80 to-theme-card/60 rounded-2xl border border-theme-border px-4 py-4 overflow-hidden">
    <div class="absolute -top-8 -right-8 w-32 h-32 bg-theme-accent-bg rounded-full blur-2xl pointer-events-none"></div>

    <!-- Header con titulo y boton de menu visible -->
    <div class="relative flex items-center justify-between mb-2.5">
      <p class="text-[0.65rem] text-theme-text-sec uppercase tracking-wider font-semibold">
        Resumen del mes
      </p>
      <button
        ref="kebabBtn"
        class="flex items-center gap-1 px-2 py-1 rounded-lg text-[0.65rem] font-semibold uppercase tracking-wider text-theme-accent bg-theme-accent-bg border border-theme-accent/40 hover:bg-theme-accent-bg-hover active:scale-95 transition-all"
        aria-label="Opciones del resumen"
        @click="toggleMenu"
      >
        Editar
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <Transition name="menu">
        <div
          v-if="showMenu"
          ref="menuEl"
          class="absolute right-0 top-9 min-w-[200px] rounded-xl bg-theme-card border border-theme-border shadow-xl shadow-black/30 py-1.5 z-30"
        >
          <button
            class="w-full px-3 py-2 text-left text-sm text-theme-text hover:bg-theme-input flex items-center gap-2"
            @click="onEditarPresupuesto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar presupuesto
          </button>
          <button
            v-if="presupuestoDefault > 0 && presupuesto !== presupuestoDefault"
            class="w-full px-3 py-2 text-left text-sm text-theme-text hover:bg-theme-input flex items-center gap-2"
            @click="onSincronizar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sincronizar con default
          </button>
        </div>
      </Transition>
    </div>

    <!-- Fila superior: Este mes (7/12) + Hoy (5/12) -->
    <div class="relative grid grid-cols-12 gap-2 mb-3">
      <!-- Este mes -->
      <div class="col-span-7 rounded-xl bg-theme-input/30 px-3 py-2.5">
        <p class="text-[0.6rem] text-theme-text-sec uppercase tracking-wider font-semibold mb-1">Este mes</p>
        <p class="text-2xl font-bold text-gradient-blue leading-tight tabular-nums">
          {{ formatMonto(totalMes) }}
        </p>
        <p
          v-if="presupuesto > 0"
          class="text-xs mt-1 font-medium"
          :class="saldo >= 0 ? 'text-emerald-400' : 'text-red-400'"
        >
          {{ formatMonto(Math.abs(saldo)) }} {{ saldo >= 0 ? 'restante' : 'excedido' }}
        </p>
        <p v-else class="text-xs mt-1 text-theme-text-muted">Sin presupuesto</p>
      </div>

      <!-- Hoy (mas pequeno) -->
      <div class="col-span-5 rounded-xl bg-theme-input/30 px-3 py-2.5">
        <p class="text-[0.6rem] text-theme-text-sec uppercase tracking-wider font-semibold mb-1">Hoy</p>
        <p class="text-lg font-bold text-theme-text leading-tight tabular-nums">
          {{ formatMonto(totalDia) }}
        </p>
        <p class="text-[0.65rem] mt-1 text-theme-text-sec">
          {{ gastosHoyCount }} {{ gastosHoyCount === 1 ? 'gasto' : 'gastos' }}
        </p>
      </div>
    </div>

    <!-- Edit presupuesto inline -->
    <div v-if="editando" class="relative mb-3 flex items-center gap-2 px-1">
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

    <!-- Barra de progreso del presupuesto -->
    <div v-if="presupuesto > 0 && !editando" class="relative mb-3">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-[0.65rem] text-theme-text-sec font-medium">
          Presupuesto {{ currencySymbol }} {{ formatMonto(presupuesto) }}
        </span>
        <span
          class="text-[0.65rem] font-semibold"
          :class="porcentaje > 90 ? 'text-red-400' : porcentaje > 70 ? 'text-amber-400' : 'text-emerald-400'"
        >
          {{ porcentaje.toFixed(0) }}% usado
        </span>
      </div>
      <div class="w-full h-2 bg-theme-input rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-700 ease-out"
          :class="porcentaje > 90 ? 'bg-gradient-to-r from-red-500 to-red-400' : porcentaje > 70 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'"
          :style="{ width: Math.min(porcentaje, 100) + '%' }"
        ></div>
      </div>
    </div>

    <!-- Ver mas (desglozable: proyeccion + categorias) -->
    <div v-if="puedeMostrarDetalles" class="relative">
      <div class="border-t border-theme-border/40 pt-2.5">
        <button
          class="w-full flex items-center justify-between gap-2 px-1 py-1 rounded-lg hover:bg-theme-input/30 transition-colors"
          :aria-expanded="detallesAbierto"
          @click="toggleDetalles"
        >
          <span class="text-[0.65rem] uppercase tracking-wider font-semibold text-theme-accent">
            {{ detallesAbierto ? 'Ver menos' : 'Ver mas' }}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-3.5 h-3.5 text-theme-accent transition-transform duration-200"
            :class="detallesAbierto ? 'rotate-180' : ''"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <Transition name="cat-expand">
          <div v-if="detallesAbierto" class="mt-2 space-y-3 overflow-hidden">
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
                <p
                  v-if="excedeProyeccion"
                  class="text-xs font-semibold text-red-400 mt-0.5"
                >
                  Excederias el presupuesto.
                </p>
                <p
                  v-else-if="vaBien"
                  class="text-xs font-semibold text-emerald-400 mt-0.5"
                >
                  Vas bien.
                </p>
              </div>
            </div>

            <!-- Por categoria: solo nombre + monto -->
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
                  <span class="text-base shrink-0" :style="{ color: cat.color }">{{ cat.icono || '\u25CF' }}</span>
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
                  <span class="text-base shrink-0 text-theme-text-muted">{{ '\u25CF' }}</span>
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
    </div>
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

// ─── Kebab menu ───────────────────────────────────────────
const showMenu = ref(false)
const menuEl = ref(null)
const kebabBtn = ref(null)

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function closeMenu() {
  showMenu.value = false
}

function onEditarPresupuesto() {
  closeMenu()
  iniciarEdicion()
}

function onSincronizar() {
  closeMenu()
  emit('update:presupuesto', props.presupuestoDefault)
}

function handleClickOutside(event) {
  if (!showMenu.value) return
  if (menuEl.value?.contains(event.target)) return
  if (kebabBtn.value?.contains(event.target)) return
  closeMenu()
}

onMounted(() => {
  if (process.client) document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  if (process.client) document.removeEventListener('click', handleClickOutside)
})

// ─── Calculados ───────────────────────────────────────────
const porcentaje = computed(() => {
  if (props.presupuesto <= 0) return 0
  return (props.totalMes / props.presupuesto) * 100
})

const saldo = computed(() => props.presupuesto - props.totalMes)

const proyeccion = computed(() => {
  if (props.diasTranscurridos <= 0) return 0
  return (props.totalMes / props.diasTranscurridos) * props.diasDelMes
})

const mostrarProyeccion = computed(() =>
  props.esMesActual
  && props.presupuesto > 0
  && props.diasTranscurridos > 0
  && props.totalMes > 0
)

const excedeProyeccion = computed(() =>
  proyeccion.value > props.presupuesto
)

const vaBien = computed(() =>
  proyeccion.value > 0 && proyeccion.value < props.presupuesto * 0.85
)

const puedeMostrarDetalles = computed(() =>
  mostrarProyeccion.value || props.categoriasResumen.length > 0
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
.menu-enter-active, .menu-leave-active {
  transition: all 0.15s ease;
}
.menu-enter-from, .menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.96);
}

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
