<template>
  <div class="px-4 pt-3 pb-28">
    <h1 class="text-2xl font-extrabold text-gradient-blue leading-tight mb-0.5">Deudas</h1>
    <p class="text-[0.78rem] text-theme-text-sec mb-4">Lo que te deben y lo que debes</p>

    <div v-if="loading" class="space-y-3">
      <div class="h-28 rounded-2xl bg-theme-card shimmer"></div>
      <div class="h-20 rounded-2xl bg-theme-card shimmer"></div>
      <div class="h-20 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <!-- Balance global -->
      <div class="rounded-2xl border border-theme-border bg-gradient-to-br from-theme-card to-theme-card/60 p-4 mb-3">
        <div class="flex items-center justify-between">
          <span class="text-[0.6rem] uppercase tracking-wider font-bold text-theme-text-muted">Balance neto</span>
          <SharedMoney :value="balance.balanceNeto" signo tone="auto" class="text-sm font-bold" />
        </div>
        <div class="grid grid-cols-2 gap-3 mt-3">
          <div class="rounded-xl bg-theme-input p-3">
            <p class="text-[0.58rem] uppercase tracking-wide text-theme-text-muted">Me deben</p>
            <SharedMoney :value="balance.totalMeDeben" compact tone="green" class="text-lg font-extrabold block mt-0.5" />
          </div>
          <div class="rounded-xl bg-theme-input p-3">
            <p class="text-[0.58rem] uppercase tracking-wide text-theme-text-muted">Yo debo</p>
            <SharedMoney :value="balance.totalYoDebo" compact tone="red" class="text-lg font-extrabold block mt-0.5" />
          </div>
        </div>
      </div>

      <!-- Tabs me deben / yo debo -->
      <div class="flex gap-2 mb-3 p-1 rounded-xl bg-theme-input">
        <button
          v-for="t in tabs"
          :key="t.id"
          class="flex-1 py-2 rounded-lg text-[0.78rem] font-semibold transition-colors"
          :class="tab === t.id ? 'bg-theme-card text-theme-text shadow-sm' : 'text-theme-text-muted'"
          @click="tab = t.id"
        >
          {{ t.label }}
        </button>
      </div>

      <!-- Lista de personas -->
      <div v-if="personasTab.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
        <p class="text-sm text-theme-text-sec">Sin deudas en esta sección</p>
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="p in personasTab"
          :key="p.id"
          class="rounded-2xl border bg-theme-card p-3.5"
          :class="p.tieneVencidas ? 'border-red-500/40' : 'border-theme-border'"
        >
          <!-- items-start: el avatar queda arriba aunque el nombre ocupe 2 líneas -->
          <div class="flex items-start gap-3">
            <div
              class="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              :class="tab === 'me_deben' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'"
            >
              {{ iniciales(p.nombre) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-theme-text leading-snug line-clamp-2 break-words">{{ p.nombre }}</p>
              <p class="text-[0.68rem] text-theme-text-muted mt-0.5">
                {{ p.deudasActivas }} deuda{{ p.deudasActivas !== 1 ? 's' : '' }} activa{{ p.deudasActivas !== 1 ? 's' : '' }}
                <span v-if="p.tieneVencidas" class="text-red-400 font-medium"> · {{ p.countVencidas }} vencida{{ p.countVencidas !== 1 ? 's' : '' }}</span>
              </p>
            </div>
            <div class="text-right shrink-0">
              <SharedMoney :value="p.totalPendiente" compact :tone="tab === 'me_deben' ? 'green' : 'red'" class="text-base font-extrabold" />
              <p class="text-[0.58rem] text-theme-text-muted mt-0.5">pendiente</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()

const loading = ref(true)
const balance = ref({ totalMeDeben: 0, totalYoDebo: 0, balanceNeto: 0 })
const personas = ref({ me_deben: [], yo_debo: [] })
const tab = ref('me_deben')

const tabs = [
  { id: 'me_deben', label: 'Me deben' },
  { id: 'yo_debo', label: 'Yo debo' },
]

const personasTab = computed(() => personas.value[tab.value] || [])

function iniciales(nombre) {
  if (!nombre) return '?'
  const palabras = nombre.trim().split(/\s+/).filter(w => /[a-zA-Z0-9]/.test(w))
  if (!palabras.length) return nombre.slice(0, 2).toUpperCase()
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase()
  return (palabras[0][0] + palabras[1][0]).toUpperCase()
}

onMounted(async () => {
  try {
    const [bal, md, yd] = await Promise.all([
      apiFetch('/api/deudas/balance'),
      apiFetch('/api/deudas/personas', { query: { tipo: 'me_deben' } }),
      apiFetch('/api/deudas/personas', { query: { tipo: 'yo_debo' } }),
    ])
    balance.value = bal || balance.value
    personas.value = {
      me_deben: Array.isArray(md) ? md : [],
      yo_debo: Array.isArray(yd) ? yd : [],
    }
  } catch {
    // preview: silencioso
  } finally {
    loading.value = false
  }
})
</script>
