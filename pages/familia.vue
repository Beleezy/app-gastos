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

    <!-- Formulario crear/editar -->
    <div v-if="mostrarForm" class="px-5 mb-4">
      <div class="bg-theme-card border border-theme-border rounded-2xl p-4 space-y-3">
        <p class="text-sm font-semibold text-theme-text">{{ form.id ? 'Editar perfil' : 'Nuevo perfil' }}</p>
        <div>
          <label class="block text-[11px] text-theme-text-muted mb-1">Nombre</label>
          <input v-model="form.nombre" placeholder="p. ej. Papá" maxlength="255" class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label class="block text-[11px] text-theme-text-muted mb-1">WhatsApp <span class="text-theme-text-muted">(opcional)</span></label>
          <input v-model="form.telefono" type="tel" inputmode="tel" placeholder="p. ej. 51987654321" maxlength="30" class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm" />
          <p class="text-[10px] text-theme-text-muted mt-1">Con código de país, sin espacios ni símbolos. Se usa para enviarle reportes.</p>
        </div>
        <div>
          <label class="block text-[11px] text-theme-text-muted mb-1">Presupuesto mensual <span class="text-theme-text-muted">(opcional)</span></label>
          <input v-model.number="form.presupuesto" type="number" step="0.01" min="0" placeholder="0.00" class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm" />
        </div>
        <div class="flex gap-2 pt-1">
          <button class="flex-1 px-4 py-2.5 rounded-xl bg-theme-input text-theme-text-sec text-sm" @click="cerrarForm">Cancelar</button>
          <button class="flex-1 px-4 py-2.5 rounded-xl bg-fuchsia-500 text-white text-sm font-semibold disabled:opacity-50" :disabled="!form.nombre.trim() || guardando" @click="guardar">
            {{ form.id ? 'Guardar' : 'Crear' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Lista de perfiles -->
    <div class="px-5 space-y-2">
      <div v-if="cargando && !perfiles.length" class="space-y-2">
        <div v-for="i in 2" :key="i" class="h-16 bg-theme-card rounded-xl shimmer"></div>
      </div>
      <div v-else-if="!perfiles.length && !mostrarForm" class="text-center py-10">
        <p class="text-sm text-theme-text-sec">Aún no tienes perfiles de familiares</p>
        <p class="text-[11px] text-theme-text-muted mt-1">Crea uno para empezar a administrar sus finanzas</p>
      </div>

      <div
        v-for="p in perfiles"
        :key="p.id"
        class="bg-theme-card border border-theme-border rounded-xl p-3"
        :class="perfilActivoId === p.id ? 'ring-1 ring-fuchsia-500/40' : ''"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-fuchsia-500/15 flex items-center justify-center text-sm font-bold text-fuchsia-300 shrink-0">
              {{ inicial(p.nombre) }}
            </div>
            <div class="min-w-0">
              <p class="text-sm text-theme-text font-semibold truncate">{{ p.nombre }}</p>
              <p class="text-[10px] text-theme-text-muted truncate">
                <span v-if="p.presupuesto > 0">Presup.: {{ currencySymbol }} {{ formatMonto(p.presupuesto) }}</span>
                <span v-if="p.presupuesto > 0 && p.telefono"> · </span>
                <span v-if="p.telefono">📱 {{ p.telefono }}</span>
                <span v-if="perfilActivoId === p.id" class="text-fuchsia-400"> · Activo</span>
              </p>
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
const { currencySymbol, formatMonto } = useCurrency()
const toast = useToast()

const mostrarForm = ref(false)
const guardando = ref(false)
const form = reactive({ id: null, nombre: '', telefono: '', presupuesto: null })

onMounted(fetchPerfiles)

function inicial(nombre) {
  return (nombre || '?').trim().charAt(0).toUpperCase()
}

function resetForm() {
  form.id = null
  form.nombre = ''
  form.telefono = ''
  form.presupuesto = null
}

function abrirNuevo() {
  if (mostrarForm.value && !form.id) {
    mostrarForm.value = false
    return
  }
  resetForm()
  mostrarForm.value = true
}

function abrirEdicion(p) {
  form.id = p.id
  form.nombre = p.nombre
  form.telefono = p.telefono || ''
  form.presupuesto = p.presupuesto || null
  mostrarForm.value = true
}

function cerrarForm() {
  mostrarForm.value = false
  resetForm()
}

async function guardar() {
  const nombre = form.nombre.trim()
  if (!nombre) return
  guardando.value = true
  const datos = { nombre, telefono: form.telefono.trim(), presupuesto: Number(form.presupuesto) || 0 }
  try {
    if (form.id) {
      await actualizarPerfil(form.id, datos)
      toast.success('Perfil actualizado')
    } else {
      await crearPerfil(datos)
      toast.success('Perfil creado')
    }
    cerrarForm()
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo guardar el perfil')
  } finally {
    guardando.value = false
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
