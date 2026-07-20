<template>
  <div
    v-if="mostrar"
    class="sticky top-0 z-30 border-b backdrop-blur-sm"
    :class="
      viendoPerfil
        ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
        : 'bg-theme-card/90 border-theme-border text-theme-text-sec'
    "
  >
    <button
      type="button"
      class="w-full flex items-center gap-2 px-4 py-2 text-xs"
      :aria-expanded="abierto"
      @click="abierto = !abierto"
    >
      <svg
        class="w-4 h-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
      </svg>
      <span class="shrink-0 font-medium">Viendo:</span>
      <span class="flex-1 text-left font-semibold truncate">{{ nombrePerfilActivo }}</span>
      <svg
        class="w-4 h-4 shrink-0 transition-transform"
        :class="abierto ? 'rotate-180' : ''"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <div v-if="abierto" class="px-2 pb-2 space-y-1">
      <button
        type="button"
        class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left"
        :class="
          !viendoPerfil
            ? 'bg-theme-accent/20 text-theme-accent font-semibold'
            : 'bg-theme-input text-theme-text-sec'
        "
        @click="elegir(null)"
      >
        <span>Yo (mis finanzas)</span>
        <span v-if="!viendoPerfil">✓</span>
      </button>
      <button
        v-for="p in perfiles"
        :key="p.id"
        type="button"
        class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left"
        :class="
          perfilActivoId === p.id
            ? 'bg-amber-500/25 text-amber-100 font-semibold'
            : 'bg-theme-input text-theme-text-sec'
        "
        @click="elegir(p.id)"
      >
        <span class="truncate">{{ p.nombre }}</span>
        <span v-if="perfilActivoId === p.id">✓</span>
      </button>
    </div>
  </div>
</template>

<script setup>
const { perfiles, perfilActivoId, viendoPerfil, nombrePerfilActivo, fetchPerfiles, entrarPerfil } =
  usePerfiles()
const { modo } = usePerfilModo()

const abierto = ref(false)
const mostrar = computed(
  () => (modo.value === 'selector' && perfiles.value.length > 0) || viendoPerfil.value,
)

function elegir(id) {
  abierto.value = false
  const objetivo = id || null
  if (objetivo === (perfilActivoId.value || null)) return
  entrarPerfil(objetivo)
}

onMounted(() => {
  if (!perfiles.value.length) fetchPerfiles()
})
</script>
