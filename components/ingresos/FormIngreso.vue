<template>
  <form @submit.prevent="submit" class="space-y-4">
    <div>
      <label class="block text-xs text-theme-text-muted font-medium mb-1.5">Concepto</label>
      <input
        v-model="form.concepto"
        type="text"
        required
        maxlength="255"
        placeholder="p. ej. Salario julio"
        class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text outline-none focus:border-theme-accent transition-colors"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs text-theme-text-muted font-medium mb-1.5">Monto</label>
        <input
          v-model.number="form.monto"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="0.00"
          class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text outline-none focus:border-theme-accent transition-colors"
        />
      </div>
      <div>
        <label class="block text-xs text-theme-text-muted font-medium mb-1.5">Fecha</label>
        <input
          v-model="form.fecha"
          type="date"
          required
          class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text outline-none focus:border-theme-accent transition-colors"
        />
      </div>
    </div>

    <div>
      <label class="block text-xs text-theme-text-muted font-medium mb-1.5">Origen</label>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="o in ORIGENES"
          :key="o.value"
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
          :class="form.origen === o.value
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
            : 'bg-theme-card text-theme-text-sec border-theme-border hover:text-theme-text'"
          @click="form.origen = form.origen === o.value ? null : o.value"
        >
          {{ o.icon }} {{ o.label }}
        </button>
      </div>
    </div>

    <div>
      <label class="flex items-center gap-2 text-xs text-theme-text-muted">
        <input v-model="form.esRecurrente" type="checkbox" class="h-4 w-4 rounded" />
        <span>Es recurrente (informativo, sin replicar todavía)</span>
      </label>
    </div>

    <div>
      <label class="block text-xs text-theme-text-muted font-medium mb-1.5">Notas (opcional)</label>
      <textarea
        v-model="form.notas"
        rows="2"
        maxlength="500"
        class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text outline-none focus:border-theme-accent transition-colors"
      ></textarea>
    </div>

    <div class="flex gap-2 pt-2">
      <button
        v-if="props.editing"
        type="button"
        class="flex-1 px-4 py-2.5 rounded-xl bg-theme-input text-theme-text-sec text-sm font-medium"
        @click="$emit('cancel')"
      >Cancelar</button>
      <button
        type="submit"
        :disabled="enviando"
        class="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50"
      >{{ enviando ? 'Guardando...' : (props.editing ? 'Guardar cambios' : 'Registrar ingreso') }}</button>
    </div>
  </form>
</template>

<script setup>
const props = defineProps({
  editing: { type: Object, default: null },
})
const emit = defineEmits(['saved', 'cancel'])

const ORIGENES = [
  { value: 'salario', label: 'Salario', icon: '💼' },
  { value: 'freelance', label: 'Freelance', icon: '💻' },
  { value: 'inversion', label: 'Inversión', icon: '📈' },
  { value: 'regalo', label: 'Regalo', icon: '🎁' },
  { value: 'reembolso', label: 'Reembolso', icon: '↩️' },
  { value: 'otro', label: 'Otro', icon: '💰' },
]

const hoy = new Date().toISOString().split('T')[0]
const form = ref({
  concepto: '',
  monto: null,
  fecha: hoy,
  origen: null,
  esRecurrente: false,
  notas: '',
})

watch(() => props.editing, (ed) => {
  if (ed) {
    form.value = {
      concepto: ed.concepto || '',
      monto: parseFloat(ed.monto) || null,
      fecha: ed.fecha || hoy,
      origen: ed.origen || null,
      esRecurrente: !!ed.esRecurrente,
      notas: ed.notas || '',
    }
  }
}, { immediate: true })

const enviando = ref(false)
const { crearIngreso, actualizarIngreso } = useIngresos()
const toast = useToast()

async function submit() {
  if (enviando.value) return
  enviando.value = true
  try {
    const payload = {
      concepto: form.value.concepto.trim(),
      monto: form.value.monto,
      fecha: form.value.fecha,
      origen: form.value.origen,
      esRecurrente: form.value.esRecurrente,
      notas: form.value.notas?.trim() || null,
    }
    if (props.editing) {
      await actualizarIngreso(props.editing.id, payload)
      toast.success('Ingreso actualizado')
    } else {
      await crearIngreso(payload)
      toast.success('Ingreso registrado')
      form.value = { concepto: '', monto: null, fecha: hoy, origen: null, esRecurrente: false, notas: '' }
    }
    emit('saved')
  } catch (e) {
    toast.error(e?.data?.message || e?.message || 'No se pudo guardar')
  } finally {
    enviando.value = false
  }
}
</script>
