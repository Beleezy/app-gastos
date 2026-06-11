<template>
  <div class="px-4 pt-3 pb-32">
    <Preview3PageHeader icon="👨‍👩‍👧" title="Familia" subtitle="Lleva las finanzas de tus familiares" accent="violet" />

    <div class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-4 mb-4 text-[0.74rem] text-theme-text-sec leading-relaxed">
      Crea un perfil por cada familiar cuyas finanzas administres (p. ej. papá o abuelo).
      Al <span class="text-theme-text font-semibold">entrar</span> a un perfil, Registro, Planificador,
      Ahorro y Deudas muestran y guardan los datos de esa persona.
    </div>

    <div v-if="loading" class="space-y-2">
      <div class="h-20 rounded-2xl bg-theme-card shimmer"></div>
      <div class="h-20 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <button class="w-full rounded-2xl border-2 border-dashed border-violet-400/40 text-violet-300 min-h-[56px] flex items-center justify-center gap-2 text-sm font-semibold mb-4 active:scale-[0.99] transition-transform">
        <span class="text-lg leading-none">+</span> Nuevo perfil de familiar
      </button>

      <div v-if="perfiles.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
        <p class="text-sm text-theme-text">Aún no tienes perfiles de familiares</p>
        <p class="text-[0.72rem] text-theme-text-sec mt-1">Crea uno para empezar a administrar sus finanzas.</p>
      </div>
      <div v-else class="space-y-2">
        <article v-for="p in perfiles" :key="p.id" class="rounded-2xl border border-theme-border bg-theme-card p-4">
          <div class="flex items-start gap-3">
            <div class="w-11 h-11 rounded-2xl bg-violet-500/15 text-violet-300 flex items-center justify-center text-sm font-bold shrink-0">
              {{ iniciales(p.nombre) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-theme-text leading-snug line-clamp-2 break-words">{{ p.nombre }}</p>
              <p v-if="p.relacion" class="text-[0.7rem] text-theme-text-muted mt-0.5 truncate">{{ p.relacion }}</p>
            </div>
            <span class="shrink-0 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold bg-violet-500/15 text-violet-300">Entrar →</span>
          </div>
        </article>
      </div>

      <p class="text-[0.66rem] text-theme-text-muted text-center mt-4">
        En la vista previa los perfiles son de solo lectura; adminístralos desde la app actual.
      </p>
    </template>
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()

const loading = ref(true)
const perfiles = ref([])

function iniciales(nombre) {
  if (!nombre) return '?'
  const palabras = nombre.trim().split(/\s+/).filter(w => /[a-zA-Z0-9]/.test(w))
  if (!palabras.length) return nombre.slice(0, 2).toUpperCase()
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase()
  return (palabras[0][0] + palabras[1][0]).toUpperCase()
}

onMounted(async () => {
  try {
    const r = await apiFetch('/api/perfiles')
    perfiles.value = Array.isArray(r) ? r : []
  } catch {
    perfiles.value = []
  } finally {
    loading.value = false
  }
})
</script>
