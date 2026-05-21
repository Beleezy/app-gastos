<template>
  <div class="min-h-screen flex flex-col">
    <div class="relative px-5 pt-8 pb-4 overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-pink-500/15 rounded-full blur-3xl"></div>
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
          <h1 class="text-xl font-bold text-gradient-blue">Etiquetas</h1>
          <p class="text-[11px] text-theme-text-sec mt-0.5">Cortes transversales (#viaje, #regalo, #urgente)</p>
        </div>
      </div>
    </div>

    <!-- Crear nueva -->
    <div class="px-5 lg:px-0 mb-4">
      <div class="bg-theme-card rounded-2xl border border-theme-border p-3 space-y-2">
        <p class="text-[10px] uppercase tracking-wider text-theme-text-muted">Nueva etiqueta</p>
        <div class="flex gap-2">
          <input
            v-model="nuevoNombre"
            type="text"
            placeholder="ej: viaje, regalo, urgente"
            class="flex-1 bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-pink-400"
            @keyup.enter="crearNueva"
          />
          <button
            class="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors disabled:opacity-50"
            :style="{ backgroundColor: nuevoColor }"
            :disabled="!puedeCrear"
            @click="crearNueva"
          >Añadir</button>
        </div>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="c in COLORES_ETIQUETA"
            :key="c"
            type="button"
            @click="nuevoColor = c"
            class="w-6 h-6 rounded-full border-2 transition-all"
            :style="{ backgroundColor: c }"
            :class="nuevoColor === c ? 'border-white scale-110' : 'border-transparent'"
            :aria-label="`Color ${c}`"
          ></button>
        </div>
      </div>
    </div>

    <!-- Listado -->
    <div class="px-5 lg:px-0 mb-8">
      <div class="flex items-center justify-between mb-2 px-1">
        <p class="text-[10px] uppercase tracking-wider text-theme-text-muted">Tus etiquetas ({{ items.length }})</p>
        <p class="text-[10px] text-theme-text-muted">{{ totalAsignaciones }} asignaciones</p>
      </div>

      <div v-if="items.length === 0" class="bg-theme-card rounded-2xl border border-theme-border p-6 text-center text-xs text-theme-text-muted">
        Sin etiquetas. Crea la primera arriba.
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="e in items"
          :key="e.id"
          class="bg-theme-card rounded-2xl border border-theme-border p-3"
        >
          <div v-if="editandoId !== e.id" class="flex items-center gap-3">
            <span
              class="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
              :style="{ backgroundColor: e.color }"
            >#{{ e.nombre }}</span>
            <span class="text-[10px] text-theme-text-muted">
              {{ conteoPorEtiqueta[e.id] || 0 }} asignación{{ conteoPorEtiqueta[e.id] === 1 ? '' : 'es' }}
            </span>
            <div class="flex-1"></div>
            <button class="w-7 h-7 rounded-lg text-theme-text-muted hover:text-theme-accent hover:bg-theme-border-md" @click="iniciarEdicion(e)" aria-label="Editar" title="Editar">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
              </svg>
            </button>
            <button class="w-7 h-7 rounded-lg text-theme-text-muted hover:text-red-400 hover:bg-red-500/10" @click="confirmarEliminar(e)" aria-label="Eliminar" title="Eliminar">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9M4 7h16"/>
              </svg>
            </button>
          </div>

          <div v-else class="space-y-2">
            <input
              v-model="editNombre"
              type="text"
              class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-pink-400"
              @keyup.enter="guardarEdicion"
              @keyup.escape="cancelarEdicion"
            />
            <div class="flex flex-wrap gap-1">
              <button
                v-for="c in COLORES_ETIQUETA"
                :key="c"
                type="button"
                @click="editColor = c"
                class="w-6 h-6 rounded-full border-2 transition-all"
                :style="{ backgroundColor: c }"
                :class="editColor === c ? 'border-white scale-110' : 'border-transparent'"
                :aria-label="`Color ${c}`"
              ></button>
            </div>
            <div class="flex gap-2 justify-end">
              <button class="px-3 py-1.5 rounded-lg bg-theme-input text-xs text-theme-text-muted hover:text-theme-text" @click="cancelarEdicion">Cancelar</button>
              <button class="px-3 py-1.5 rounded-lg text-white text-xs font-semibold" :style="{ backgroundColor: editColor }" @click="guardarEdicion">Guardar</button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Nota integración -->
    <div class="px-5 lg:px-0 mb-8">
      <div class="rounded-2xl border border-dashed border-theme-border bg-theme-card/40 p-3 flex items-start gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-pink-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-[11px] text-theme-text-muted leading-relaxed">
          <p><strong class="text-theme-text">Submódulo independiente.</strong> Catálogo y asignaciones en localStorage.</p>
          <p class="mt-1">Integración futura: chips de etiqueta en cada GastoItem, filtro por etiqueta en /registro, columna en exportes Excel/CSV. Ver <code>docs/INTEGRACION-SUBMODULOS.md</code>.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { COLORES_ETIQUETA } from '~/composables/useEtiquetas'

const { toggle: toggleDrawer } = useMobileDrawer()
const {
  items, fetchItems, fetchAsignaciones,
  crear, actualizar, eliminar, conteoPorEtiqueta,
  migrarLocalStorageSiHaceFalta,
} = useEtiquetas()

onMounted(async () => {
  try {
    await migrarLocalStorageSiHaceFalta()
    await fetchItems(true)
    await fetchAsignaciones(true)
  } catch (e) { console.warn('[etiquetas]', e) }
})

const nuevoNombre = ref('')
const nuevoColor = ref(COLORES_ETIQUETA[8])
const puedeCrear = computed(() => nuevoNombre.value.trim().length > 0)

function crearNueva() {
  if (!puedeCrear.value) return
  const ok = crear({ nombre: nuevoNombre.value, color: nuevoColor.value })
  if (!ok) {
    alert('Ya existe una etiqueta con ese nombre.')
    return
  }
  nuevoNombre.value = ''
}

const editandoId = ref(null)
const editNombre = ref('')
const editColor = ref('#3b82f6')

function iniciarEdicion(e) {
  editandoId.value = e.id
  editNombre.value = e.nombre
  editColor.value = e.color
}
function cancelarEdicion() {
  editandoId.value = null
}
function guardarEdicion() {
  if (!editandoId.value) return
  const n = editNombre.value.trim().replace(/^#/, '')
  if (!n) return
  actualizar(editandoId.value, { nombre: n, color: editColor.value })
  editandoId.value = null
}

function confirmarEliminar(e) {
  const usos = conteoPorEtiqueta.value[e.id] || 0
  const msg = usos > 0
    ? `Eliminar #${e.nombre} y sus ${usos} asignación${usos === 1 ? '' : 'es'}?`
    : `Eliminar #${e.nombre}?`
  if (!confirm(msg)) return
  eliminar(e.id)
}

const totalAsignaciones = computed(() => {
  return Object.values(conteoPorEtiqueta.value).reduce((s, n) => s + n, 0)
})
</script>
