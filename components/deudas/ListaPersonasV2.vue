<!--
  ListaPersonasV2 — rediseño del listado de personas en /deudas.

  Cambios visuales respecto a V1 (ListaPersonas.vue):
    • Card de persona ≥ 96px en 2 filas claras (fila 1: avatar + nombre +
      monto; fila 2: badges + última interacción).
    • Chips de filtro horizontal 44px en lugar de píldoras pequeñas.
    • Avatar 48px (V1: 40px) con tipografía 16px.
    • Chevron explícito derecha para CTA "abrir detalle".
    • Swipe sigue disponible pero ya no es la única forma de actuar.

  Misma lógica/contrato que V1: useDeudas, useDebouncedRef, useCurrency,
  useDeudaPdf. Mismos emits: ['seleccionar'].
-->
<template>
  <div class="px-4 lg:px-0 py-3 lg:py-5" data-testid="lista-personas-v2">
    <!-- Search + Orden -->
    <div class="flex items-center gap-2 mb-3">
      <div class="relative flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar persona..."
          class="w-full h-12 pl-10 pr-9 rounded-2xl bg-theme-card border border-theme-border text-theme-text placeholder-theme-text-muted text-sm focus:outline-none focus:border-theme-accent transition-colors"
        />
        <button v-if="busqueda" class="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted tap-44" @click="busqueda = ''">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <button
        class="shrink-0 w-12 h-12 rounded-2xl bg-theme-card border border-theme-border text-theme-text-muted hover:bg-theme-border-md flex items-center justify-center tap-44 transition-colors"
        :title="`Orden: ${ordenLabels[ordenActual]}`"
        @click="ciclarOrden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      </button>
    </div>

    <!-- Chips filtro estado -->
    <div class="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 pb-1">
      <button
        v-for="f in filtrosEstado"
        :key="f.value"
        class="shrink-0 inline-flex items-center gap-2 px-4 h-11 rounded-full text-sm font-semibold transition-colors border tap-44"
        :class="[
          filtroEstado === f.value
            ? (f.value === 'vencidas' ? 'bg-red-500 text-white border-red-500' : 'bg-theme-accent text-theme-on-accent border-theme-accent')
            : (f.value === 'vencidas' && countVencidas > 0 ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-theme-card text-theme-text-sec border-theme-border')
        ]"
        @click="filtroEstado = f.value"
      >
        <span v-if="f.value === 'vencidas'" class="w-1.5 h-1.5 rounded-full bg-current"
          :class="{ 'animate-pulse': countVencidas > 0 }"
        ></span>
        {{ f.label }}
        <span
          v-if="f.value === 'vencidas' && countVencidas > 0"
          class="px-1.5 rounded-full bg-current/20 text-[11px] font-bold leading-5"
        >{{ countVencidas }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-theme-card rounded-2xl p-4 animate-pulse">
        <div class="flex gap-3">
          <div class="w-12 h-12 rounded-xl bg-theme-border-md"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-theme-border-md rounded w-3/4"></div>
            <div class="h-3 bg-theme-border-md rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>

    <SharedEmptyState
      v-else-if="personasActivas.length === 0 && personasInactivas.length === 0"
      icon="👥"
      :title="emptyStateMsg"
      :message="filtroEstado === 'todos' ? 'Agrega una nueva deuda con el botón +' : ''"
      :action-label="filtroEstado === 'todos' ? '' : 'Ver todas'"
      @action="filtroEstado = 'todos'"
    />

    <div v-else class="space-y-2.5 xl:space-y-0 xl:grid xl:grid-cols-2 xl:gap-3">
      <!-- Personas activas -->
      <div
        v-for="persona in personasActivas"
        :key="persona.id"
        class="relative overflow-hidden rounded-2xl"
        data-testid="persona-item"
      >
        <!-- Swipe quick actions -->
        <div class="absolute inset-y-0 right-0 flex items-center gap-1 px-2 bg-theme-card">
          <button
            class="w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 text-theme-accent bg-theme-accent-bg tap-44"
            @click.stop="emit('seleccionar', persona)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span class="text-[10px] font-semibold">Ver</span>
          </button>
          <button
            v-if="tabActual === 'me_deben' && persona.totalPendiente > 0"
            class="w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 text-emerald-400 bg-emerald-500/10 tap-44"
            @click.stop="exportarPdf(persona)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="text-[10px] font-semibold">PDF</span>
          </button>
        </div>

        <!-- Card -->
        <div
          class="relative bg-theme-card rounded-2xl border transition-transform duration-200 cursor-pointer min-h-[96px] p-4"
          :class="persona.tieneVencidas ? 'border-red-500/40 shadow-sm shadow-red-500/5' : 'border-theme-border'"
          :style="{ transform: swipeOffsets[persona.id] ? `translateX(${swipeOffsets[persona.id]}px)` : '' }"
          @click="handleCardClick(persona)"
          @touchstart.passive="onTouchStart($event, persona.id)"
          @touchmove.passive="onTouchMove($event, persona.id)"
          @touchend.passive="onTouchEnd($event, persona.id)"
        >
          <!-- Fila 1: Avatar + Nombre + Monto + Chevron -->
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-base font-bold"
              :class="tabActual === 'me_deben' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'"
            >{{ getInitials(persona.nombre) }}</div>

            <div class="flex-1 min-w-0">
              <p class="text-base font-semibold text-theme-text truncate" :title="persona.nombre">{{ persona.nombre }}</p>
              <p class="text-xs text-theme-text-muted mt-0.5">
                {{ persona.deudasActivas }} deuda{{ persona.deudasActivas !== 1 ? 's' : '' }}
                <span v-if="persona.fechaProximaVencer && !persona.tieneVencidas"> · próx. {{ formatFechaCorta(persona.fechaProximaVencer) }}</span>
              </p>
            </div>

            <div class="text-right shrink-0">
              <p
                class="text-lg font-bold tabular-nums"
                :class="tabActual === 'me_deben' ? 'text-emerald-400' : 'text-red-400'"
              >
                {{ currencySymbol }} {{ formatMonto(persona.totalPendiente) }}
              </p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>

          <!-- Fila 2: Badges (chips) -->
          <div class="flex items-center gap-1.5 mt-3 flex-wrap">
            <span
              v-if="persona.tieneVencidas"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400"
            >
              <span class="w-1 h-1 rounded-full bg-red-400 animate-pulse"></span>
              VENCIDA
            </span>
            <span
              v-if="persona.tipo === 'organizacion'"
              class="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold bg-theme-border-md text-theme-text-muted"
            >ORG</span>
            <span
              v-if="persona.vinculadoUsuarioId"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-theme-accent-bg text-theme-accent"
              title="Vinculado con usuario"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Vinculado
            </span>
            <span class="ml-auto inline-flex items-center gap-1 text-[11px] text-theme-text-muted">
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="persona.totalPendiente > 0 ? (tabActual === 'me_deben' ? 'bg-emerald-400' : 'bg-red-400') : 'bg-gray-600'"
              ></span>
              {{ persona.totalPendiente > 0 ? 'Pendiente' : 'Saldado' }}
            </span>
          </div>

          <!-- Contact quick actions inline -->
          <div v-if="persona.contacto && isPhone(persona.contacto)" class="flex items-center gap-2 mt-3 pt-3 border-t border-theme-border" @click.stop>
            <a
              :href="`tel:${persona.contacto}`"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-theme-accent-bg text-theme-accent text-xs font-semibold hover:bg-theme-accent-bg-hover transition-colors tap-44"
              title="Llamar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.338c0 7.734 6.678 14.412 14.412 14.412A2.338 2.338 0 0018.99 18.41l.9-1.798a1.125 1.125 0 00-.26-1.364l-2.248-1.686a1.125 1.125 0 00-1.393.044l-.728.728a.75.75 0 01-.938.077 12.742 12.742 0 01-5.736-5.736.75.75 0 01.077-.938l.728-.728a1.125 1.125 0 00.044-1.393L7.75 3.41a1.125 1.125 0 00-1.364-.26l-1.799.9A2.338 2.338 0 002.25 6.338z" />
              </svg>
              Llamar
            </a>
            <a
              :href="whatsappUrl(persona)"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors tap-44"
              :title="tabActual === 'me_deben' && persona.totalPendiente > 0 ? 'Recordar saldo por WhatsApp' : 'WhatsApp'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <!-- Inactivas -->
      <template v-if="personasInactivas.length > 0">
        <div class="mt-6 mb-2 xl:col-span-2">
          <p class="text-xs font-semibold text-theme-text-muted uppercase tracking-wider px-1">Sin deudas activas</p>
        </div>
        <div
          v-for="persona in personasInactivas"
          :key="persona.id"
          class="relative overflow-hidden rounded-2xl opacity-60"
          data-testid="persona-item"
        >
          <div
            class="relative bg-theme-card rounded-2xl border border-theme-border p-4 cursor-pointer"
            @click="emit('seleccionar', persona)"
          >
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold bg-theme-border-md text-theme-text-muted">
                {{ getInitials(persona.nombre) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-base font-semibold text-theme-text truncate">{{ persona.nombre }}</p>
                <p class="text-xs text-theme-text-muted mt-0.5">Sin deudas activas</p>
              </div>
              <span class="text-sm font-semibold text-theme-text-muted">{{ currencySymbol }} 0.00</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </template>

      <div class="h-16"></div>
    </div>
  </div>
</template>

<script setup>
import { getInitials } from '~/utils/constants'

const emit = defineEmits(['seleccionar'])

const { personas, isLoading, tabActual, filtroEstado, resumen } = useDeudas()
const { descargarPdf } = useDeudaPdf()

const busqueda = ref('')
const busquedaDebounced = useDebouncedRef(busqueda, 200)
const ordenActual = ref('monto')
const ordenOpciones = ['monto', 'nombre', 'antiguo']
const ordenLabels = { monto: 'Mayor monto', nombre: 'Nombre A-Z', antiguo: 'Más antiguo' }
const filtrosEstado = [
  { value: 'todos', label: 'Todos' },
  { value: 'vencidas', label: 'Vencidas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'saldado', label: 'Saldados' },
]

const countVencidas = computed(() =>
  tabActual.value === 'me_deben' ? resumen.value.countVencidasMeDeben : resumen.value.countVencidasYoDebo
)

const emptyStateMsg = computed(() => {
  if (filtroEstado.value === 'vencidas') return 'No hay deudas vencidas'
  if (filtroEstado.value === 'pendiente') return 'No hay deudas pendientes'
  if (filtroEstado.value === 'saldado') return 'No hay deudas saldadas'
  return tabActual.value === 'me_deben' ? 'Nadie te debe por ahora' : 'No tienes deudas pendientes'
})

function ciclarOrden() {
  const idx = ordenOpciones.indexOf(ordenActual.value)
  ordenActual.value = ordenOpciones[(idx + 1) % ordenOpciones.length]
}

function aplicarFiltros(list) {
  let r = [...list]
  if (filtroEstado.value === 'pendiente') r = r.filter(p => p.totalPendiente > 0)
  else if (filtroEstado.value === 'saldado') r = r.filter(p => p.totalPendiente === 0)
  else if (filtroEstado.value === 'vencidas') r = r.filter(p => p.tieneVencidas)
  if (busquedaDebounced.value?.trim()) {
    const q = busquedaDebounced.value.toLowerCase()
    r = r.filter(p => p.nombre.toLowerCase().includes(q))
  }
  if (ordenActual.value === 'monto') r.sort((a, b) => (b.totalPendiente || 0) - (a.totalPendiente || 0))
  else if (ordenActual.value === 'nombre') r.sort((a, b) => a.nombre.localeCompare(b.nombre))
  else if (ordenActual.value === 'antiguo') r.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  return r
}

const personasActivas = computed(() => aplicarFiltros(personas.value.filter(p => p.deudasActivas > 0)))
const personasInactivas = computed(() => aplicarFiltros(personas.value.filter(p => p.deudasActivas === 0)))

async function exportarPdf(persona) {
  try {
    const deudas = await $fetch('/api/deudas', { query: { personaId: persona.id, tipo: 'me_deben' } })
    const activas = deudas.filter(d => d.estado === 'pendiente' || d.estado === 'parcial')
    const saldadas = deudas.filter(d => d.estado === 'pagado' || d.estado === 'archivado')
    await descargarPdf(persona, activas, saldadas)
  } catch (e) { console.error(e) }
}

const { currencySymbol, formatMonto } = useCurrency()

function isPhone(c) { return /^[+\d\s\-()]{7,}$/.test(c.trim()) }
function cleanPhone(c) { return c.replace(/[\s\-()]/g, '') }
function whatsappUrl(persona) {
  const phone = cleanPhone(persona.contacto)
  if (tabActual.value !== 'me_deben' || !(persona.totalPendiente > 0)) return `https://wa.me/${phone}`
  const nombre = persona.nombre.split(' ')[0]
  const monto = `${currencySymbol.value} ${formatMonto(persona.totalPendiente)}`
  const msg = persona.tieneVencidas
    ? `Hola ${nombre}, te escribo para recordarte el saldo pendiente de ${monto} que ya está vencido. ¿Podemos coordinar el pago? ¡Gracias!`
    : `Hola ${nombre}, un recordatorio amistoso sobre el saldo pendiente de ${monto}. ¿Podemos coordinar el pago cuando puedas? ¡Gracias!`
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

function formatFechaCorta(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha + 'T00:00:00')
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

const swipeOffsets = reactive({})
const swipeStarts = {}
const SWIPE_MAX = -120
const SWIPE_THRESHOLD = 60

function onTouchStart(e, id) { swipeStarts[id] = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
function onTouchMove(e, id) {
  const start = swipeStarts[id]
  if (!start) return
  const dx = e.touches[0].clientX - start.x
  const dy = Math.abs(e.touches[0].clientY - start.y)
  if (dy > 20) return
  const current = swipeOffsets[id] || 0
  swipeOffsets[id] = Math.max(SWIPE_MAX, Math.min(0, current + dx))
  swipeStarts[id] = { x: e.touches[0].clientX, y: start.y }
}
function onTouchEnd(e, id) {
  if (!swipeStarts[id]) return
  swipeStarts[id] = null
  const offset = swipeOffsets[id] || 0
  swipeOffsets[id] = offset < -SWIPE_THRESHOLD ? SWIPE_MAX : 0
}
function handleCardClick(persona) {
  if (swipeOffsets[persona.id] && swipeOffsets[persona.id] < -5) { swipeOffsets[persona.id] = 0; return }
  emit('seleccionar', persona)
}
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { scrollbar-width: none; }
</style>
