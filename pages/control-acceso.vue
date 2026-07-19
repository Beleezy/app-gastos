<template>
  <div class="min-h-screen pb-4">
    <!-- Header -->
    <div class="px-5 pt-8 pb-3 relative overflow-hidden">
      <div
        class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-theme-accent/10 rounded-full blur-3xl"
      ></div>
      <div class="relative flex items-center gap-3 mb-1">
        <button
          class="w-9 h-9 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-text hover:bg-theme-border-md transition-colors shrink-0"
          aria-label="Volver"
          @click="$router.back()"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold text-theme-text">Control de acceso</h1>
          <p class="text-[0.6875rem] text-theme-text-sec mt-0.5">
            Aprueba quién puede usar el sistema
          </p>
        </div>
      </div>
    </div>

    <div v-if="!esSuperadmin" class="px-5 py-12 text-center text-sm text-theme-text-sec">
      No tienes permisos para ver esta página.
    </div>

    <template v-else>
      <!-- Pendientes de aprobación -->
      <div class="px-5 mb-5">
        <p class="text-[0.6875rem] uppercase tracking-wider text-theme-text-muted mb-2 px-1">
          Correos pendientes de aprobación
        </p>
        <div v-if="cargando && !pendientes.length" class="space-y-2">
          <div v-for="i in 2" :key="i" class="h-16 bg-theme-card rounded-xl shimmer"></div>
        </div>
        <div
          v-else-if="!pendientes.length"
          class="bg-theme-card rounded-2xl border border-theme-border p-6 text-center text-xs text-theme-text-muted"
        >
          No hay solicitudes pendientes.
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="i in pendientes"
            :key="i.id"
            class="bg-theme-card rounded-2xl border border-amber-500/30 p-3"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-base shrink-0"
              >
                ⏳
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-theme-text truncate">
                  {{ i.nombre || i.email }}
                </p>
                <p class="text-[0.6875rem] text-theme-text-muted truncate">{{ i.email }}</p>
              </div>
            </div>
            <div class="flex gap-2 mt-2.5">
              <button
                class="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
                :disabled="ocupado === i.id"
                @click="onAprobar(i)"
              >
                Aprobar
              </button>
              <button
                class="flex-1 py-2 rounded-lg bg-theme-input text-theme-text-sec text-xs font-semibold disabled:opacity-50"
                :disabled="ocupado === i.id"
                @click="onRechazar(i)"
              >
                Rechazar
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Usuarios del sistema -->
      <div class="px-5">
        <p class="text-[0.6875rem] uppercase tracking-wider text-theme-text-muted mb-2 px-1">
          Usuarios con acceso
        </p>
        <ul class="space-y-1.5">
          <li
            v-for="u in usuarios"
            :key="u.id"
            class="flex items-center justify-between bg-theme-card border border-theme-border rounded-xl px-3 py-2.5"
          >
            <div class="min-w-0">
              <p class="text-xs font-medium text-theme-text truncate">{{ u.nombre }}</p>
              <p class="text-[0.6875rem] text-theme-text-muted truncate">
                {{ u.email }}<span v-if="u.rol === 'superadmin'"> · superadmin</span>
              </p>
            </div>
            <button
              type="button"
              class="relative inline-flex h-6 w-11 items-center rounded-full after:absolute after:-inset-y-2.5 after:-inset-x-2 after:content-[''] transition-colors shrink-0 disabled:opacity-40"
              :class="u.permitido ? 'bg-emerald-500' : 'bg-theme-border-md'"
              :disabled="u.rol === 'superadmin' || ocupado === u.id"
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
  </div>
</template>

<script setup>
useHead({ title: 'Control de acceso · Mis Finanzas' })

const {
  esSuperadmin,
  pendientes,
  usuarios,
  cargando,
  fetchMe,
  fetchAcceso,
  aprobar,
  rechazar,
  setPermitidoUsuario,
} = useSuperadmin()
const toast = useToast()
const ocupado = ref(null)

onMounted(async () => {
  await fetchMe()
  if (esSuperadmin.value) await fetchAcceso()
})

async function onAprobar(i) {
  ocupado.value = i.id
  try {
    await aprobar(i.id)
    toast.success(`${i.email} aprobado`)
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo aprobar')
  } finally {
    ocupado.value = null
  }
}

async function onRechazar(i) {
  ocupado.value = i.id
  try {
    await rechazar(i.id)
    toast.success('Solicitud rechazada')
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo rechazar')
  } finally {
    ocupado.value = null
  }
}

async function onToggle(u) {
  ocupado.value = u.id
  try {
    await setPermitidoUsuario(u.id, !u.permitido)
  } catch (e) {
    toast.error(e?.data?.message || 'No se pudo actualizar el acceso')
  } finally {
    ocupado.value = null
  }
}
</script>
