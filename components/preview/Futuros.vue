<template>
  <div class="px-4 pt-3 pb-28">
    <h1 class="text-2xl font-extrabold text-gradient-blue leading-tight mb-0.5">Gastos futuros</h1>
    <p class="text-[0.78rem] text-theme-text-sec mb-4">Deseos y decisiones pendientes</p>

    <div v-if="loading" class="space-y-3">
      <div class="h-40 rounded-2xl bg-theme-card shimmer"></div>
      <div class="h-40 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <div v-if="proyectos.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
        <p class="text-sm text-theme-text">Aún no tienes proyectos futuros</p>
        <p class="text-[0.72rem] text-theme-text-sec mt-1">Crea uno para comparar opciones antes de decidir.</p>
      </div>

      <div v-else class="space-y-3">
        <article v-for="p in proyectos" :key="p.id" class="rounded-2xl border border-theme-border bg-theme-card p-4">
          <div class="flex items-start gap-3">
            <span class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-lg" :style="{ backgroundColor: (p.categoriaColor || '#6b7280') + '22' }">{{ p.categoriaIcono || '📦' }}</span>
            <div class="min-w-0 flex-1">
              <div class="flex items-start gap-2">
                <h3 class="text-sm font-semibold text-theme-text leading-snug line-clamp-2 break-words flex-1">{{ p.tipoGasto }}</h3>
                <span v-if="badge(p.prioridad)" class="shrink-0 rounded-full px-2 py-0.5 text-[0.58rem] font-bold" :class="badge(p.prioridad).clase">{{ badge(p.prioridad).label }}</span>
              </div>
              <p class="text-[0.66rem] text-theme-text-muted mt-0.5">{{ p.categoriaNombre || 'Sin categoría' }} · {{ p.resumen?.totalDetalles || 0 }} detalle{{ (p.resumen?.totalDetalles || 0) !== 1 ? 's' : '' }}</p>
            </div>
          </div>

          <!-- Rango Mín / Prom / Máx -->
          <div class="grid grid-cols-3 mt-3 rounded-xl bg-theme-input overflow-hidden">
            <div class="px-2 py-2 text-center min-w-0">
              <p class="text-[0.55rem] uppercase tracking-wide text-theme-text-muted">Mín</p>
              <SharedMoney :value="p.resumen?.totalMinimo || 0" compact tone="green" class="text-[0.8rem] font-bold block mt-0.5" />
            </div>
            <div class="px-2 py-2 text-center border-x border-theme-border/60 min-w-0">
              <p class="text-[0.55rem] uppercase tracking-wide text-theme-text-muted">Prom</p>
              <SharedMoney :value="p.resumen?.totalPromedio || 0" compact tone="sky" class="text-[0.8rem] font-bold block mt-0.5" />
            </div>
            <div class="px-2 py-2 text-center min-w-0">
              <p class="text-[0.55rem] uppercase tracking-wide text-theme-text-muted">Máx</p>
              <SharedMoney :value="p.resumen?.totalMaximo || 0" compact tone="amber" class="text-[0.8rem] font-bold block mt-0.5" />
            </div>
          </div>

          <!-- Progreso de decisión -->
          <div v-if="prog(p).total > 0" class="mt-3">
            <div class="flex items-center justify-between text-[0.62rem] mb-1">
              <span class="text-theme-text-muted">Decididos</span>
              <span class="font-semibold" :class="prog(p).pct === 100 ? 'text-emerald-400' : 'text-sky-300'">{{ prog(p).decididos }}/{{ prog(p).total }} · {{ prog(p).pct }}%</span>
            </div>
            <div class="h-1 w-full rounded-full bg-theme-input overflow-hidden">
              <div class="h-full rounded-full" :class="prog(p).pct === 100 ? 'bg-emerald-400' : 'bg-sky-400'" :style="{ width: prog(p).pct + '%' }"></div>
            </div>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()

const loading = ref(true)
const proyectos = ref([])

function badge(prio) {
  if (prio === 3) return { label: 'Alta', clase: 'bg-red-500/15 text-red-400' }
  if (prio === 2) return { label: 'Media', clase: 'bg-amber-500/15 text-amber-300' }
  if (prio === 1) return { label: 'Baja', clase: 'bg-emerald-500/15 text-emerald-400' }
  return null
}
function prog(p) {
  const total = p.detalles?.length || 0
  if (!total) return { total: 0, decididos: 0, pct: 0 }
  const decididos = p.detalles.filter(d => d.estadoDecision).length
  return { total, decididos, pct: Math.round((decididos / total) * 100) }
}

onMounted(async () => {
  try {
    const r = await apiFetch('/api/futuros')
    proyectos.value = Array.isArray(r?.gastosFuturos) ? r.gastosFuturos : []
  } catch {
    proyectos.value = []
  } finally {
    loading.value = false
  }
})
</script>
