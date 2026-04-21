<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center px-6">
    <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="$emit('update:modelValue', false)"></div>
    <div class="relative bg-theme-card rounded-2xl p-5 w-full max-w-sm border border-theme-border animate-slide-up">
      <div v-if="icon" class="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
        :class="iconBg"
      >
        <svg class="w-5 h-5" :class="iconColor" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" :d="iconPath" />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-theme-text mb-1.5" :class="icon ? 'text-center' : ''">{{ title }}</h3>
      <div class="text-sm text-theme-text-muted mb-4" :class="icon ? 'text-center' : ''">
        <slot name="message">
          <p>{{ message }}</p>
        </slot>
      </div>
      <label
        v-if="requireCheckbox"
        class="flex items-start gap-2.5 mb-5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors"
        :class="checkboxChecked ? 'border-theme-accent bg-theme-accent-bg/30' : 'border-theme-border bg-theme-input'"
      >
        <input v-model="checkboxChecked" type="checkbox" class="sr-only" />
        <div
          class="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors"
          :class="checkboxChecked ? 'bg-theme-accent border-theme-accent' : 'border-theme-border-md bg-theme-card'"
        >
          <svg v-if="checkboxChecked" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span class="text-xs text-theme-text-sec leading-snug">{{ checkboxLabel }}</span>
      </label>
      <div class="space-y-2">
        <button
          class="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="[confirmClass, (requireCheckbox && !checkboxChecked) ? 'opacity-40 cursor-not-allowed' : '']"
          :disabled="loading || (requireCheckbox && !checkboxChecked)"
          @click="onConfirm"
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
          class="w-full py-2.5 rounded-xl text-theme-text-sec text-sm font-medium hover:text-theme-text-sec transition-colors"
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
  requireCheckbox: { type: Boolean, default: false },
  checkboxLabel: { type: String, default: 'Entiendo que esta acción no se puede deshacer' },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const checkboxChecked = ref(false)
const isOpen = computed(() => props.modelValue)

useOverlayBack(isOpen, () => emit('update:modelValue', false))

watch(() => props.modelValue, (v) => {
  if (!v) checkboxChecked.value = false
})

function onConfirm() {
  if (props.requireCheckbox && !checkboxChecked.value) return
  emit('confirm')
}

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
