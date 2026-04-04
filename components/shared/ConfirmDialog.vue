<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center px-6">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('update:modelValue', false)"></div>
    <div class="relative bg-primary-800 rounded-2xl p-5 w-full max-w-sm border border-primary-700/50 animate-slide-up">
      <div v-if="icon" class="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
        :class="iconBg"
      >
        <svg class="w-5 h-5" :class="iconColor" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" :d="iconPath" />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-white mb-1.5" :class="icon ? 'text-center' : ''">{{ title }}</h3>
      <p class="text-sm text-gray-400 mb-5" :class="icon ? 'text-center' : ''">{{ message }}</p>
      <div class="space-y-2">
        <button
          class="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="confirmClass"
          :disabled="loading"
          @click="$emit('confirm')"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Procesando...
          </span>
          <span v-else>{{ confirmLabel || 'Confirmar' }}</span>
        </button>
        <button
          class="w-full py-2.5 rounded-xl text-gray-500 text-sm font-medium hover:text-gray-300 transition-colors"
          @click="$emit('update:modelValue', false)"
        >
          Cancelar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: Boolean,
  title: { type: String, required: true },
  message: { type: String, required: true },
  confirmLabel: { type: String, default: 'Confirmar' },
  variant: { type: String, default: 'danger' }, // 'danger' | 'warning' | 'success'
  loading: { type: Boolean, default: false },
  icon: { type: Boolean, default: true },
})

defineEmits(['update:modelValue', 'confirm'])

const iconBg = computed(() => ({
  'bg-red-500/15': props.variant === 'danger',
  'bg-amber-500/15': props.variant === 'warning',
  'bg-emerald-500/15': props.variant === 'success',
}))

const iconColor = computed(() => ({
  'text-red-400': props.variant === 'danger',
  'text-amber-400': props.variant === 'warning',
  'text-emerald-400': props.variant === 'success',
}))

const iconPath = computed(() => {
  if (props.variant === 'danger') return 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
  if (props.variant === 'warning') return 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'
  return 'M5 13l4 4L19 7'
})

const confirmClass = computed(() => ({
  'bg-red-500/15 text-red-400 hover:bg-red-500/25': props.variant === 'danger',
  'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25': props.variant === 'warning',
  'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25': props.variant === 'success',
}))
</script>
