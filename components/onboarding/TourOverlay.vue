<template>
  <Transition name="tour-fade">
    <div
      v-if="state.activo"
      class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`tour-title-${state.pasoActual}`"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="saltarTour"></div>

      <!-- Tour Card -->
      <div
        class="relative w-full sm:max-w-sm bg-theme-card border-t sm:border border-theme-border sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-y-auto overscroll-contain"
        style="max-height: 90vh"
      >
        <!-- Progreso superior -->
        <div class="px-5 pt-5">
          <div class="flex items-center gap-1.5 mb-4">
            <div
              v-for="i in pasos.length"
              :key="i"
              class="h-1 flex-1 rounded-full transition-colors duration-300"
              :class="i <= state.pasoActual + 1 ? 'bg-theme-accent' : 'bg-theme-border-md'"
            ></div>
          </div>
        </div>

        <!-- Contenido del paso -->
        <div class="px-5 pb-5">
          <div v-if="pasoActivo" class="text-center">
            <div
              class="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              :class="pasoActivo.iconoBg || 'bg-theme-accent-bg'"
            >
              <span class="text-3xl">{{ pasoActivo.icono }}</span>
            </div>
            <h2
              :id="`tour-title-${state.pasoActual}`"
              class="text-lg font-bold text-theme-text mb-2"
            >
              {{ pasoActivo.titulo }}
            </h2>
            <p class="text-sm text-theme-text-sec leading-relaxed mb-5 px-2">
              {{ pasoActivo.descripcion }}
            </p>

            <!-- Lista de features destacadas (opcional) -->
            <ul v-if="pasoActivo.features?.length" class="space-y-2 mb-5 text-left">
              <li
                v-for="(f, i) in pasoActivo.features"
                :key="i"
                class="flex items-start gap-2.5 px-1"
              >
                <span
                  class="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-theme-accent-bg text-theme-accent flex items-center justify-center text-[0.6875rem] font-bold"
                >
                  {{ i + 1 }}
                </span>
                <p class="text-xs text-theme-text-sec leading-snug">{{ f }}</p>
              </li>
            </ul>
          </div>

          <!-- Navegación -->
          <div class="flex items-center justify-between gap-2 mt-2">
            <button
              type="button"
              class="text-xs text-theme-text-muted hover:text-theme-text-sec px-3 py-2 min-h-[44px] transition-colors"
              @click="saltarTour"
            >
              Saltar
            </button>
            <div class="flex items-center gap-2">
              <button
                v-if="state.pasoActual > 0"
                type="button"
                class="px-4 py-2 rounded-xl text-sm font-medium text-theme-text-sec bg-theme-input border border-theme-border hover:bg-theme-border-md min-h-[44px] transition-colors"
                @click="anterior"
              >
                Anterior
              </button>
              <button
                type="button"
                class="px-5 py-2 rounded-xl text-sm font-semibold text-theme-on-accent bg-theme-accent hover:bg-theme-accent-dark active:scale-95 min-h-[44px] transition-all"
                @click="siguiente"
              >
                {{ esUltimo ? '¡Listo!' : 'Siguiente' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const {
  state,
  siguientePaso,
  pasoAnterior,
  completarTour,
  saltarTour: dismissTour,
} = useOnboarding()

const { vibrate } = useHaptic()

// Bloquea el scroll del body mientras el tour está activo
const { registerModal, unregisterModal } = useModalLayer()
let tourLocked = false
watch(
  () => state.value.activo,
  (v) => {
    if (v && !tourLocked) {
      tourLocked = true
      registerModal()
    } else if (!v && tourLocked) {
      tourLocked = false
      unregisterModal()
    }
  },
  { immediate: true },
)
onUnmounted(() => {
  if (tourLocked) {
    tourLocked = false
    unregisterModal()
  }
})

const pasos = [
  {
    icono: '👋',
    iconoBg: 'bg-theme-accent-bg',
    titulo: '¡Bienvenido a Mis Finanzas!',
    descripcion:
      'Registra, planifica y prospera. Una app simple para tomar el control de tu dinero, en menos de 1 minuto al día.',
  },
  {
    icono: '🧭',
    iconoBg: 'bg-blue-500/15',
    titulo: 'Cuatro espacios principales',
    descripcion: 'Cada pestaña al pie cumple un rol distinto:',
    features: [
      'Planificador: presupuesto y gastos esperados del mes',
      'Registro: lo que realmente gastaste, por voz, foto o manual',
      'Deudas: quién te debe y a quién le debes',
      'Inicio: resumen de todo en un vistazo',
    ],
  },
  {
    icono: '🎤',
    iconoBg: 'bg-purple-500/15',
    titulo: 'Registrar gasto en segundos',
    descripcion:
      'Toca el micrófono y dicta: "almuerzo quince soles". La IA detecta concepto, monto y categoría. También puedes escanear un voucher o agregar manual.',
  },
  {
    icono: '📅',
    iconoBg: 'bg-amber-500/15',
    titulo: 'Planifica tu mes',
    descripcion:
      'Define presupuesto, agrega gastos esperados (luz, gimnasio, regalos) y compara contra lo real. Los gastos recurrentes se replican mes a mes.',
  },
  {
    icono: '💸',
    iconoBg: 'bg-red-500/15',
    titulo: 'Controla tus deudas',
    descripcion:
      'Registra quién te debe y a quién le debes. Marca pagos parciales, exporta historial a PDF y vincúlate con otros usuarios para compartir saldo en tiempo real.',
  },
  {
    icono: '✨',
    iconoBg: 'bg-emerald-500/15',
    titulo: 'Más adentro encontrarás...',
    descripcion:
      'Gastos futuros (deseos planeados), Ahorros con metas, gráficos por categoría, modo oscuro, exportación a Excel y mucho más.',
    features: [
      'Funciona offline: lo que registras se sincroniza al volver',
      'Personaliza tema, color de acento y tipografía',
      'Puedes ver este tour de nuevo desde Configuración',
    ],
  },
]

const pasoActivo = computed(() => pasos[state.value.pasoActual] || null)
const esUltimo = computed(() => state.value.pasoActual >= pasos.length - 1)

function siguiente() {
  vibrate(10)
  if (esUltimo.value) {
    completarTour()
  } else {
    siguientePaso()
  }
}

function anterior() {
  vibrate(8)
  pasoAnterior()
}

function saltarTour() {
  vibrate(8)
  dismissTour()
}
</script>

<style scoped>
.tour-fade-enter-active {
  transition: opacity 0.3s ease;
}
.tour-fade-leave-active {
  transition: opacity 0.2s ease;
}
.tour-fade-enter-from,
.tour-fade-leave-to {
  opacity: 0;
}
.tour-fade-enter-active > div:last-child {
  animation: tour-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes tour-pop {
  from {
    transform: translateY(20px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
</style>
