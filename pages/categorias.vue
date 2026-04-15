<template>
  <div>
    <LayoutAppHeader @back="navigateTo('/configuraciones')">
      <template #title>Mis Categorias</template>
    </LayoutAppHeader>

    <div class="max-w-lg lg:max-w-3xl mx-auto lg:mx-0 px-4 lg:px-0 py-4 lg:py-6 space-y-4">
      <p class="text-sm text-theme-text-sec mb-4">Personaliza las categorias para clasificar tus gastos. Puedes crear nuevas o elegir de las preseleccionadas.</p>

      <!-- Categorías actuales del usuario -->
      <div v-if="misCategorias.length === 0 && !isLoading" class="text-center py-10 opacity-70">
        <span class="text-4xl mb-3 block">🏷️</span>
        <p class="text-theme-text-sec text-sm">No tienes categorías activas.</p>
      </div>

      <div v-else class="space-y-2 mb-4">
        <div
          v-for="cat in misCategorias"
          :key="cat.id"
          class="flex items-center justify-between bg-theme-input rounded-xl px-3 py-2.5 border border-theme-border"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span
              class="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
              :style="{ backgroundColor: cat.color + '26' }"
            >{{ cat.icono }}</span>
            <div class="min-w-0">
              <p class="text-sm text-theme-text truncate">{{ cat.nombre }}</p>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              class="p-1.5 rounded-lg text-theme-text-sec hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
              @click="editarCategoria(cat)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              class="p-1.5 rounded-lg text-theme-text-sec hover:text-red-400 hover:bg-red-500/10 transition-colors"
              @click="eliminarCategoria(cat)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Botón agregar categoría -->
      <button
        class="w-full py-3.5 rounded-xl text-sm font-medium border-2 border-dashed border-theme-border text-theme-text-sec hover:border-theme-accent hover:text-theme-accent transition-colors"
        @click="mostrarSelectorCategorias = true"
      >
        + Agregar categoria
      </button>

      <!-- Modal selector de categorías -->
      <ClientOnly>
        <Teleport to="body">
          <Transition name="modal">
            <div v-if="mostrarSelectorCategorias" class="fixed inset-0 z-50 flex items-end justify-center">
            <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="cerrarSelectorCategorias"></div>
            <div class="relative w-full max-w-lg bg-theme-card rounded-t-2xl border-t border-theme-border max-h-[85vh] flex flex-col animate-slide-up">
              <!-- Header del modal -->
              <div class="flex items-center justify-between p-4 border-b border-theme-border shrink-0">
                <h3 class="text-base font-semibold text-theme-text">
                  {{ editandoCategoria ? 'Editar categoria' : 'Agregar categoria' }}
                </h3>
                <button class="p-1 rounded-lg hover:bg-theme-border-md transition-colors" @click="cerrarSelectorCategorias">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-theme-text-sec" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Tabs: Preseleccionadas / Personalizada -->
              <div class="flex border-b border-theme-border shrink-0">
                <button
                  class="flex-1 py-2.5 text-sm font-medium transition-colors"
                  :class="tabCategoria === 'preseleccionadas' ? 'text-theme-accent border-b-2 border-theme-accent' : 'text-theme-text-sec'"
                  @click="tabCategoria = 'preseleccionadas'"
                >
                  Preseleccionadas
                </button>
                <button
                  class="flex-1 py-2.5 text-sm font-medium transition-colors"
                  :class="tabCategoria === 'personalizada' ? 'text-theme-accent border-b-2 border-theme-accent' : 'text-theme-text-sec'"
                  @click="tabCategoria = 'personalizada'"
                >
                  Crear nueva
                </button>
              </div>

              <!-- Contenido scrolleable -->
              <div class="overflow-y-auto flex-1 p-4">
                <!-- Tab preseleccionadas -->
                <div v-if="tabCategoria === 'preseleccionadas'">
                  <!-- Buscador -->
                  <input
                    v-model="busquedaCategoria"
                    type="text"
                    placeholder="Buscar categoria..."
                    class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text mb-3 focus:outline-none focus:border-theme-accent"
                  />
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      v-for="cat in categoriasPreseleccionadasFiltradas"
                      :key="cat.nombre"
                      class="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all"
                      :class="categoriasExistentes.has(cat.nombre) ? 'border-theme-border bg-theme-border-md opacity-50 cursor-not-allowed' : 'border-theme-border hover:border-theme-accent active:scale-[0.97]'"
                      :disabled="categoriasExistentes.has(cat.nombre)"
                      @click="agregarPreseleccionada(cat)"
                    >
                      <span class="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" :style="{ backgroundColor: cat.color + '26' }">{{ cat.icono }}</span>
                      <span class="text-xs text-theme-text truncate">{{ cat.nombre }}</span>
                      <svg v-if="categoriasExistentes.has(cat.nombre)" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Tab personalizada -->
                <div v-if="tabCategoria === 'personalizada'" class="space-y-4">
                  <!-- Nombre -->
                  <div>
                    <label class="text-xs text-theme-text-sec mb-1 block">Nombre</label>
                    <input
                      v-model="nuevaCategoria.nombre"
                      type="text"
                      maxlength="50"
                      class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-theme-accent"
                      placeholder="Ej: Mascotas, Suscripciones..."
                    />
                  </div>

                  <!-- Selector de ícono -->
                  <div>
                    <label class="text-xs text-theme-text-sec mb-1 block">Icono</label>
                    <div class="grid grid-cols-8 gap-1.5">
                      <button
                        v-for="emoji in ICONOS_DISPONIBLES"
                        :key="emoji"
                        class="w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all"
                        :class="nuevaCategoria.icono === emoji ? 'bg-theme-accent/20 ring-2 ring-theme-accent scale-110' : 'bg-theme-input hover:bg-theme-border-md'"
                        @click="nuevaCategoria.icono = emoji"
                      >{{ emoji }}</button>
                    </div>
                  </div>

                  <!-- Selector de color -->
                  <div>
                    <label class="text-xs text-theme-text-sec mb-1 block">Color</label>
                    <div class="grid grid-cols-8 gap-1.5">
                      <button
                        v-for="c in COLORES_DISPONIBLES"
                        :key="c"
                        class="w-9 h-9 rounded-lg transition-all"
                        :class="nuevaCategoria.color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'"
                        :style="{ backgroundColor: c }"
                        @click="nuevaCategoria.color = c"
                      ></button>
                    </div>
                  </div>

                  <!-- Preview -->
                  <div v-if="nuevaCategoria.nombre && nuevaCategoria.icono" class="bg-theme-input rounded-xl p-3 border border-theme-border">
                    <p class="text-xs text-theme-text-sec mb-2">Vista previa:</p>
                    <div class="flex items-center gap-2.5">
                      <span class="w-9 h-9 rounded-lg flex items-center justify-center text-lg" :style="{ backgroundColor: nuevaCategoria.color + '26' }">{{ nuevaCategoria.icono }}</span>
                      <span class="text-sm font-medium text-theme-text">{{ nuevaCategoria.nombre }}</span>
                    </div>
                  </div>

                  <!-- Botón crear -->
                  <button
                    class="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                    :class="puedeCrearCategoria ? 'bg-theme-accent text-white hover:opacity-90' : 'bg-theme-border-md text-theme-text-sec cursor-not-allowed'"
                    :disabled="!puedeCrearCategoria || guardandoCategoria"
                    @click="crearCategoriaPersonalizada"
                  >
                    {{ guardandoCategoria ? 'Guardando...' : (editandoCategoria ? 'Guardar cambios' : 'Crear categoria') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
      </ClientOnly>

      <!-- Modal confirmar eliminación -->
      <ClientOnly>
        <Teleport to="body">
          <Transition name="modal">
            <div v-if="categoriaAEliminar" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="categoriaAEliminar = null"></div>
            <div class="relative bg-theme-card rounded-2xl border border-theme-border p-5 w-full max-w-sm">
              <div class="text-center">
                <span class="text-3xl block mb-3">{{ categoriaAEliminar.icono }}</span>
                <h3 class="text-base font-semibold text-theme-text mb-1">Eliminar categoria</h3>
                <p class="text-sm text-theme-text-sec mb-4">¿Eliminar "{{ categoriaAEliminar.nombre }}"? No se puede deshacer.</p>
                <div class="flex gap-3">
                  <button
                    class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-theme-input border border-theme-border text-theme-text hover:bg-theme-border-md transition-colors"
                    @click="categoriaAEliminar = null"
                  >Cancelar</button>
                  <button
                    class="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors active:scale-[0.98]"
                    :disabled="eliminandoCategoria"
                    @click="confirmarEliminar"
                  >{{ eliminandoCategoria ? 'Eliminando...' : 'Eliminar' }}</button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
      </ClientOnly>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toastMsg"
          class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg backdrop-blur-sm"
        >
          {{ toastMsg }}
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { useModalBack } from '~/composables/useModalBack'

const { apiFetch } = useApiFetch()
const router = useRouter()

const CATEGORIAS_PRESELECCIONADAS = [
  { nombre: 'Alimentacion',    icono: '🍽️',  color: '#ef4444' },
  { nombre: 'Transporte',      icono: '🚌',  color: '#3b82f6' },
  { nombre: 'Vivienda',        icono: '🏠',  color: '#f59e0b' },
  { nombre: 'Salud',           icono: '🏥',  color: '#10b981' },
  { nombre: 'Educacion',       icono: '📚',  color: '#8b5cf6' },
  { nombre: 'Entretenimiento', icono: '🎮',  color: '#ec4899' },
  { nombre: 'Vestimenta',      icono: '👕',  color: '#f97316' },
  { nombre: 'Servicios',       icono: '⚡',  color: '#06b6d4' },
  { nombre: 'Ahorro',          icono: '💰',  color: '#22c55e' },
  { nombre: 'Deudas',          icono: '💳',  color: '#e11d48' },
  { nombre: 'Otros',           icono: '📦',  color: '#6b7280' },
  { nombre: 'Mascotas',        icono: '🐾',  color: '#a855f7' },
  { nombre: 'Suscripciones',   icono: '🔄',  color: '#6366f1' },
  { nombre: 'Supermercado',    icono: '🛒',  color: '#f43f5e' },
  { nombre: 'Restaurantes',    icono: '🍔',  color: '#dc2626' },
  { nombre: 'Cafe',            icono: '☕',  color: '#92400e' },
  { nombre: 'Snacks',          icono: '🍿',  color: '#fb923c' },
  { nombre: 'Bebidas',         icono: '🥤',  color: '#f472b6' },
  { nombre: 'Farmacia',        icono: '💊',  color: '#14b8a6' },
  { nombre: 'Gym',             icono: '🏋️',  color: '#0ea5e9' },
  { nombre: 'Deportes',        icono: '⚽',  color: '#16a34a' },
  { nombre: 'Taxi',            icono: '🚕',  color: '#eab308' },
  { nombre: 'Gasolina',        icono: '⛽',  color: '#78716c' },
  { nombre: 'Estacionamiento', icono: '🅿️',  color: '#64748b' },
  { nombre: 'Peajes',          icono: '🛣️',  color: '#475569' },
  { nombre: 'Internet',        icono: '🌐',  color: '#2563eb' },
  { nombre: 'Telefono',        icono: '📱',  color: '#7c3aed' },
  { nombre: 'Streaming',       icono: '📺',  color: '#9333ea' },
  { nombre: 'Musica',          icono: '🎵',  color: '#c026d3' },
  { nombre: 'Videojuegos',     icono: '🎮',  color: '#4f46e5' },
  { nombre: 'Libros',          icono: '📖',  color: '#0d9488' },
  { nombre: 'Cursos',          icono: '🎓',  color: '#7c3aed' },
  { nombre: 'Regalos',         icono: '🎁',  color: '#e11d48' },
  { nombre: 'Donaciones',      icono: '🤝',  color: '#059669' },
  { nombre: 'Seguros',         icono: '🛡️',  color: '#1d4ed8' },
  { nombre: 'Impuestos',       icono: '🏛️',  color: '#374151' },
  { nombre: 'Alquiler',        icono: '🔑',  color: '#b45309' },
  { nombre: 'Mantenimiento',   icono: '🔧',  color: '#525252' },
  { nombre: 'Limpieza',        icono: '🧹',  color: '#0891b2' },
  { nombre: 'Muebles',         icono: '🛋️',  color: '#a16207' },
  { nombre: 'Electronica',     icono: '💻',  color: '#334155' },
  { nombre: 'Ropa Deportiva',  icono: '👟',  color: '#ea580c' },
  { nombre: 'Belleza',         icono: '💅',  color: '#db2777' },
  { nombre: 'Peluqueria',      icono: '💇',  color: '#be185d' },
  { nombre: 'Dentista',        icono: '🦷',  color: '#0f766e' },
  { nombre: 'Optica',          icono: '👓',  color: '#4338ca' },
  { nombre: 'Viajes',          icono: '✈️',  color: '#0284c7' },
  { nombre: 'Hoteleria',       icono: '🏨',  color: '#7e22ce' },
  { nombre: 'Propinas',        icono: '💵',  color: '#15803d' },
  { nombre: 'Inversiones',     icono: '📈',  color: '#047857' },
]

const ICONOS_DISPONIBLES = [
  '🍽️','🚌','🏠','🏥','📚','🎮','👕','⚡','💰','💳','📦','🐾',
  '🔄','🛒','🍔','☕','🍿','🥤','💊','🏋️','⚽','🚕','⛽','🌐',
  '📱','📺','🎵','📖','🎓','🎁','🤝','🛡️','🏛️','🔑','🔧','🧹',
  '🛋️','💻','👟','💅','💇','🦷','👓','✈️','🏨','💵','📈','🎪',
  '🧸','🍕','🍺','🎂','🏖️','⛪','🎭','🖥️','🎨','🧘','🚲','🛍️',
  '🪴','🧊','🎯','📮',
]

const COLORES_DISPONIBLES = [
  '#ef4444','#f97316','#f59e0b','#eab308','#22c55e','#10b981','#14b8a6','#06b6d4',
  '#0ea5e9','#3b82f6','#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899','#f43f5e',
  '#78716c','#64748b','#374151','#92400e','#166534','#1e40af','#581c87','#9f1239',
]

const isLoading = ref(true)
const misCategorias = ref([])
const mostrarSelectorCategorias = ref(false)
const tabCategoria = ref('preseleccionadas')
const busquedaCategoria = ref('')
const guardandoCategoria = ref(false)
const eliminandoCategoria = ref(false)
const categoriaAEliminar = ref(null)
const editandoCategoria = ref(null)
const toastMsg = ref('')

const nuevaCategoria = reactive({
  nombre: '',
  icono: '📦',
  color: '#6b7280',
})

const categoriasExistentes = computed(() => {
  return new Set(misCategorias.value.map(c => c.nombre))
})

const categoriasPreseleccionadasFiltradas = computed(() => {
  if (!busquedaCategoria.value) return CATEGORIAS_PRESELECCIONADAS
  const q = busquedaCategoria.value.toLowerCase()
  return CATEGORIAS_PRESELECCIONADAS.filter(c => c.nombre.toLowerCase().includes(q))
})

const puedeCrearCategoria = computed(() => {
  return nuevaCategoria.nombre.trim().length > 0 && nuevaCategoria.icono && nuevaCategoria.color
})

// Hook hardware back button
watch(mostrarSelectorCategorias, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

async function fetchCategorias() {
  isLoading.value = true
  try {
    await apiFetch('/api/categorias/provision', { method: 'POST' })
    const data = await apiFetch('/api/categorias')
    misCategorias.value = data
  } catch (e) {
    console.error('Error cargando categorías:', e)
  } finally {
    isLoading.value = false
  }
}

async function agregarPreseleccionada(cat) {
  if (categoriasExistentes.value.has(cat.nombre)) return
  guardandoCategoria.value = true
  try {
    await apiFetch('/api/categorias', {
      method: 'POST',
      body: { nombre: cat.nombre, icono: cat.icono, color: cat.color },
    })
    await fetchCategorias()
    showCatToast(`${cat.icono} ${cat.nombre} agregada`)
  } catch (e) {
    showCatToast(e?.data?.message || 'Error al agregar')
  } finally {
    guardandoCategoria.value = false
  }
}

async function crearCategoriaPersonalizada() {
  if (!puedeCrearCategoria.value) return
  guardandoCategoria.value = true
  try {
    if (editandoCategoria.value) {
      await apiFetch(`/api/categorias/${editandoCategoria.value.id}`, {
        method: 'PUT',
        body: { nombre: nuevaCategoria.nombre.trim(), icono: nuevaCategoria.icono, color: nuevaCategoria.color },
      })
      showCatToast('Categoria actualizada')
    } else {
      await apiFetch('/api/categorias', {
        method: 'POST',
        body: { nombre: nuevaCategoria.nombre.trim(), icono: nuevaCategoria.icono, color: nuevaCategoria.color },
      })
      showCatToast(`${nuevaCategoria.icono} ${nuevaCategoria.nombre} creada`)
    }
    await fetchCategorias()
    cerrarSelectorCategorias()
  } catch (e) {
    showCatToast(e?.data?.message || 'Error al guardar')
  } finally {
    guardandoCategoria.value = false
  }
}

function editarCategoria(cat) {
  editandoCategoria.value = cat
  nuevaCategoria.nombre = cat.nombre
  nuevaCategoria.icono = cat.icono
  nuevaCategoria.color = cat.color
  tabCategoria.value = 'personalizada'
  mostrarSelectorCategorias.value = true
}

function eliminarCategoria(cat) {
  categoriaAEliminar.value = cat
}

async function confirmarEliminar() {
  if (!categoriaAEliminar.value) return
  eliminandoCategoria.value = true
  try {
    await apiFetch(`/api/categorias/${categoriaAEliminar.value.id}`, { method: 'DELETE' })
    await fetchCategorias()
    showCatToast('Categoria eliminada')
  } catch (e) {
    showCatToast(e?.data?.message || 'Error al eliminar')
  } finally {
    eliminandoCategoria.value = false
    categoriaAEliminar.value = null
  }
}

function cerrarSelectorCategorias() {
  mostrarSelectorCategorias.value = false
  editandoCategoria.value = null
  nuevaCategoria.nombre = ''
  nuevaCategoria.icono = '📦'
  nuevaCategoria.color = '#6b7280'
  busquedaCategoria.value = ''
  tabCategoria.value = 'preseleccionadas'
}

function showCatToast(msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2500)
}

onMounted(() => {
  fetchCategorias()
})
</script>

<style scoped>
.toast-enter-active { transition: all 0.3s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translate(-50%, 20px); }
.toast-leave-to { opacity: 0; transform: translate(-50%, -10px); }

.modal-enter-active { transition: all 0.3s ease-out; }
.modal-leave-active { transition: all 0.2s ease-in; }
.modal-enter-from { opacity: 0; }
.modal-leave-to { opacity: 0; }

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
</style>
