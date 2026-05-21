<template>
  <div class="min-h-screen flex flex-col">
    <div class="relative px-5 pt-8 pb-4 overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/15 rounded-full blur-3xl"></div>
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
          <h1 class="text-xl font-bold text-gradient-blue">Metas</h1>
          <p class="text-[11px] text-theme-text-sec mt-0.5">Tus objetivos financieros, paso a paso</p>
        </div>
        <button
          class="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30 active:scale-95 transition-transform"
          @click="abrirFormCrear"
          aria-label="Nueva meta"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Resumen global -->
    <div class="px-5 lg:px-0 mb-4 grid grid-cols-2 gap-2.5">
      <div class="bg-theme-card rounded-2xl p-3.5 border border-theme-border">
        <p class="text-[10px] text-theme-text-muted font-medium">Metas activas</p>
        <p class="text-lg font-bold text-emerald-400 mt-1">{{ activas.length }}</p>
      </div>
      <div class="bg-theme-card rounded-2xl p-3.5 border border-theme-border">
        <p class="text-[10px] text-theme-text-muted font-medium">Progreso global</p>
        <p class="text-lg font-bold mt-1" :class="porcentajeGlobal >= 50 ? 'text-emerald-400' : 'text-theme-accent'">{{ porcentajeGlobal.toFixed(0) }}%</p>
        <p class="text-[10px] text-theme-text-muted mt-0.5">
          {{ currencySymbol }} {{ formatMonto(totalProgreso) }} / {{ formatMonto(totalObjetivo) }}
        </p>
      </div>
    </div>

    <!-- Lista de metas -->
    <div class="px-5 lg:px-0 mb-4">
      <div class="flex items-center justify-between mb-2 px-1">
        <p class="text-[10px] uppercase tracking-wider text-theme-text-muted">Metas ({{ listaFiltrada.length }})</p>
        <div class="flex items-center gap-1 bg-theme-card/60 rounded-lg p-0.5 border border-theme-border/50">
          <button
            v-for="t in tabs"
            :key="t.valor"
            @click="tabActual = t.valor"
            class="px-2 py-1 rounded-md text-[10px] font-semibold transition-all"
            :class="tabActual === t.valor ? 'bg-emerald-500 text-white' : 'text-theme-text-muted'"
          >
            {{ t.etiqueta }}
          </button>
        </div>
      </div>

      <div v-if="listaFiltrada.length === 0" class="bg-theme-card rounded-2xl border border-theme-border p-6 text-center">
        <p class="text-xs text-theme-text-muted">{{ items.length === 0 ? 'Sin metas creadas todavía.' : 'Nada en este filtro.' }}</p>
        <button
          v-if="items.length === 0"
          class="mt-3 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
          @click="abrirFormCrear"
        >
          + Crear tu primera meta
        </button>
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="m in listaFiltrada"
          :key="m.id"
          class="bg-theme-card rounded-2xl border border-theme-border p-4"
        >
          <div class="flex items-start gap-3 mb-3">
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
              :style="{ backgroundColor: m.color + '20' }"
            >
              {{ m.icono }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-bold text-theme-text truncate">{{ m.nombre }}</p>
                  <p class="text-[10px] text-theme-text-muted">{{ etiquetaTipo(m.tipo) }}</p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button class="w-7 h-7 rounded-lg text-theme-text-muted hover:text-theme-accent hover:bg-theme-border-md" @click="abrirFormEditar(m)" title="Editar" aria-label="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
                    </svg>
                  </button>
                  <button class="w-7 h-7 rounded-lg text-theme-text-muted hover:text-red-400 hover:bg-red-500/10" @click="confirmarEliminar(m)" title="Eliminar" aria-label="Eliminar">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9M4 7h16M5.79 5.79l1.05 13.883a2.25 2.25 0 002.244 2.077h7.832a2.25 2.25 0 002.244-2.077L20.21 5.79"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="mb-2">
            <div class="flex items-end justify-between mb-1.5">
              <span class="text-base font-bold text-theme-text">{{ currencySymbol }} {{ formatMonto(progresoActual(m)) }}</span>
              <span class="text-[11px] text-theme-text-muted">de {{ currencySymbol }} {{ formatMonto(m.montoObjetivo) }}</span>
            </div>
            <div class="w-full h-2 bg-theme-input rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: porcentajeProgreso(m) + '%', backgroundColor: m.color }"
              ></div>
            </div>
            <div class="flex items-center justify-between mt-1.5 text-[10px]">
              <span :class="porcentajeProgreso(m) >= 100 ? 'text-emerald-400 font-semibold' : 'text-theme-text-muted'">
                {{ porcentajeProgreso(m).toFixed(0) }}%{{ estaCompletada(m) ? ' · ¡Lograda!' : '' }}
              </span>
              <span v-if="m.fechaLimite" :class="diasRestantes(m) < 7 && diasRestantes(m) >= 0 ? 'text-amber-400' : diasRestantes(m) < 0 ? 'text-red-400' : 'text-theme-text-muted'">
                {{ diasRestantes(m) >= 0 ? `${diasRestantes(m)} días restantes` : `Vencida hace ${Math.abs(diasRestantes(m))} días` }}
              </span>
            </div>
          </div>

          <!-- Movimientos -->
          <div class="mt-3 flex items-center gap-2">
            <button
              class="flex-1 px-3 py-2 rounded-xl bg-theme-input text-xs font-semibold text-theme-text hover:bg-theme-border-md transition-colors"
              @click="abrirMovs(m)"
            >
              Movimientos ({{ movimientosDe(m.id).length }})
            </button>
            <button
              class="px-3 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
              :style="{ backgroundColor: m.color }"
              @click="abrirAporte(m)"
            >
              + Aporte
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Nota integración futura -->
    <div class="px-5 lg:px-0 mb-8">
      <div class="rounded-2xl border border-dashed border-theme-border bg-theme-card/40 p-3 flex items-start gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-[11px] text-theme-text-muted leading-relaxed">
          <p><strong class="text-theme-text">Submódulo independiente.</strong> Datos en este dispositivo.</p>
          <p class="mt-1">Integraciones planificadas: auto-tracking desde ahorros, pagos de deuda y registro de gastos. Ver <code>docs/INTEGRACION-SUBMODULOS.md</code>.</p>
        </div>
      </div>
    </div>

    <!-- Form meta -->
    <div v-if="formAbierto" class="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60" @click.self="cerrarForm">
      <div class="w-full max-w-md bg-theme-card rounded-t-3xl lg:rounded-3xl border border-theme-border max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-theme-card border-b border-theme-border px-4 py-3 flex items-center justify-between z-10">
          <p class="text-sm font-bold text-theme-text">{{ form.id ? 'Editar' : 'Nueva' }} meta</p>
          <button class="w-8 h-8 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md" @click="cerrarForm" aria-label="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-4 space-y-3">
          <div>
            <label class="block text-[10px] font-semibold text-theme-text-muted mb-1 uppercase tracking-wider">Tipo</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="t in TIPOS_META"
                :key="t.valor"
                type="button"
                @click="form.tipo = t.valor"
                class="rounded-xl border p-2 text-center transition-all"
                :class="form.tipo === t.valor ? 'border-emerald-400 bg-emerald-500/10' : 'border-theme-border bg-theme-input'"
              >
                <div class="text-lg">{{ t.icono }}</div>
                <p class="text-[10px] font-semibold mt-1 text-theme-text">{{ t.etiqueta }}</p>
              </button>
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-theme-text-muted mb-1 uppercase tracking-wider">Nombre</label>
            <input v-model="form.nombre" type="text" class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-emerald-400" placeholder="Viaje a Cusco, MacBook, salir de deudas..." />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-semibold text-theme-text-muted mb-1 uppercase tracking-wider">Monto objetivo</label>
              <input v-model.number="form.montoObjetivo" type="number" step="0.01" min="0" class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-theme-text-muted mb-1 uppercase tracking-wider">Fecha límite (opcional)</label>
              <input v-model="form.fechaLimite" type="date" class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-semibold text-theme-text-muted mb-1 uppercase tracking-wider">Ícono</label>
              <div class="grid grid-cols-6 gap-1">
                <button v-for="i in ICONOS" :key="i" type="button" @click="form.icono = i" class="aspect-square rounded-lg flex items-center justify-center text-base border transition-all" :class="form.icono === i ? 'bg-emerald-500/10 border-emerald-400' : 'bg-theme-input border-theme-border'">{{ i }}</button>
              </div>
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-theme-text-muted mb-1 uppercase tracking-wider">Color</label>
              <div class="grid grid-cols-4 gap-1">
                <button v-for="c in COLORES" :key="c" type="button" @click="form.color = c" class="aspect-square rounded-lg border-2 transition-all" :style="{ backgroundColor: c }" :class="form.color === c ? 'border-white' : 'border-transparent'"></button>
              </div>
            </div>
          </div>
        </div>
        <div class="sticky bottom-0 bg-theme-card border-t border-theme-border p-4 flex gap-2">
          <button v-if="form.id" class="px-4 py-2.5 rounded-xl bg-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/25" @click="eliminarYCerrar(form.id)">Eliminar</button>
          <div class="flex-1"></div>
          <button class="px-4 py-2.5 rounded-xl bg-theme-input text-theme-text-muted text-xs font-semibold hover:text-theme-text" @click="cerrarForm">Cancelar</button>
          <button class="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50" :disabled="!puedeGuardar" @click="guardar">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal: aporte / movimientos -->
    <div v-if="metaSel" class="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60" @click.self="metaSel = null">
      <div class="w-full max-w-md bg-theme-card rounded-t-3xl lg:rounded-3xl border border-theme-border max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-theme-card border-b border-theme-border px-4 py-3 flex items-center justify-between z-10">
          <div>
            <p class="text-sm font-bold text-theme-text">{{ metaSel.nombre }}</p>
            <p class="text-[10px] text-theme-text-muted">Movimientos</p>
          </div>
          <button class="w-8 h-8 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md" @click="metaSel = null" aria-label="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-4 border-b border-theme-border space-y-3">
          <div class="grid grid-cols-3 gap-2">
            <input v-model.number="aporte.monto" type="number" step="0.01" placeholder="Monto" class="col-span-2 bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-emerald-400" />
            <input v-model="aporte.fecha" type="date" class="bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-emerald-400" />
          </div>
          <input v-model="aporte.nota" type="text" placeholder="Nota (opcional)" class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-emerald-400" />
          <button class="w-full py-2.5 rounded-xl text-xs font-semibold text-white" :style="{ backgroundColor: metaSel.color }" :disabled="!aporte.monto" @click="enviarAporte">Registrar aporte</button>
        </div>
        <ul v-if="movsActuales.length" class="divide-y divide-theme-border/40">
          <li v-for="mv in movsActuales" :key="mv.id" class="px-4 py-3 flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-theme-text">{{ currencySymbol }} {{ formatMonto(mv.monto) }}</p>
              <p class="text-[10px] text-theme-text-muted">{{ mv.fecha }}<span v-if="mv.nota"> · {{ mv.nota }}</span></p>
            </div>
            <button class="w-7 h-7 rounded-lg text-theme-text-muted hover:text-red-400 hover:bg-red-500/10" @click="eliminarMov(mv.id)" aria-label="Eliminar movimiento">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9M4 7h16"/>
              </svg>
            </button>
          </li>
        </ul>
        <p v-else class="px-4 py-6 text-center text-xs text-theme-text-muted">Sin movimientos aún.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { TIPOS_META } from '~/composables/useMetas'

const { currencySymbol, formatMonto } = useCurrency()
const { toggle: toggleDrawer } = useMobileDrawer()
const {
  items, activas, archivadas,
  totalObjetivo, totalProgreso,
  fetchItems, fetchMovimientos,
  crear, actualizar, eliminar,
  registrarMovimiento, eliminarMovimiento,
  movimientosDe, progresoActual, porcentajeProgreso, diasRestantes, estaCompletada,
  migrarLocalStorageSiHaceFalta,
} = useMetas()

const cargandoLista = ref(true)

onMounted(async () => {
  try {
    await migrarLocalStorageSiHaceFalta()
    await fetchItems(true)
  } finally {
    cargandoLista.value = false
  }
})

const ICONOS = ['🎯', '💰', '🏠', '🚗', '✈️', '📚', '💻', '💍', '🏥', '🎓', '🛒', '🎁']
const COLORES = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const tabs = [
  { valor: 'activas', etiqueta: 'Activas' },
  { valor: 'completadas', etiqueta: 'Completadas' },
  { valor: 'todas', etiqueta: 'Todas' },
]
const tabActual = ref('activas')

const listaFiltrada = computed(() => {
  if (tabActual.value === 'activas') return activas.value.filter(m => !estaCompletada(m))
  if (tabActual.value === 'completadas') return items.value.filter(m => estaCompletada(m))
  return items.value
})

const porcentajeGlobal = computed(() => {
  if (!totalObjetivo.value) return 0
  return Math.min(100, (totalProgreso.value / totalObjetivo.value) * 100)
})

const formAbierto = ref(false)
const form = ref(formVacio())

function formVacio() {
  return { id: null, nombre: '', tipo: 'ahorro', montoObjetivo: 0, fechaLimite: '', icono: '🎯', color: '#10b981' }
}

const puedeGuardar = computed(() => form.value.nombre.trim().length > 0 && form.value.montoObjetivo > 0)

function abrirFormCrear() {
  form.value = formVacio()
  formAbierto.value = true
}
function abrirFormEditar(m) {
  form.value = { ...formVacio(), ...m }
  formAbierto.value = true
}
function cerrarForm() { formAbierto.value = false }
function guardar() {
  if (!puedeGuardar.value) return
  if (form.value.id) actualizar(form.value.id, form.value)
  else crear(form.value)
  cerrarForm()
}
function confirmarEliminar(m) {
  if (!confirm(`¿Eliminar "${m.nombre}" y todos sus movimientos?`)) return
  eliminar(m.id)
}
function eliminarYCerrar(id) {
  if (!confirm('¿Eliminar esta meta?')) return
  eliminar(id)
  cerrarForm()
}

function etiquetaTipo(v) {
  return TIPOS_META.find(t => t.valor === v)?.etiqueta || v
}

// Aportes
const metaSel = ref(null)
const aporte = ref({ monto: 0, fecha: new Date().toISOString().slice(0, 10), nota: '' })
const movsActuales = computed(() => metaSel.value ? movimientosDe(metaSel.value.id) : [])

async function abrirMovs(m) {
  metaSel.value = m
  aporte.value = { monto: 0, fecha: new Date().toISOString().slice(0, 10), nota: '' }
  // Cargar movimientos del backend para esta meta (cache local en el composable).
  try { await fetchMovimientos(m.id) } catch (e) { console.warn(e) }
}
function abrirAporte(m) {
  abrirMovs(m)
}
async function enviarAporte() {
  if (!metaSel.value || !aporte.value.monto) return
  await registrarMovimiento(metaSel.value.id, aporte.value)
  aporte.value = { monto: 0, fecha: new Date().toISOString().slice(0, 10), nota: '' }
}
function eliminarMov(id) {
  if (!confirm('¿Eliminar este movimiento?')) return
  eliminarMovimiento(id)
}

void archivadas
</script>
