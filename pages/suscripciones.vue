<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <div class="relative px-5 pt-8 pb-4 overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-theme-accent-bg rounded-full blur-3xl"></div>
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
          <h1 class="text-xl font-bold text-gradient-blue">Suscripciones</h1>
          <p class="text-[11px] text-theme-text-sec mt-0.5">Servicios recurrentes y próximos cobros</p>
        </div>
        <button
          class="w-9 h-9 rounded-xl bg-theme-accent text-theme-on-accent flex items-center justify-center shrink-0 shadow-md shadow-theme-accent/30 active:scale-95 transition-transform"
          @click="abrirFormCrear"
          aria-label="Nueva suscripción"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="px-5 lg:px-0 mb-4 grid grid-cols-3 gap-2.5">
      <div class="bg-theme-card rounded-2xl p-3.5 border border-theme-border">
        <p class="text-[10px] text-theme-text-muted font-medium">Activas</p>
        <p class="text-lg font-bold text-theme-accent mt-1">{{ activas.length }}</p>
      </div>
      <div class="bg-theme-card rounded-2xl p-3.5 border border-theme-border">
        <p class="text-[10px] text-theme-text-muted font-medium">Mensual</p>
        <p class="text-lg font-bold text-rose-400 mt-1">{{ currencySymbol }} {{ formatMonto(totalMensual) }}</p>
      </div>
      <div class="bg-theme-card rounded-2xl p-3.5 border border-theme-border">
        <p class="text-[10px] text-theme-text-muted font-medium">Anual</p>
        <p class="text-lg font-bold text-rose-400 mt-1">{{ currencySymbol }} {{ formatMonto(totalAnual) }}</p>
      </div>
    </div>

    <!-- Próximos 30 días -->
    <div v-if="proximos30Dias.length" class="px-5 lg:px-0 mb-4">
      <p class="text-[10px] uppercase tracking-wider text-theme-text-muted mb-2 px-1">Próximos 30 días</p>
      <div class="bg-theme-card rounded-2xl border border-theme-border overflow-hidden">
        <ul class="divide-y divide-theme-border/40">
          <li
            v-for="s in proximos30Dias"
            :key="`p-${s.id}`"
            class="p-3 flex items-center gap-3"
          >
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
              :style="{ backgroundColor: s.color + '20' }"
            >
              {{ s.icono }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-theme-text truncate">{{ s.nombre }}</p>
              <p class="text-[10px] text-theme-text-muted">
                {{ s.diasRestantes === 0 ? 'Hoy' : s.diasRestantes === 1 ? 'Mañana' : `En ${s.diasRestantes} días` }}
                · {{ fechaCorta(s.proxima) }}
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs font-bold text-rose-400">{{ currencySymbol }} {{ formatMonto(s.monto) }}</p>
              <p class="text-[9px] text-theme-text-muted">{{ etiquetaPeriodo(s.periodicidad) }}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Lista completa -->
    <div class="px-5 lg:px-0 mb-4">
      <div class="flex items-center justify-between mb-2 px-1">
        <p class="text-[10px] uppercase tracking-wider text-theme-text-muted">Todas ({{ items.length }})</p>
        <div class="flex items-center gap-1 bg-theme-card/60 rounded-lg p-0.5 border border-theme-border/50">
          <button
            v-for="t in tabs"
            :key="t.valor"
            @click="tabActual = t.valor"
            class="px-2 py-1 rounded-md text-[10px] font-semibold transition-all"
            :class="tabActual === t.valor ? 'bg-theme-accent text-theme-on-accent' : 'text-theme-text-muted'"
          >
            {{ t.etiqueta }}
          </button>
        </div>
      </div>

      <div v-if="listaFiltrada.length === 0" class="bg-theme-card rounded-2xl border border-theme-border p-6 text-center">
        <p class="text-xs text-theme-text-muted">{{ items.length === 0 ? 'Aún no tienes suscripciones registradas.' : 'Nada en este filtro.' }}</p>
        <button
          v-if="items.length === 0"
          class="mt-3 text-[11px] text-theme-accent hover:text-theme-accent-light font-semibold"
          @click="abrirFormCrear"
        >
          + Crear la primera
        </button>
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="s in listaFiltrada"
          :key="s.id"
          class="bg-theme-card rounded-2xl border border-theme-border p-3 flex items-center gap-3"
          :class="s.activa === false ? 'opacity-60' : ''"
        >
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            :style="{ backgroundColor: s.color + '20' }"
          >
            {{ s.icono }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-theme-text truncate">{{ s.nombre }}</p>
            <p class="text-[10px] text-theme-text-muted">
              {{ etiquetaPeriodo(s.periodicidad) }} · {{ currencySymbol }} {{ formatMonto(proyMensual(s)) }}/mes
            </p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              class="w-7 h-7 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors"
              @click="pausarReanudar(s.id)"
              :title="s.activa === false ? 'Reanudar' : 'Pausar'"
              :aria-label="s.activa === false ? 'Reanudar suscripción' : 'Pausar suscripción'"
            >
              <svg v-if="s.activa === false" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
            </button>
            <button
              class="w-7 h-7 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-accent hover:bg-theme-border-md transition-colors"
              @click="abrirFormEditar(s)"
              aria-label="Editar suscripción"
              title="Editar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
              </svg>
            </button>
            <button
              class="w-7 h-7 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
              @click="confirmarEliminar(s)"
              aria-label="Eliminar suscripción"
              title="Eliminar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M4 7h16M5.79 5.79l1.05 13.883a2.25 2.25 0 002.244 2.077h7.832a2.25 2.25 0 002.244-2.077L20.21 5.79"/>
              </svg>
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Nota integración futura -->
    <div class="px-5 lg:px-0 mb-8">
      <div class="rounded-2xl border border-dashed border-theme-border bg-theme-card/40 p-3 flex items-start gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-accent mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-[11px] text-theme-text-muted leading-relaxed">
          <p><strong class="text-theme-text">Submódulo independiente.</strong> Datos en este dispositivo (localStorage).</p>
          <p class="mt-1">Integraciones planificadas: generar gastos planificados automáticamente al acercarse el cobro, sumar al "Gasto del mes" del dashboard, recordatorios push antes del cobro. Ver <code>docs/INTEGRACION-SUBMODULOS.md</code>.</p>
        </div>
      </div>
    </div>

    <!-- Form modal -->
    <div
      v-if="formAbierto"
      class="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60"
      @click.self="cerrarForm"
    >
      <div class="w-full max-w-md bg-theme-card rounded-t-3xl lg:rounded-3xl border border-theme-border max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-theme-card border-b border-theme-border px-4 py-3 flex items-center justify-between z-10">
          <p class="text-sm font-bold text-theme-text">{{ form.id ? 'Editar' : 'Nueva' }} suscripción</p>
          <button class="w-8 h-8 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md" @click="cerrarForm" aria-label="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="p-4 space-y-3">
          <div>
            <label class="block text-[10px] font-semibold text-theme-text-muted mb-1 uppercase tracking-wider">Nombre</label>
            <input
              v-model="form.nombre"
              type="text"
              placeholder="Netflix, Spotify, gimnasio..."
              class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-theme-accent"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-semibold text-theme-text-muted mb-1 uppercase tracking-wider">Monto</label>
              <input
                v-model.number="form.monto"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-theme-accent"
              />
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-theme-text-muted mb-1 uppercase tracking-wider">Periodicidad</label>
              <select
                v-model="form.periodicidad"
                class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-theme-accent"
              >
                <option v-for="p in PERIODICIDADES" :key="p.valor" :value="p.valor">{{ p.etiqueta }}</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-semibold text-theme-text-muted mb-1 uppercase tracking-wider">Próximo cobro</label>
            <input
              v-model="form.fechaInicio"
              type="date"
              class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-theme-accent"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-semibold text-theme-text-muted mb-1 uppercase tracking-wider">Ícono</label>
              <div class="grid grid-cols-6 gap-1">
                <button
                  v-for="i in ICONOS"
                  :key="i"
                  type="button"
                  @click="form.icono = i"
                  class="aspect-square rounded-lg flex items-center justify-center text-base border transition-all"
                  :class="form.icono === i ? 'bg-theme-accent-bg border-theme-accent' : 'bg-theme-input border-theme-border'"
                >{{ i }}</button>
              </div>
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-theme-text-muted mb-1 uppercase tracking-wider">Color</label>
              <div class="grid grid-cols-4 gap-1">
                <button
                  v-for="c in COLORES"
                  :key="c"
                  type="button"
                  @click="form.color = c"
                  class="aspect-square rounded-lg border-2 transition-all"
                  :style="{ backgroundColor: c }"
                  :class="form.color === c ? 'border-white' : 'border-transparent'"
                ></button>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-semibold text-theme-text-muted mb-1 uppercase tracking-wider">Notas (opcional)</label>
            <textarea
              v-model="form.notas"
              rows="2"
              class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-accent resize-none"
              placeholder="Detalles extra..."
            ></textarea>
          </div>
        </div>

        <div class="sticky bottom-0 bg-theme-card border-t border-theme-border p-4 flex gap-2">
          <button
            v-if="form.id"
            class="px-4 py-2.5 rounded-xl bg-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/25"
            @click="eliminarYCerrar(form.id)"
          >
            Eliminar
          </button>
          <div class="flex-1"></div>
          <button
            class="px-4 py-2.5 rounded-xl bg-theme-input text-theme-text-muted text-xs font-semibold hover:text-theme-text"
            @click="cerrarForm"
          >Cancelar</button>
          <button
            class="px-4 py-2.5 rounded-xl bg-theme-accent text-theme-on-accent text-xs font-semibold disabled:opacity-50"
            :disabled="!puedeGuardar"
            @click="guardar"
          >Guardar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { PERIODICIDADES, proximaFechaCobro, proyeccionMensual } from '~/composables/useSuscripciones'

const { currencySymbol, formatMonto } = useCurrency()
const { toggle: toggleDrawer } = useMobileDrawer()
const {
  items, activas, totalMensual, totalAnual, proximos30Dias,
  fetchItems, crear, actualizar, eliminar, pausarReanudar,
  migrarLocalStorageSiHaceFalta,
} = useSuscripciones()

const cargandoLista = ref(true)

onMounted(async () => {
  try {
    await migrarLocalStorageSiHaceFalta()
    await fetchItems(true)
  } finally {
    cargandoLista.value = false
  }
})

const ICONOS = ['🔁', '🎬', '🎵', '📺', '📰', '🎮', '🏋️', '☁️', '🌐', '📱', '💪', '📚']
const COLORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const tabs = [
  { valor: 'activas', etiqueta: 'Activas' },
  { valor: 'inactivas', etiqueta: 'Pausadas' },
  { valor: 'todas', etiqueta: 'Todas' },
]
const tabActual = ref('activas')

const listaFiltrada = computed(() => {
  if (tabActual.value === 'activas') return items.value.filter(s => s.activa !== false)
  if (tabActual.value === 'inactivas') return items.value.filter(s => s.activa === false)
  return items.value
})

const formAbierto = ref(false)
const form = ref(formVacio())

function formVacio() {
  return {
    id: null,
    nombre: '',
    monto: 0,
    periodicidad: 'mensual',
    fechaInicio: new Date().toISOString().slice(0, 10),
    icono: '🔁',
    color: '#3b82f6',
    notas: '',
    activa: true,
  }
}

const puedeGuardar = computed(() => form.value.nombre.trim().length > 0 && form.value.monto > 0)

function abrirFormCrear() {
  form.value = formVacio()
  formAbierto.value = true
}

function abrirFormEditar(s) {
  form.value = { ...formVacio(), ...s }
  formAbierto.value = true
}

function cerrarForm() {
  formAbierto.value = false
}

function guardar() {
  if (!puedeGuardar.value) return
  if (form.value.id) {
    actualizar(form.value.id, form.value)
  } else {
    crear(form.value)
  }
  cerrarForm()
}

function confirmarEliminar(s) {
  if (!confirm(`¿Eliminar la suscripción "${s.nombre}"?`)) return
  eliminar(s.id)
}

function eliminarYCerrar(id) {
  if (!confirm('¿Eliminar esta suscripción?')) return
  eliminar(id)
  cerrarForm()
}

function etiquetaPeriodo(v) {
  return PERIODICIDADES.find(p => p.valor === v)?.etiqueta || v
}

function proyMensual(s) { return proyeccionMensual(s) }

function fechaCorta(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

// Eslint puede quejarse de imports no usados sin esto.
void proximaFechaCobro
</script>
