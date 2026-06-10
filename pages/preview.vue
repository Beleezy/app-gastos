<template>
  <div class="min-h-screen bg-theme-bg text-theme-text">
    <!-- Barra superior -->
    <header class="sticky top-0 z-40 bg-theme-card/95 backdrop-blur border-b border-theme-border">
      <div class="flex items-center justify-between px-4 py-2.5 max-w-lg mx-auto">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 text-[0.66rem] font-bold uppercase tracking-wider">
          <span class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
          Vista previa · V3
        </span>
        <button
          class="flex items-center gap-1.5 min-h-[44px] px-2 text-[0.78rem] font-medium text-theme-text-sec hover:text-theme-text transition-colors"
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
        <PreviewDashboard v-if="vista === 'inicio'" key="inicio" @ir="ir" />
        <PreviewPlanificador v-else-if="vista === 'planificador'" key="planificador" />
        <PreviewRegistro v-else-if="vista === 'registro'" key="registro" />
        <PreviewDeudas v-else-if="vista === 'deudas'" key="deudas" />
        <PreviewIngresos v-else-if="vista === 'ingresos'" key="ingresos" />
        <PreviewAhorros v-else-if="vista === 'ahorros'" key="ahorros" />
        <PreviewFuturos v-else-if="vista === 'futuros'" key="futuros" />
        <PreviewCalendario v-else-if="vista === 'calendario'" key="calendario" />
        <PreviewMetricas v-else-if="vista === 'metricas'" key="metricas" />
        <PreviewReportes v-else-if="vista === 'reportes'" key="reportes" />
        <PreviewFamilia v-else-if="vista === 'familia'" key="familia" />
        <PreviewConfiguracion v-else-if="vista === 'configuracion'" key="configuracion" />
        <PreviewDashboard v-else key="fallback" @ir="ir" />
      </Transition>
    </main>

    <!-- Hoja "Más": todos los módulos. Queda DEBAJO del nav (z-50 < z-60):
         las pestañas inferiores siguen visibles y tocables con la hoja abierta. -->
    <Transition name="sheet">
      <div v-if="sheetMas" class="fixed inset-0 z-50 flex items-end justify-center">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="sheetMas = false"></div>
        <div
          class="relative w-full max-w-lg bg-theme-card rounded-t-3xl border-t border-theme-border p-5 max-h-[78vh] overflow-y-auto"
          style="padding-bottom: calc(5.5rem + env(safe-area-inset-bottom))"
        >
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-bold text-theme-text">Todos los módulos</h2>
            <button
              class="w-11 h-11 rounded-full bg-theme-border-md flex items-center justify-center text-theme-text-sec"
              aria-label="Cerrar"
              @click="sheetMas = false"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="grid grid-cols-3 gap-2.5">
            <button
              v-for="m in modulosMas"
              :key="m.vista"
              class="rounded-2xl border p-3 min-h-[84px] flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-transform"
              :class="vista === m.vista ? 'border-violet-400/60 bg-violet-500/10' : 'border-theme-border bg-theme-input'"
              @click="ir(m.vista)"
            >
              <span class="text-2xl">{{ m.icon }}</span>
              <span class="text-[0.66rem] text-center leading-tight" :class="vista === m.vista ? 'text-violet-300 font-semibold' : 'text-theme-text-sec'">{{ m.label }}</span>
            </button>
          </div>
          <p class="text-[0.66rem] text-theme-text-muted text-center mt-4">
            Interfaces rediseñadas (V3) con tus datos reales, en modo lectura.
          </p>
        </div>
      </div>
    </Transition>

    <!-- Nav inferior V3: siempre por encima de la hoja "Más" -->
    <nav class="fixed bottom-0 inset-x-0 z-[60] bg-theme-card/95 backdrop-blur border-t border-theme-border">
      <div class="max-w-lg mx-auto flex items-stretch px-1 py-1.5" style="padding-bottom: max(0.4rem, env(safe-area-inset-bottom))">
        <button
          v-for="t in tabs"
          :key="t.id"
          class="flex-1 min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors"
          :class="tabActiva(t) ? 'text-theme-accent bg-theme-accent-bg/60' : 'text-theme-text-muted'"
          @click="tocarTab(t)"
        >
          <span class="text-lg leading-none">{{ t.icon }}</span>
          <span class="text-[0.62rem] font-semibold leading-none max-w-full px-0.5 truncate">{{ t.label }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const { enabled, initUiPreview } = useUiPreview()
const { initTheme } = useTheme()
const route = useRoute()
const router = useRouter()

const VISTAS = ['inicio', 'planificador', 'registro', 'deudas', 'ingresos', 'ahorros', 'futuros', 'calendario', 'metricas', 'reportes', 'familia', 'configuracion']

// La vista vive en la URL (?vista=...): cada módulo es enlazable y el botón
// atrás del teléfono regresa al módulo anterior en lugar de salir del preview.
const vista = computed(() => {
  const v = String(route.query.vista || 'inicio')
  return VISTAS.includes(v) ? v : 'inicio'
})

const sheetMas = ref(false)

function ir(v) {
  sheetMas.value = false
  if (v === vista.value) return
  router.push({ query: v === 'inicio' ? {} : { vista: v } })
}

// Etiquetas cortas a propósito: con texto grande a 380px caben sin cortarse.
const tabs = [
  { id: 'inicio', label: 'Inicio', icon: '🏠' },
  { id: 'planificador', label: 'Plan', icon: '📋' },
  { id: 'registro', label: 'Registro', icon: '🎙️' },
  { id: 'deudas', label: 'Deudas', icon: '💳' },
  { id: 'mas', label: 'Más', icon: '⊞' },
]

const EN_TABS = ['inicio', 'planificador', 'registro', 'deudas']

function tabActiva(t) {
  if (t.id === 'mas') return sheetMas.value || !EN_TABS.includes(vista.value)
  return !sheetMas.value && vista.value === t.id
}

function tocarTab(t) {
  if (t.id === 'mas') {
    sheetMas.value = !sheetMas.value
    return
  }
  ir(t.id)
}

const modulosMas = [
  { icon: '🏠', label: 'Inicio', vista: 'inicio' },
  { icon: '📋', label: 'Planificador', vista: 'planificador' },
  { icon: '🎙️', label: 'Registro', vista: 'registro' },
  { icon: '💳', label: 'Deudas', vista: 'deudas' },
  { icon: '💵', label: 'Ingresos', vista: 'ingresos' },
  { icon: '🐷', label: 'Ahorros', vista: 'ahorros' },
  { icon: '🛍️', label: 'Futuros', vista: 'futuros' },
  { icon: '📅', label: 'Calendario', vista: 'calendario' },
  { icon: '📊', label: 'Métricas', vista: 'metricas' },
  { icon: '📄', label: 'Reportes', vista: 'reportes' },
  { icon: '👨‍👩‍👧', label: 'Familia', vista: 'familia' },
  { icon: '⚙️', label: 'Configuración', vista: 'configuracion' },
]

function salir() {
  navigateTo('/configuraciones')
}

// Si la ruta cambia (atrás del navegador incluido), la hoja no debe quedarse abierta.
watch(() => route.query.vista, () => { sheetMas.value = false })

onMounted(() => {
  initUiPreview()
  // Esta página no usa layout: hay que hidratar tema/acento/tamaño de letra
  // desde localStorage aquí (los layouts lo hacen en el resto de la app).
  initTheme()
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
