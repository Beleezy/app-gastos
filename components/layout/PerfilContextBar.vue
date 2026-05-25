<template>
  <div
    v-if="mostrar"
    class="sticky top-0 z-30 flex items-center gap-2 px-4 py-2 text-xs border-b backdrop-blur-sm"
    :class="viendoPerfil
      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
      : 'bg-theme-card/90 border-theme-border text-theme-text-sec'"
  >
    <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
    <span class="shrink-0 font-medium">Viendo:</span>
    <select
      :value="perfilActivoId || ''"
      class="flex-1 min-w-0 bg-transparent font-semibold focus:outline-none cursor-pointer"
      aria-label="Cambiar de perfil"
      @change="onChange"
    >
      <option value="">Yo (mis finanzas)</option>
      <option v-for="p in perfiles" :key="p.id" :value="p.id">{{ p.nombre }}</option>
    </select>
    <button
      v-if="viendoPerfil"
      class="shrink-0 px-2 py-1 rounded-md bg-amber-500/20 font-semibold"
      @click="entrarPerfil(null)"
    >
      Volver a mí
    </button>
  </div>
</template>

<script setup>
const { perfiles, perfilActivoId, viendoPerfil, fetchPerfiles, entrarPerfil } = usePerfiles()
const { modo } = usePerfilModo()

const mostrar = computed(
  () => (modo.value === 'selector' && perfiles.value.length > 0) || viendoPerfil.value,
)

function onChange(e) {
  entrarPerfil(e.target.value || null)
}

onMounted(() => {
  if (!perfiles.value.length) fetchPerfiles()
})
</script>
