<template>
  <div class="space-y-2">
    <div
      v-for="(r, i) in modelo"
      :key="i"
      class="flex items-center gap-2 bg-theme-input border border-theme-border rounded-xl px-3 py-2"
    >
      <select
        :value="r.tipo"
        class="bg-transparent text-sm text-theme-text focus:outline-none flex-1 min-w-0"
        @change="actualizar(i, 'tipo', $event.target.value)"
      >
        <option value="mismo_dia">Mismo dia</option>
        <option value="dia_anterior">Dia anterior</option>
        <option value="dos_dias_antes">Dos dias antes</option>
        <option value="una_semana_antes">Una semana antes</option>
      </select>

      <input
        v-if="r.tipo !== 'mismo_dia'"
        type="time"
        :value="r.hora"
        class="bg-transparent text-sm text-theme-text focus:outline-none w-20"
        @change="actualizar(i, 'hora', $event.target.value)"
      />
      <span
        v-else
        class="text-xs text-theme-text-sec flex items-center gap-1 whitespace-nowrap"
        :title="tooltipMismoDia"
      >
        hora global &#9432;
      </span>

      <button
        class="text-theme-text-muted hover:text-red-400 transition-colors w-10 h-10 -my-1 flex items-center justify-center shrink-0"
        :aria-label="`Eliminar recordatorio ${i + 1}`"
        @click="eliminar(i)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
        </svg>
      </button>
    </div>

    <button
      v-if="modelo.length < 5"
      class="w-full bg-theme-input border border-dashed border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text-sec hover:text-theme-accent transition-colors"
      @click="agregar"
    >
      + Agregar recordatorio
    </button>

    <div class="flex justify-end gap-2 pt-2">
      <button
        class="text-xs text-theme-text-sec hover:text-theme-text px-3 min-h-[2.5rem] disabled:opacity-40"
        :disabled="!cambios || guardando"
        @click="cancelar"
      >
        Cancelar
      </button>
      <button
        class="bg-theme-accent text-theme-on-accent rounded-lg px-4 min-h-[2.5rem] text-xs font-semibold disabled:opacity-40 transition-colors"
        :disabled="!cambios || guardando"
        @click="onGuardar"
      >
        {{ guardando ? 'Guardando...' : 'Guardar' }}
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  recordatorios: { type: Array, required: true },
})
const emit = defineEmits(['guardar'])

const tooltipMismoDia = 'El recordatorio del mismo dia llega segun la hora global de tu Google Calendar. Para una hora exacta, usa un recordatorio del dia anterior.'

const modelo = ref(JSON.parse(JSON.stringify(props.recordatorios || [])))
const guardando = ref(false)

const cambios = computed(() => JSON.stringify(modelo.value) !== JSON.stringify(props.recordatorios || []))

function actualizar(i, campo, valor) {
  modelo.value[i] = { ...modelo.value[i], [campo]: valor }
}

function agregar() {
  modelo.value.push({ tipo: 'dia_anterior', hora: '18:00' })
}

function eliminar(i) {
  modelo.value.splice(i, 1)
}

function cancelar() {
  modelo.value = JSON.parse(JSON.stringify(props.recordatorios || []))
}

async function onGuardar() {
  guardando.value = true
  try {
    await emit('guardar', JSON.parse(JSON.stringify(modelo.value)))
  } finally {
    guardando.value = false
  }
}

watch(() => props.recordatorios, (nuevo) => {
  if (!cambios.value) modelo.value = JSON.parse(JSON.stringify(nuevo || []))
}, { deep: true })
</script>
