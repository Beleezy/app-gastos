<template>
  <div class="px-4 pt-3 pb-32">
    <PreviewPageHeader icon="🛍️" title="Gastos futuros" subtitle="Deseos y decisiones pendientes" accent="violet" />

    <div v-if="loading" class="space-y-3">
      <div class="h-32 rounded-2xl bg-theme-card shimmer"></div>
      <div class="h-44 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <div v-if="proyectos.length === 0" class="rounded-2xl border border-dashed border-theme-border bg-theme-card p-8 text-center">
        <p class="text-sm text-theme-text">Aún no tienes proyectos futuros</p>
        <p class="text-[0.72rem] text-theme-text-sec mt-1">Crea uno para comparar opciones antes de decidir.</p>
      </div>

      <template v-else>
        <!-- Inversión estimada del conjunto -->
        <div class="rounded-3xl border border-theme-border bg-gradient-to-br from-violet-500/5 to-theme-card p-4 mb-3">
          <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted">Inversión estimada</p>
          <PreviewMoney :value="totalPromedio" tone="violet" class="text-[1.7rem] font-extrabold block mt-1" />
          <div class="flex items-center justify-between gap-2 mt-1.5 text-[0.7rem] text-theme-text-muted">
            <span class="min-w-0 truncate">{{ proyectos.length }} proyecto{{ proyectos.length !== 1 ? 's' : '' }}</span>
            <span class="shrink-0">
              rango <PreviewMoney :value="totalMinimo" entero /> – <PreviewMoney :value="totalMaximo" entero />
            </span>
          </div>
        </div>

        <div class="space-y-3">
          <article v-for="p in proyectos" :key="p.id" class="rounded-2xl border border-theme-border bg-theme-card overflow-hidden">
            <!-- Cabecera del proyecto (toca para expandir detalles) -->
            <button class="w-full text-left p-4 active:bg-theme-input/40 transition-colors" @click="toggle(p.id)">
              <div class="flex items-start gap-3">
                <span
                  class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-lg"
                  :style="{ backgroundColor: (p.categoriaColor || '#6b7280') + '22' }"
                >{{ p.categoriaIcono || '📦' }}</span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-theme-text leading-snug line-clamp-2 break-words">{{ p.tipoGasto }}</p>
                  <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span v-if="badge(p.prioridad)" class="rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold" :class="badge(p.prioridad).clase">{{ badge(p.prioridad).label }}</span>
                    <span class="text-[0.66rem] text-theme-text-muted">{{ p.categoriaNombre || 'Sin categoría' }} · {{ p.resumen?.totalDetalles || 0 }} detalle{{ (p.resumen?.totalDetalles || 0) !== 1 ? 's' : '' }}</span>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 text-theme-text-muted shrink-0 mt-1 transition-transform"
                  :class="abierto === p.id ? 'rotate-180' : ''"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                ><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25L12 15.75 4.5 8.25" /></svg>
              </div>

              <!-- Rango Mín / Prom / Máx: enteros → 4 cifras completas sin cortes -->
              <div class="grid grid-cols-3 mt-3 rounded-xl bg-theme-input overflow-hidden">
                <div class="px-1.5 py-2 text-center min-w-0">
                  <p class="text-[0.6rem] uppercase tracking-wide text-theme-text-muted">Mín</p>
                  <PreviewMoney :value="p.resumen?.totalMinimo || 0" compact entero tone="green" class="text-[0.82rem] font-bold block mt-0.5" />
                </div>
                <div class="px-1.5 py-2 text-center border-x border-theme-border/60 min-w-0">
                  <p class="text-[0.6rem] uppercase tracking-wide text-theme-text-muted">Prom</p>
                  <PreviewMoney :value="p.resumen?.totalPromedio || 0" compact entero tone="sky" class="text-[0.82rem] font-bold block mt-0.5" />
                </div>
                <div class="px-1.5 py-2 text-center min-w-0">
                  <p class="text-[0.6rem] uppercase tracking-wide text-theme-text-muted">Máx</p>
                  <PreviewMoney :value="p.resumen?.totalMaximo || 0" compact entero tone="amber" class="text-[0.82rem] font-bold block mt-0.5" />
                </div>
              </div>

              <!-- Progreso de decisión -->
              <div v-if="prog(p).total > 0" class="mt-3">
                <div class="flex items-center justify-between text-[0.66rem] mb-1">
                  <span class="text-theme-text-muted">Decididos</span>
                  <span class="font-semibold" :class="prog(p).pct === 100 ? 'text-emerald-400' : 'text-sky-300'">{{ prog(p).decididos }}/{{ prog(p).total }} · {{ prog(p).pct }}%</span>
                </div>
                <div class="h-1.5 w-full rounded-full bg-theme-input overflow-hidden">
                  <div class="h-full rounded-full" :class="prog(p).pct === 100 ? 'bg-emerald-400' : 'bg-sky-400'" :style="{ width: prog(p).pct + '%' }"></div>
                </div>
              </div>
            </button>

            <!-- Detalles + opciones expandidos -->
            <div v-if="abierto === p.id" class="border-t border-theme-border/60 bg-theme-input/20 px-4 py-3 space-y-3">
              <div v-for="det in (p.detalles || [])" :key="det.id" class="rounded-xl border border-theme-border bg-theme-card p-3">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-[0.82rem] font-semibold text-theme-text leading-snug line-clamp-2 break-words flex-1">{{ det.nombre }}</p>
                  <span
                    class="shrink-0 rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold"
                    :class="det.estadoDecision ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'"
                  >{{ det.estadoDecision ? 'Decidido' : 'Pendiente' }}</span>
                </div>
                <div v-if="(det.opciones || []).length" class="mt-2 space-y-1.5">
                  <div v-for="op in det.opciones" :key="op.id" class="rounded-lg bg-theme-input/70 px-2.5 py-2">
                    <p class="text-[0.74rem] text-theme-text leading-snug line-clamp-2 break-words">{{ op.nombre || 'Opción' }}</p>
                    <p class="text-[0.68rem] text-theme-text-muted mt-0.5">
                      <PreviewMoney :value="op.precioMinimo ?? op.precioPromedio ?? 0" compact entero tone="green" />
                      <span v-if="op.precioMaximo != null"> – <PreviewMoney :value="op.precioMaximo" compact entero tone="amber" /></span>
                      <span v-if="op.precioPromedio != null" class="text-sky-400"> · prom. <PreviewMoney :value="op.precioPromedio" compact entero /></span>
                    </p>
                  </div>
                </div>
                <p v-else class="text-[0.68rem] text-theme-text-muted mt-1.5">Sin opciones aún</p>
              </div>
              <p v-if="!(p.detalles || []).length" class="text-[0.72rem] text-theme-text-muted text-center py-2">Este proyecto no tiene detalles</p>
            </div>
          </article>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()

const loading = ref(true)
const proyectos = ref([])
const abierto = ref(null)

function toggle(id) {
  abierto.value = abierto.value === id ? null : id
}

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

const totalMinimo = computed(() => proyectos.value.reduce((s, p) => s + (Number(p.resumen?.totalMinimo) || 0), 0))
const totalMaximo = computed(() => proyectos.value.reduce((s, p) => s + (Number(p.resumen?.totalMaximo) || 0), 0))
const totalPromedio = computed(() => proyectos.value.reduce((s, p) => s + (Number(p.resumen?.totalPromedio) || 0), 0))

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
