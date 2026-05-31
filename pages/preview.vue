<template>
  <div class="min-h-screen bg-theme-bg text-theme-text">
    <!-- Barra superior -->
    <header class="sticky top-0 z-40 bg-theme-card/95 backdrop-blur border-b border-theme-border">
      <div class="flex items-center justify-between px-4 py-2.5 max-w-lg mx-auto">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 text-[0.66rem] font-bold uppercase tracking-wider">
          <span class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
          Vista previa · Beta
        </span>
        <button
          class="flex items-center gap-1.5 text-[0.78rem] font-medium text-theme-text-sec hover:text-theme-text transition-colors"
          @click="salir"
        >
          Salir
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>

    <main class="max-w-lg mx-auto">
      <Transition name="fade" mode="out-in">
        <PreviewDashboard v-if="vista === 'inicio'" key="inicio" />
        <PreviewPlanificador v-else-if="vista === 'planificador'" key="planificador" />
        <PreviewRegistro v-else-if="vista === 'registro'" key="registro" />
        <PreviewDeudas v-else-if="vista === 'deudas'" key="deudas" />
        <PreviewIngresos v-else-if="vista === 'ingresos'" key="ingresos" />
        <PreviewAhorros v-else-if="vista === 'ahorros'" key="ahorros" />
        <PreviewFuturos v-else-if="vista === 'futuros'" key="futuros" />
        <PreviewCalendario v-else-if="vista === 'calendario'" key="calendario" />
        <PreviewMetricas v-else-if="vista === 'metricas'" key="metricas" />
        <PreviewReportes v-else-if="vista === 'reportes'" key="reportes" />
      </Transition>
    </main>

    <!-- Nav inferior estilo R5 -->
    <nav class="fixed bottom-0 inset-x-0 z-40 bg-theme-card/95 backdrop-blur border-t border-theme-border">
      <div class="max-w-lg mx-auto flex items-stretch px-2 py-2" style="padding-bottom: max(0.5rem, env(safe-area-inset-bottom))">
        <button
          v-for="t in tabs"
          :key="t.id"
          class="flex-1 flex flex-col items-center gap-1 py-1 transition-colors"
          :class="vista === t.id ? 'text-theme-accent' : 'text-theme-text-muted'"
          @click="t.id === 'mas' ? (sheetMas = true) : (vista = t.id)"
        >
          <span class="text-lg leading-none">{{ t.icon }}</span>
          <span class="text-[0.6rem] font-medium">{{ t.label }}</span>
        </button>
      </div>
    </nav>

    <!-- Hoja "Más" (R5 · opción A) -->
    <Transition name="sheet">
      <div v-if="sheetMas" class="fixed inset-0 z-50 flex items-end justify-center">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="sheetMas = false"></div>
        <div class="relative w-full max-w-lg bg-theme-card rounded-t-3xl border-t border-theme-border p-5 pb-8" style="padding-bottom: max(2rem, env(safe-area-inset-bottom))">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-bold text-theme-text">Todos los módulos</h2>
            <button class="w-8 h-8 rounded-full bg-theme-border-md flex items-center justify-center text-theme-text-sec" @click="sheetMas = false">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="grid grid-cols-3 gap-2.5">
            <button
              v-for="m in modulosMas"
              :key="m.label"
              class="rounded-2xl border border-theme-border bg-theme-input p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              @click="abrirModulo(m)"
            >
              <span class="text-2xl">{{ m.icon }}</span>
              <span class="text-[0.66rem] text-theme-text-sec text-center leading-tight">{{ m.label }}</span>
            </button>
          </div>
          <p class="text-[0.66rem] text-theme-text-muted text-center mt-4">
            Todos los módulos están rediseñados. Toca cualquiera para abrir su nueva interfaz.
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const { enabled, initUiPreview } = useUiPreview()

const vista = ref('inicio')
const sheetMas = ref(false)

const tabs = [
  { id: 'inicio', label: 'Inicio', icon: '🏠' },
  { id: 'deudas', label: 'Deudas', icon: '💳' },
  { id: 'metricas', label: 'Métricas', icon: '📊' },
  { id: 'mas', label: 'Más', icon: '⋯' },
]

const modulosMas = [
  { icon: '📋', label: 'Planificador', vista: 'planificador' },
  { icon: '🎤', label: 'Registro', vista: 'registro' },
  { icon: '💳', label: 'Deudas', vista: 'deudas' },
  { icon: '💵', label: 'Ingresos', vista: 'ingresos' },
  { icon: '🐷', label: 'Ahorros', vista: 'ahorros' },
  { icon: '🛍️', label: 'Futuros', vista: 'futuros' },
  { icon: '📊', label: 'Métricas', vista: 'metricas' },
  { icon: '📅', label: 'Calendario', vista: 'calendario' },
  { icon: '📄', label: 'Reportes', vista: 'reportes' },
]

function abrirModulo(m) {
  if (m.vista) vista.value = m.vista
  sheetMas.value = false
}

function salir() {
  navigateTo('/configuraciones')
}

onMounted(() => {
  initUiPreview()
  // La vista previa solo se accede si el flag está activo en Configuraciones.
  if (!enabled.value) navigateTo('/configuraciones', { replace: true })
})
</script>

<style scoped>
.sheet-enter-active,
.sheet-leave-active { transition: opacity 0.2s ease; }
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }

.fade-enter-active,
.fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
