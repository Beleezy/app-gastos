<template>
  <div class="px-4 pt-3 pb-32">
    <PreviewPageHeader icon="⚙️" title="Configuración" subtitle="Perfil y preferencias" />

    <div v-if="loading" class="space-y-3">
      <div class="h-32 rounded-2xl bg-theme-card shimmer"></div>
      <div class="h-32 rounded-2xl bg-theme-card shimmer"></div>
    </div>

    <template v-else>
      <!-- Perfil -->
      <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Perfil</p>
      <div class="rounded-2xl border border-theme-border bg-theme-card divide-y divide-theme-border/60 mb-4">
        <div class="flex items-center justify-between gap-3 px-4 py-3.5 min-h-[52px]">
          <span class="text-sm text-theme-text">Nombre</span>
          <span class="text-sm text-theme-text-sec text-right min-w-0 truncate">{{ config.nombre || 'Sin definir' }}</span>
        </div>
        <div class="flex items-center justify-between gap-3 px-4 py-3.5 min-h-[52px]">
          <span class="text-sm text-theme-text min-w-0 truncate">Presupuesto por defecto</span>
          <PreviewMoney :value="config.presupuestoMensualDefault" entero class="text-sm font-semibold text-theme-text shrink-0" />
        </div>
        <div class="flex items-center justify-between gap-3 px-4 py-3.5 min-h-[52px]">
          <span class="text-sm text-theme-text">Moneda</span>
          <span class="text-sm text-theme-text-sec shrink-0">{{ monedaLabel }}</span>
        </div>
        <div class="flex items-center justify-between gap-3 px-4 py-3.5 min-h-[52px]">
          <span class="text-sm text-theme-text min-w-0 truncate">Inicio del ciclo</span>
          <span class="text-sm text-theme-text-sec shrink-0">Día {{ config.diaInicioCiclo || 1 }}</span>
        </div>
      </div>

      <!-- Apariencia: el tamaño de letra SÍ es interactivo (mismo ajuste local
           que usa la app actual; no toca la base de datos). -->
      <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Apariencia</p>
      <div class="rounded-2xl border border-theme-border bg-theme-card p-4 mb-4">
        <p class="text-sm text-theme-text mb-2.5">Tamaño de letra</p>
        <div class="flex gap-2 p-1 rounded-2xl bg-theme-input">
          <button
            v-for="s in FONT_SIZES"
            :key="s.id"
            class="flex-1 min-h-[44px] rounded-xl text-[0.8rem] font-semibold transition-colors"
            :class="fontSize === s.id ? 'bg-theme-card text-theme-text shadow-sm' : 'text-theme-text-muted'"
            @click="setFontSize(s.id)"
          >
            {{ s.label }}
          </button>
        </div>
        <p class="text-[0.68rem] text-theme-text-muted mt-2.5 leading-snug">
          Prueba "Grande" aquí mismo: toda la vista previa está diseñada para no cortar textos ni montos con ese tamaño.
        </p>
      </div>

      <!-- Preferencias (solo lectura en la vista previa) -->
      <p class="text-[0.66rem] uppercase tracking-wider font-bold text-theme-text-muted mb-2 px-1">Preferencias</p>
      <div class="rounded-2xl border border-theme-border bg-theme-card divide-y divide-theme-border/60">
        <div v-for="pref in prefs" :key="pref.label" class="flex items-center justify-between gap-3 px-4 py-3.5 min-h-[52px]">
          <span class="text-sm text-theme-text min-w-0 truncate">{{ pref.label }}</span>
          <span
            class="shrink-0 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold"
            :class="pref.on ? 'bg-emerald-500/15 text-emerald-400' : 'bg-theme-border-md text-theme-text-muted'"
          >{{ pref.on ? 'Activado' : 'Desactivado' }}</span>
        </div>
      </div>
      <p class="text-[0.66rem] text-theme-text-muted text-center mt-4">
        Los cambios de preferencias se hacen en la app actual; aquí solo se muestran.
      </p>
    </template>
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()
const { fontSize, setFontSize, FONT_SIZES } = useTheme()

const loading = ref(true)
const config = ref({})

const MONEDAS = { PEN: 'Soles (S/)', USD: 'Dólares ($)', EUR: 'Euros (€)' }
const monedaLabel = computed(() => MONEDAS[config.value.monedaPreferida] || config.value.monedaPreferida || 'Soles (S/)')

const prefs = computed(() => [
  { label: 'Vista de registro por día', on: !!config.value.vistaRegistroDia },
  { label: 'Vista de registro por semana', on: !!config.value.vistaRegistroSemana },
  { label: 'Modo daltónico', on: !!config.value.modoDaltonico },
])

onMounted(async () => {
  try {
    const r = await apiFetch('/api/configuraciones')
    config.value = r || {}
  } catch {
    config.value = {}
  } finally {
    loading.value = false
  }
})
</script>
