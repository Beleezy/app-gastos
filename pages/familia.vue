<template>
  <div class="min-h-screen pb-32">
    <!-- Header -->
    <div class="px-5 pt-8 pb-3 relative overflow-hidden">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-fuchsia-500/10 rounded-full blur-3xl"></div>
      <div class="relative flex items-center gap-3 mb-1">
        <button
          class="w-9 h-9 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors shrink-0"
          @click="$router.back()"
          aria-label="Volver"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div class="w-11 h-11 rounded-2xl flex items-center justify-center bg-fuchsia-500/15">
          <span class="text-xl">👨‍👩‍👧</span>
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold text-theme-text">Familia</h1>
          <p class="text-[11px] text-theme-text-sec mt-0.5">Lleva las finanzas de tus familiares</p>
        </div>
      </div>
    </div>

    <!-- Explicación -->
    <div class="px-5 mb-4">
      <div class="rounded-2xl border border-dashed border-theme-border bg-theme-card/40 p-3 text-[11px] text-theme-text-muted leading-relaxed">
        Crea un perfil por cada familiar cuyas finanzas administres (p. ej. papá o abuelo).
        Al <strong class="text-theme-text">Entrar</strong> a un perfil, Registro, Planificador,
        Ahorro y Deudas mostrarán y guardarán los datos de esa persona. Ellos no necesitan
        cuenta ni iniciar sesión.
      </div>
    </div>

    <!-- Nuevo perfil -->
    <div class="px-5 mb-4">
      <button
        class="w-full px-4 py-3 rounded-xl border-2 border-dashed border-fuchsia-500/30 text-fuchsia-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-fuchsia-500/5 transition-colors"
        @click="abrirNuevo"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nuevo perfil de familiar
      </button>
    </div>

    <div v-if="mostrarForm" class="px-5 mb-4">
      <div class="bg-theme-card border border-theme-border rounded-2xl p-4 flex items-center gap-2">
        <input
          v-model="nuevoNombre"
          placeholder="Nombre (p. ej. Papá)"
          maxlength="255"
          class="flex-1 bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm"
          @keyup.enter="guardarNuevo"
        />
        <button class="px-3 py-2.5 rounded-xl bg-theme-input text-theme-text-sec text-sm" @click="mostrarForm = false">Cancelar</button>
        <button class="px-4 py-2.5 rounded-xl bg-fuchsia-500 text-white text-sm font-semibold disabled:opacity-50" :disabled="!nuevoNombre.trim()" @click="guardarNuevo">Crear</button>
      </div>
    </div>

    <!-- Lista de perfiles -->
    <div class="px-5 space-y-2">
      <div v-if="cargando && !perfiles.length" class="space-y-2">
        <div v-for="i in 2" :key="i" class="h-16 bg-theme-card rounded-xl shimmer"></div>
      </div>
      <div v-else-if="!perfiles.length" class="text-center py-10">
        <p class="text-sm text-theme-text-sec">Aún no tienes perfiles de familiares</p>
        <p class="text-[11px] text-theme-text-muted mt-1">Crea uno para empezar a administrar sus finanzas</p>
      </div>

      <div
        v-for="p in perfiles"
        :key="p.id"
        class="bg-theme-card border border-theme-border rounded-xl p-3"
        :class="perfilActivoId === p.id ? 'ring-1 ring-fuchsia-500/40' : ''"
      >
        <div v-if="editandoId === p.id" class="flex items-center gap-2">
          <input
            v-model="editNombre"
            maxlength="255"
            class="flex-1 bg-theme-input border border-theme-border rounded-lg px-3 py-2 text-sm"
            @keyup.enter="guardarEdicion(p)"
          />
          <button class="px-3 py-2 rounded-lg bg-theme-input text-theme-text-sec text-xs" @click="editandoId = null">Cancelar</button>
          <button class="px-3 py-2 rounded-lg bg-fuchsia-500 text-white text-xs font-semibold" @click="guardarEdicion(p)">Guardar</button>
        </div>
        <div v-else class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-fuchsia-500/15 flex items-center justify-center text-sm font-bold text-fuchsia-300 shrink-0">
              {{ inicial(p.nombre) }}
            </div>
            <div class="min-w-0">
              <p class="text-sm text-theme-text font-semibold truncate">{{ p.nombre }}</p>
              <p v-if="perfilActivoId === p.id" class="text-[10px] text-fuchsia-400">Perfil activo</p>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button class="px-2.5 py-1.5 rounded-lg bg-fuchsia-500/15 text-fuchsia-400 text-[11px] font-semibold" @click="entrarPerfil(p.id)">Entrar</button>
            <button class="w-8 h-8 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md" aria-label="Editar" @click="abrirEdicion(p)">
              <svg class="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
            </button>
            <button class="w-8 h-8 rounded-lg text-theme-text-muted hover:text-red-400 hover:bg-red-500/10" aria-label="Eliminar" @click="confirmarEliminar(p)">
              <svg class="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9M4 7h16"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
useHead({ title: 'Familia · Mis Finanzas' })

const {
  perfiles, perfilActivoId, cargando,
  fetchPerfiles, crearPerfil, actualizarPerfil, eliminarPerfil, entrarPerfil,
} = usePerfiles()
const toast = useToast()

const mostrarForm = ref(false)
const nuevoNombre = ref('')
const editandoId = ref(null)
const editNombre = ref('')

onMounted(fetchPerfiles)

function inicial(nombre) {
  return (nombre || '?').trim().charAt(0).toUpperCase()
}

function abrirNuevo() {
  mostrarForm.value = !mostrarForm.value
  nuevoNombre.value = ''
}

async function guardarNuevo() {
  const n = nuevoNombre.value.trim()
  if (!n) return
  try {
    await crearPerfil(n)
    toast.success('Perfil creado')
    nuevoNombre.value = ''
    mostrarForm.value = false
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo crear el perfil')
  }
}

function abrirEdicion(p) {
  editandoId.value = p.id
  editNombre.value = p.nombre
}

async function guardarEdicion(p) {
  const n = editNombre.value.trim()
  if (!n) return
  try {
    await actualizarPerfil(p.id, n)
    editandoId.value = null
    toast.success('Perfil actualizado')
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo actualizar')
  }
}

async function confirmarEliminar(p) {
  if (!confirm(`¿Eliminar el perfil "${p.nombre}"? Se borrarán también sus gastos, ingresos, planificador, ahorros y deudas. Esta acción no se puede deshacer.`)) return
  try {
    await eliminarPerfil(p.id)
    toast.success('Perfil eliminado')
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo eliminar')
  }
}
</script>
