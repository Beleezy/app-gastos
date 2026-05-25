<template>
  <div v-if="esSuperadmin" class="bg-theme-card rounded-2xl p-5 border border-theme-accent/30 mt-4">
    <div class="flex items-center gap-2 mb-1">
      <h3 class="font-semibold text-theme-text">Control de acceso</h3>
      <span class="px-2 py-0.5 rounded-full bg-theme-accent text-theme-on-accent text-[10px] font-bold uppercase tracking-wider">
        Superadmin
      </span>
    </div>
    <p class="text-sm text-theme-text-sec leading-relaxed mb-4">
      Solo los correos autorizados pueden ingresar al sistema. Agrega aquí quién tiene acceso.
    </p>

    <!-- Agregar correo -->
    <form class="flex items-center gap-2 mb-4" @submit.prevent="onAgregar">
      <input
        v-model="nuevoEmail"
        type="email"
        inputmode="email"
        placeholder="correo@ejemplo.com"
        class="flex-1 bg-theme-input border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-accent"
      />
      <button
        type="submit"
        :disabled="!nuevoEmail.trim() || guardando"
        class="px-3 py-2 rounded-lg bg-theme-accent text-theme-on-accent text-sm font-semibold disabled:opacity-50 tap-44"
      >
        Autorizar
      </button>
    </form>

    <!-- Allowlist -->
    <p class="text-[10px] uppercase tracking-wider text-theme-text-muted mb-2 px-1">Correos autorizados</p>
    <ul v-if="accesos.length" class="space-y-1.5 mb-4">
      <li
        v-for="a in accesos"
        :key="a.id"
        class="flex items-center justify-between bg-theme-input rounded-lg px-3 py-2"
      >
        <span class="text-xs text-theme-text truncate">{{ a.email }}</span>
        <button
          class="shrink-0 w-7 h-7 rounded-lg text-theme-text-muted hover:text-red-400 hover:bg-red-500/10"
          aria-label="Quitar autorización"
          @click="onQuitar(a.id)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9M4 7h16"/>
          </svg>
        </button>
      </li>
    </ul>
    <p v-else class="text-xs text-theme-text-muted mb-4 px-1">Aún no hay correos autorizados.</p>

    <!-- Usuarios del sistema -->
    <p class="text-[10px] uppercase tracking-wider text-theme-text-muted mb-2 px-1">Usuarios registrados</p>
    <ul class="space-y-1.5">
      <li
        v-for="u in usuarios"
        :key="u.id"
        class="flex items-center justify-between bg-theme-input rounded-lg px-3 py-2"
      >
        <div class="min-w-0">
          <p class="text-xs font-medium text-theme-text truncate">{{ u.nombre }}</p>
          <p class="text-[10px] text-theme-text-muted truncate">{{ u.email }}<span v-if="u.rol === 'superadmin'"> · superadmin</span></p>
        </div>
        <button
          type="button"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 disabled:opacity-40"
          :class="u.permitido ? 'bg-emerald-500' : 'bg-theme-border-md'"
          :disabled="u.rol === 'superadmin'"
          :aria-pressed="u.permitido"
          :aria-label="u.permitido ? 'Revocar acceso' : 'Dar acceso'"
          @click="onToggle(u)"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            :class="u.permitido ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
const {
  esSuperadmin, accesos, usuarios,
  fetchMe, fetchAccesos, agregarAcceso, quitarAcceso, setPermitidoUsuario,
} = useSuperadmin()

const { exito, error: notificarError } = useNotificacionLocal()
const nuevoEmail = ref('')
const guardando = ref(false)

async function onAgregar() {
  const email = nuevoEmail.value.trim()
  if (!email) return
  guardando.value = true
  try {
    await agregarAcceso(email)
    nuevoEmail.value = ''
    exito('Correo autorizado')
  } catch (e) {
    notificarError(e?.data?.message || 'No se pudo autorizar el correo')
  } finally {
    guardando.value = false
  }
}

async function onQuitar(id) {
  try {
    await quitarAcceso(id)
  } catch {
    notificarError('No se pudo quitar el correo')
  }
}

async function onToggle(u) {
  try {
    await setPermitidoUsuario(u.id, !u.permitido)
  } catch (e) {
    notificarError(e?.data?.message || 'No se pudo actualizar el acceso')
  }
}

onMounted(async () => {
  await fetchMe()
  if (esSuperadmin.value) await fetchAccesos()
})
</script>
