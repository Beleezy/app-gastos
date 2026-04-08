<template>
  <div class="px-4 py-3">
    <!-- Barra de búsqueda y ordenamiento -->
    <div class="flex items-center gap-2 mb-3">
      <div class="relative flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar persona..."
          class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-primary-900/60 border border-primary-700/30 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
        />
        <button v-if="busqueda" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300" @click="busqueda = ''">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <!-- Orden toggle -->
      <button
        class="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-800 border border-primary-700/50 text-gray-400 text-xs hover:bg-primary-700 transition-colors"
        @click="ciclarOrden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        {{ ordenLabels[ordenActual] }}
      </button>
    </div>

    <!-- Filtros de estado -->
    <div class="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
      <button
        v-for="f in filtrosEstado"
        :key="f.value"
        class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
        :class="filtroEstado === f.value ? 'bg-blue-500 text-white' : 'bg-primary-800 text-gray-400'"
        @click="filtroEstado = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-primary-800 rounded-xl p-4 animate-pulse">
        <div class="flex gap-3">
          <div class="w-12 h-12 rounded-full bg-primary-700"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-primary-700 rounded w-3/4"></div>
            <div class="h-3 bg-primary-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="personasActivas.length === 0 && personasInactivas.length === 0" class="text-center py-12">
      <div class="w-16 h-16 rounded-full bg-primary-800 flex items-center justify-center mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <p class="text-gray-500 text-sm">
        {{ tabActual === 'me_deben' ? 'Nadie te debe por ahora' : 'No tienes deudas pendientes' }}
      </p>
      <p class="text-gray-600 text-xs mt-1">Agrega una nueva deuda con el boton +</p>
    </div>

    <!-- Personas List -->
    <div v-else class="space-y-2.5">
      <div
        v-for="persona in personasActivas"
        :key="persona.id"
        class="relative overflow-hidden rounded-xl"
      >
        <!-- Quick actions revealed by swipe -->
        <div class="absolute inset-y-0 right-0 flex items-center gap-1 px-2 bg-primary-800">
          <button
            class="w-12 h-full flex flex-col items-center justify-center gap-0.5 text-blue-400 bg-blue-500/10 rounded-lg"
            @click.stop="emit('seleccionar', persona)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span class="text-[9px] font-medium">Ver</span>
          </button>
          <button
            v-if="tabActual === 'me_deben' && persona.totalPendiente > 0"
            class="w-12 h-full flex flex-col items-center justify-center gap-0.5 text-emerald-400 bg-emerald-500/10 rounded-lg"
            @click.stop="exportarPdf(persona)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="text-[9px] font-medium">PDF</span>
          </button>
        </div>

        <!-- Swipeable card -->
        <div
          class="relative bg-primary-800 rounded-xl border border-primary-700/30 transition-transform duration-200 cursor-pointer"
          :style="{ transform: swipeOffsets[persona.id] ? `translateX(${swipeOffsets[persona.id]}px)` : '' }"
          @click="handleCardClick(persona)"
          @touchstart.passive="onTouchStart($event, persona.id)"
          @touchmove.passive="onTouchMove($event, persona.id)"
          @touchend.passive="onTouchEnd($event, persona.id)"
        >
          <div class="p-4">
            <div class="flex items-center gap-3">
              <!-- Avatar -->
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-lg font-semibold"
                :class="tabActual === 'me_deben' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'"
              >
                {{ getInitials(persona.nombre) }}
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white leading-snug break-words">{{ persona.nombre }}</p>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span v-if="persona.tipo === 'organizacion'" class="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary-700 text-gray-400">
                    ORG
                  </span>
                  <span v-if="persona.vinculadoUsuarioId" class="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/15 text-blue-400" title="Vinculado con usuario">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </span>
                  <span class="text-xs text-gray-500">
                    {{ persona.deudasActivas }} deuda{{ persona.deudasActivas !== 1 ? 's' : '' }}
                  </span>
                </div>
                <!-- Due date indicator -->
                <div v-if="persona.tieneVencidas" class="flex items-center gap-1 mt-1">
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-red-500/20 text-red-400">
                    <span class="w-1 h-1 rounded-full bg-red-400 animate-pulse"></span>
                    VENCIDA
                  </span>
                </div>
                <div v-else-if="persona.fechaProximaVencer" class="flex items-center gap-1 mt-1">
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-amber-500/15 text-amber-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {{ formatFechaCorta(persona.fechaProximaVencer) }}
                  </span>
                </div>
              </div>

              <!-- Amount -->
              <div class="text-right shrink-0">
                <p
                  class="text-sm font-semibold"
                  :class="tabActual === 'me_deben' ? 'text-emerald-400' : 'text-red-400'"
                >
                  {{ currencySymbol }} {{ formatMonto(persona.totalPendiente) }}
                </p>
                <!-- Status indicator -->
                <div class="flex items-center justify-end gap-1 mt-1">
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="persona.totalPendiente > 0 ? (tabActual === 'me_deben' ? 'bg-emerald-400' : 'bg-red-400') : 'bg-gray-600'"
                  ></span>
                  <span class="text-[10px] text-gray-500">
                    {{ persona.totalPendiente > 0 ? 'Pendiente' : 'Saldado' }}
                  </span>
                </div>
              </div>

              <!-- Contact quick actions (phone / WhatsApp) -->
              <div v-if="persona.contacto && isPhone(persona.contacto)" class="flex items-center gap-1 shrink-0" @click.stop>
                <a
                  :href="`tel:${persona.contacto}`"
                  class="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                  title="Llamar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.338c0 7.734 6.678 14.412 14.412 14.412A2.338 2.338 0 0018.99 18.41l.9-1.798a1.125 1.125 0 00-.26-1.364l-2.248-1.686a1.125 1.125 0 00-1.393.044l-.728.728a.75.75 0 01-.938.077 12.742 12.742 0 01-5.736-5.736.75.75 0 01.077-.938l.728-.728a1.125 1.125 0 00.044-1.393L7.75 3.41a1.125 1.125 0 00-1.364-.26l-1.799.9A2.338 2.338 0 002.25 6.338z" />
                  </svg>
                </a>
                <a
                  :href="`https://wa.me/${cleanPhone(persona.contacto)}`"
                  target="_blank"
                  rel="noopener"
                  class="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  title="WhatsApp"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
              </div>

              <!-- Chevron -->
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Sección "Otros" para personas sin deudas activas -->
      <template v-if="personasInactivas.length > 0">
        <div class="mt-6 mb-2">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wider px-1">Sin deudas activas</p>
        </div>
        <div
          v-for="persona in personasInactivas"
          :key="persona.id"
          class="relative overflow-hidden rounded-xl opacity-60"
        >
          <!-- Quick actions revealed by swipe -->
          <div class="absolute inset-y-0 right-0 flex items-center gap-1 px-2 bg-primary-800">
            <button
              class="w-12 h-full flex flex-col items-center justify-center gap-0.5 text-blue-400 bg-blue-500/10 rounded-lg"
              @click.stop="emit('seleccionar', persona)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span class="text-[9px] font-medium">Ver</span>
            </button>
          </div>

          <!-- Swipeable card -->
          <div
            class="relative bg-primary-800 rounded-xl border border-primary-700/30 transition-transform duration-200 cursor-pointer"
            :style="{ transform: swipeOffsets[persona.id] ? `translateX(${swipeOffsets[persona.id]}px)` : '' }"
            @click="handleCardClick(persona)"
            @touchstart.passive="onTouchStart($event, persona.id)"
            @touchmove.passive="onTouchMove($event, persona.id)"
            @touchend.passive="onTouchEnd($event, persona.id)"
          >
            <div class="p-4">
              <div class="flex items-center gap-3">
                <!-- Avatar -->
                <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-lg font-semibold bg-gray-500/15 text-gray-400">
                  {{ getInitials(persona.nombre) }}
                </div>
                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium text-white truncate">{{ persona.nombre }}</p>
                    <span v-if="persona.tipo === 'organizacion'" class="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary-700 text-gray-400">ORG</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-0.5">Sin deudas activas</p>
                </div>
                <!-- Amount -->
                <div class="text-right shrink-0">
                  <p class="text-sm font-semibold text-gray-500">{{ currencySymbol }} 0.00</p>
                  <div class="flex items-center justify-end gap-1 mt-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                    <span class="text-[10px] text-gray-500">Saldado</span>
                  </div>
                </div>
                <!-- Chevron -->
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Bottom spacer for FAB -->
      <div class="h-16"></div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['seleccionar'])

const { personas, isLoading, tabActual } = useDeudas()
const { generarPdfDeuda } = useDeudaPdf()

const busqueda = ref('')
const ordenActual = ref('monto') // monto | nombre | antiguo
const ordenOpciones = ['monto', 'nombre', 'antiguo']
const ordenLabels = { monto: 'Mayor monto', nombre: 'Nombre A-Z', antiguo: 'Más antiguo' }
const filtroEstado = ref('todos')
const filtrosEstado = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'saldado', label: 'Saldados' },
]

function ciclarOrden() {
  const idx = ordenOpciones.indexOf(ordenActual.value)
  ordenActual.value = ordenOpciones[(idx + 1) % ordenOpciones.length]
}

function aplicarFiltros(list) {
  let result = [...list]

  // Filtrar por estado
  if (filtroEstado.value === 'pendiente') {
    result = result.filter(p => p.totalPendiente > 0)
  } else if (filtroEstado.value === 'saldado') {
    result = result.filter(p => p.totalPendiente === 0)
  }

  // Filtrar por búsqueda
  if (busqueda.value.trim()) {
    const q = busqueda.value.toLowerCase()
    result = result.filter(p => p.nombre.toLowerCase().includes(q))
  }

  // Ordenar
  if (ordenActual.value === 'monto') {
    result.sort((a, b) => (b.totalPendiente || 0) - (a.totalPendiente || 0))
  } else if (ordenActual.value === 'nombre') {
    result.sort((a, b) => a.nombre.localeCompare(b.nombre))
  } else if (ordenActual.value === 'antiguo') {
    result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  }

  return result
}

const personasActivas = computed(() => {
  return aplicarFiltros(personas.value.filter(p => p.deudasActivas > 0))
})

const personasInactivas = computed(() => {
  return aplicarFiltros(personas.value.filter(p => p.deudasActivas === 0))
})

const personasFiltradas = computed(() => {
  return [...personasActivas.value, ...personasInactivas.value]
})

async function exportarPdf(persona) {
  try {
    const deudas = await $fetch('/api/deudas', {
      query: { personaId: persona.id, tipo: 'me_deben' }
    })
    const activas = deudas.filter(d => d.estado === 'pendiente' || d.estado === 'parcial')
    const saldadas = deudas.filter(d => d.estado === 'pagado' || d.estado === 'archivado')
    await generarPdfDeuda(persona, activas, saldadas)
  } catch (e) {
    console.error('Error al generar PDF:', e)
  }
}

import { getInitials } from '~/utils/constants'

const { currencySymbol, formatMonto } = useCurrency()

function isPhone(contacto) {
  return /^[+\d\s\-()]{7,}$/.test(contacto.trim())
}

function cleanPhone(contacto) {
  return contacto.replace(/[\s\-()]/g, '')
}

function formatFechaCorta(fecha) {
  if (!fecha) return ''
  const d = new Date(fecha + 'T00:00:00')
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Swipe-left per card to reveal quick actions
const swipeOffsets = reactive({})
const swipeStarts = {}
const SWIPE_MAX = -110
const SWIPE_THRESHOLD = 50

function onTouchStart(e, id) {
  swipeStarts[id] = { x: e.touches[0].clientX, y: e.touches[0].clientY }
}

function onTouchMove(e, id) {
  if (!swipeStarts[id]) return
  const diffX = e.touches[0].clientX - swipeStarts[id].x
  const diffY = Math.abs(e.touches[0].clientY - swipeStarts[id].y)
  if (diffY > 20) return // vertical scroll, ignore
  const current = swipeOffsets[id] || 0
  const newOffset = Math.max(SWIPE_MAX, Math.min(0, current + diffX))
  swipeOffsets[id] = newOffset
  swipeStarts[id] = { x: e.touches[0].clientX, y: swipeStarts[id].y }
}

function onTouchEnd(e, id) {
  if (!swipeStarts[id]) return
  delete swipeStarts[id]
  const offset = swipeOffsets[id] || 0
  // Snap: if swiped more than threshold, open; otherwise close
  swipeOffsets[id] = offset < -SWIPE_THRESHOLD ? SWIPE_MAX : 0
}

function handleCardClick(persona) {
  // If card is swiped open, close it instead of navigating
  if (swipeOffsets[persona.id] && swipeOffsets[persona.id] < -5) {
    swipeOffsets[persona.id] = 0
    return
  }
  emit('seleccionar', persona)
}
</script>
