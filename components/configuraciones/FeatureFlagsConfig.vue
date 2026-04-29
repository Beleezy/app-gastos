<template>
  <section class="bg-theme-card rounded-2xl border border-theme-border p-4 md:p-5">
    <header class="mb-3">
      <h3 class="text-sm md:text-base font-semibold text-theme-text">Funciones experimentales</h3>
      <p class="text-xs text-theme-text-sec">
        Activa o desactiva características en pruebas. Los cambios solo aplican en este dispositivo.
      </p>
    </header>

    <ul class="space-y-2">
      <li
        v-for="f in flags"
        :key="f.key"
        class="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-theme-input"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-theme-text">{{ f.label }}</p>
          <p class="text-[0.7rem] text-theme-text-sec">{{ f.description }}</p>
        </div>
        <label
          class="relative inline-flex items-center cursor-pointer mt-0.5"
          :aria-label="`Alternar ${f.label}`"
        >
          <input
            type="checkbox"
            class="sr-only"
            :checked="isEnabled(f.key, f.default)"
            @change="onToggle(f.key, $event.target.checked)"
          />
          <span
            class="w-10 h-6 rounded-full transition-colors"
            :class="isEnabled(f.key, f.default) ? 'bg-theme-accent' : 'bg-theme-border-md'"
          ></span>
          <span
            class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform"
            :class="isEnabled(f.key, f.default) ? 'translate-x-4' : ''"
          ></span>
        </label>
      </li>
    </ul>

    <button
      v-if="hayOverrides"
      type="button"
      class="mt-3 text-xs text-theme-text-sec underline hover:text-theme-text transition-colors"
      @click="resetear"
    >
      Restaurar valores por defecto
    </button>
  </section>
</template>

<script setup>
const { isEnabled, setOverride, clearOverrides, overrides } = useFeatureFlag()
const toast = useToast()

const flags = [
  {
    key: 'predictor_categoria',
    label: 'Predicción inteligente de categoría',
    description: 'Sugiere categoría al escribir el concepto basado en tu histórico.',
    default: true,
  },
  {
    key: 'cola_offline',
    label: 'Cola offline',
    description: 'Encola mutaciones cuando no hay red y sincroniza al volver.',
    default: true,
  },
  {
    key: 'heatmap_mes',
    label: 'Mapa de calor mensual',
    description: 'Muestra la pestaña Mapa con la intensidad de gasto por día.',
    default: true,
  },
  {
    key: 'balance_global',
    label: 'Balance global de deudas',
    description: 'Tarjeta resumen de Me deben / Yo debo en la página de deudas.',
    default: true,
  },
  {
    key: 'plantillas_mes',
    label: 'Plantillas de plan mensual',
    description: 'Permite guardar y reutilizar planes mensuales como plantillas.',
    default: true,
  },
  {
    key: 'stream_llm',
    label: 'Streaming LLM (beta)',
    description: 'Devuelve gastos a medida que el modelo los detecta. Aún en pruebas.',
    default: false,
  },
]

const hayOverrides = computed(() => Object.keys(overrides.value || {}).length > 0)

function onToggle(key, value) {
  setOverride(key, value)
  toast.info(`${key}: ${value ? 'activado' : 'desactivado'}`, 1500)
}

function resetear() {
  clearOverrides()
  toast.success('Configuración de funciones restaurada')
}
</script>
