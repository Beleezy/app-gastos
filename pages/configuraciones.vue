<template>
  <div>
    <LayoutAppHeader>
      <template #title>Configuraciones</template>
    </LayoutAppHeader>

    <div class="max-w-lg mx-auto px-4 py-4 space-y-4">
      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="bg-theme-card rounded-xl p-5 animate-pulse">
          <div class="h-4 bg-theme-border-md rounded w-1/3 mb-3"></div>
          <div class="h-10 bg-theme-border-md rounded w-full"></div>
        </div>
      </div>

      <template v-else>
        <!-- Nombre de usuario -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <label class="text-sm font-medium text-theme-text">Nombre</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">Tu nombre aparecera en los reportes PDF generados.</p>
          <input
            v-model="form.nombre"
            type="text"
            maxlength="100"
            class="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
            placeholder="Ej: Bryan"
          />
        </div>

        <!-- Presupuesto mensual por defecto -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <label class="text-sm font-medium text-theme-text">Presupuesto mensual por defecto</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">Este monto se usara como presupuesto base al crear un nuevo mes en el planificador.</p>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-400">{{ currencySymbol }}</span>
            <input
              v-model="form.presupuestoMensualDefault"
              type="number"
              step="0.01"
              min="0"
              class="flex-1 bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder="0.00"
            />
          </div>
        </div>

        <!-- Moneda preferida -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <label class="text-sm font-medium text-theme-text">Moneda</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">Moneda principal para mostrar tus montos.</p>
          <select
            v-model="form.monedaPreferida"
            class="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
          >
            <option value="PEN">Soles (S/)</option>
            <option value="USD">Dolares (US$)</option>
            <option value="EUR">Euros (EUR)</option>
          </select>
        </div>

        <!-- Zona horaria -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <label class="text-sm font-medium text-theme-text">Zona horaria</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">Afecta el calculo de fechas en el registro por voz.</p>
          <select
            v-model="form.zonaHoraria"
            class="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
          >
            <option value="America/Lima">Lima (UTC-5)</option>
            <option value="America/Bogota">Bogota (UTC-5)</option>
            <option value="America/Mexico_City">Ciudad de Mexico (UTC-6)</option>
            <option value="America/Argentina/Buenos_Aires">Buenos Aires (UTC-3)</option>
            <option value="America/Santiago">Santiago (UTC-4)</option>
            <option value="America/New_York">Nueva York (UTC-5)</option>
            <option value="Europe/Madrid">Madrid (UTC+1)</option>
          </select>
        </div>

        <!-- Locale -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <label class="text-sm font-medium text-theme-text">Formato regional</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">Formato de numeros y reconocimiento de voz.</p>
          <select
            v-model="form.locale"
            class="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
          >
            <option value="es-PE">Espanol (Peru)</option>
            <option value="es-CO">Espanol (Colombia)</option>
            <option value="es-MX">Espanol (Mexico)</option>
            <option value="es-AR">Espanol (Argentina)</option>
            <option value="es-ES">Espanol (Espana)</option>
            <option value="en-US">Ingles (EE.UU.)</option>
          </select>
        </div>

        <!-- Día de inicio de ciclo -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <label class="text-sm font-medium text-theme-text">Dia de inicio del ciclo</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">El dia del mes en que comienza tu ciclo financiero.</p>
          <input
            v-model.number="form.diaInicioCiclo"
            type="number"
            min="1"
            max="28"
            class="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
            placeholder="1"
          />
        </div>

        <!-- Tema -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 110 10A5 5 0 0112 7z" />
              </svg>
              <div>
                <p class="text-sm font-medium text-theme-text">Tema</p>
                <p class="text-xs text-theme-text-sec">{{ isDark ? 'Oscuro' : 'Claro' }}</p>
              </div>
            </div>
            <button
              class="relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none"
              :class="isDark ? 'bg-primary-700' : 'bg-blue-500'"
              @click="toggleTheme"
            >
              <span
                class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300"
                :class="isDark ? 'left-0.5' : 'left-6'"
              ></span>
            </button>
          </div>
        </div>

        <!-- Save button -->
        <button
          class="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
          :class="hasChanges ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-primary-700/50 text-gray-500 cursor-not-allowed'"
          :disabled="!hasChanges || saving"
          @click="guardar"
        >
          {{ saving ? 'Guardando...' : 'Guardar cambios' }}
        </button>

        <!-- Toast -->
        <Transition name="toast">
          <div v-if="toastMsg"
            class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg backdrop-blur-sm"
          >
            {{ toastMsg }}
          </div>
        </Transition>
      </template>

      <!-- App info -->
      <div class="text-center pt-4 pb-8">
        <p class="text-xs text-theme-text-muted">Mis Finanzas v{{ useRuntimeConfig().public.appVersion }}</p>
        <p class="text-xs text-theme-text-muted mt-1">Sistema de finanzas personales</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const { config, isLoading, fetchConfig, updateConfig } = useConfiguraciones()
const { currencySymbol } = useCurrency()
const { isDark, toggleTheme } = useTheme()

const form = reactive({
  nombre: '',
  presupuestoMensualDefault: 0,
  monedaPreferida: 'PEN',
  diaInicioCiclo: 1,
  zonaHoraria: 'America/Lima',
  locale: 'es-PE',
})

const originalValues = ref({})
const saving = ref(false)
const toastMsg = ref('')

const hasChanges = computed(() => {
  return form.nombre !== originalValues.value.nombre
    || form.presupuestoMensualDefault != originalValues.value.presupuestoMensualDefault
    || form.monedaPreferida !== originalValues.value.monedaPreferida
    || form.diaInicioCiclo != originalValues.value.diaInicioCiclo
    || form.zonaHoraria !== originalValues.value.zonaHoraria
    || form.locale !== originalValues.value.locale
})

function loadFromConfig() {
  if (!config.value) return
  form.nombre = config.value.nombre || ''
  form.presupuestoMensualDefault = parseFloat(config.value.presupuestoMensualDefault) || 0
  form.monedaPreferida = config.value.monedaPreferida || 'PEN'
  form.diaInicioCiclo = config.value.diaInicioCiclo || 1
  form.zonaHoraria = config.value.zonaHoraria || 'America/Lima'
  form.locale = config.value.locale || 'es-PE'
  originalValues.value = { ...form }
}

async function guardar() {
  saving.value = true
  try {
    await updateConfig({
      nombre: form.nombre,
      presupuestoMensualDefault: parseFloat(form.presupuestoMensualDefault) || 0,
      monedaPreferida: form.monedaPreferida,
      diaInicioCiclo: form.diaInicioCiclo,
      zonaHoraria: form.zonaHoraria,
      locale: form.locale,
    })
    originalValues.value = { ...form }
    toastMsg.value = 'Configuracion guardada'
    setTimeout(() => { toastMsg.value = '' }, 2500)
  } catch (e) {
    useToast().error(handleApiError(e))
  } finally {
    saving.value = false
  }
}

watch(config, loadFromConfig)

onMounted(async () => {
  await fetchConfig()
})
</script>

<style scoped>
.toast-enter-active { transition: all 0.3s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translate(-50%, 20px); }
.toast-leave-to { opacity: 0; transform: translate(-50%, -10px); }
</style>
