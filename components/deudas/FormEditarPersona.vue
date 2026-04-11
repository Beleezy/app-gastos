<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center">
    <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="$emit('close')"></div>
    <div class="relative w-full max-w-lg bg-theme-input rounded-t-3xl px-4 pt-5 pb-8 animate-slide-up">
      <!-- Handle -->
      <div class="w-10 h-1 bg-theme-border-md rounded-full mx-auto mb-5"></div>

      <h3 class="text-base font-semibold text-theme-text mb-4">Editar persona</h3>

      <form class="space-y-3" @submit.prevent="guardar">
        <!-- Nombre -->
        <div>
          <label class="block text-xs text-theme-text-sec mb-1.5">Nombre *</label>
          <input
            v-model="form.nombre"
            type="text"
            placeholder="Nombre o empresa"
            class="w-full bg-theme-card border border-theme-border rounded-xl px-3 py-2.5 text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent"
            required
          />
        </div>

        <!-- Tipo -->
        <div>
          <label class="block text-xs text-theme-text-sec mb-1.5">Tipo</label>
          <div class="flex gap-2">
            <button
              v-for="opt in tipoOpts" :key="opt.value"
              type="button"
              class="flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors border"
              :class="form.tipo === opt.value
                ? 'bg-theme-accent-bg text-theme-accent border-theme-accent'
                : 'bg-theme-card text-theme-text-sec border-theme-border hover:border-primary-600/50'"
              @click="form.tipo = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Contacto -->
        <div>
          <label class="block text-xs text-theme-text-sec mb-1.5">Contacto (teléfono, email…)</label>
          <input
            v-model="form.contacto"
            type="text"
            placeholder="Opcional"
            class="w-full bg-theme-card border border-theme-border rounded-xl px-3 py-2.5 text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent"
          />
        </div>

        <!-- Notas -->
        <div>
          <label class="block text-xs text-theme-text-sec mb-1.5">Notas</label>
          <textarea
            v-model="form.notas"
            rows="2"
            placeholder="Opcional"
            class="w-full bg-theme-card border border-theme-border rounded-xl px-3 py-2.5 text-theme-text placeholder-gray-600 focus:outline-none focus:border-theme-accent resize-none"
          ></textarea>
        </div>

        <!-- Error -->
        <p v-if="error" class="text-xs text-red-400">{{ error }}</p>

        <!-- Actions -->
        <div class="flex gap-2 pt-1">
          <button
            type="button"
            class="flex-1 py-3 rounded-xl bg-theme-card text-theme-text-muted text-sm font-medium hover:bg-theme-border-md transition-colors"
            @click="$emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="flex-1 py-3 rounded-xl bg-theme-accent-bg text-theme-accent text-sm font-medium hover:bg-theme-accent-bg transition-colors flex items-center justify-center gap-2"
            :disabled="saving"
          >
            <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { useModalBack } from '~/composables/useModalBack'

const props = defineProps({
  persona: { type: Object, required: true }
})
const emit = defineEmits(['close', 'saved'])

useModalBack(() => emit('close'))

const tipoOpts = [
  { value: 'persona', label: 'Persona' },
  { value: 'organizacion', label: 'Organización' },
]

const form = reactive({
  nombre: props.persona.nombre,
  tipo: props.persona.tipo || 'persona',
  contacto: props.persona.contacto || '',
  notas: props.persona.notas || '',
})

const saving = ref(false)
const error = ref(null)

async function guardar() {
  if (!form.nombre.trim()) return
  saving.value = true
  error.value = null
  try {
    const updated = await $fetch(`/api/deudas/personas/${props.persona.id}`, {
      method: 'PUT',
      body: {
        nombre: form.nombre,
        tipo: form.tipo,
        contacto: form.contacto || null,
        notas: form.notas || null,
      },
    })
    emit('saved', updated)
    emit('close')
  } catch (e) {
    error.value = handleApiError(e)
  } finally {
    saving.value = false
  }
}
</script>
