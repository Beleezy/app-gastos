<template>
  <SharedBaseBottomSheet :title="`Editar ${count} gasto${count === 1 ? '' : 's'}`" @close="$emit('close')">
    <p class="text-xs text-theme-text-muted -mt-2">
      Solo se aplicarán los campos que actives. Los demás se mantendrán sin cambios.
    </p>

    <!-- Categoría -->
    <div>
      <label class="flex items-center gap-2 mb-2">
        <input
          v-model="campos.categoria"
          type="checkbox"
          class="w-4 h-4 rounded accent-theme-accent"
        />
        <span class="text-sm font-medium text-theme-text">Cambiar categoría</span>
      </label>
      <Transition name="expand">
        <div v-if="campos.categoria" class="grid grid-cols-3 gap-2">
          <button
            v-for="cat in categorias"
            :key="cat.id"
            class="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs transition-all"
            :class="form.categoriaId === cat.id
              ? 'border-theme-accent bg-theme-accent-bg'
              : 'border-theme-border bg-theme-input hover:border-primary-600'"
            @click="form.categoriaId = cat.id"
          >
            <span class="text-base">{{ cat.icono || '📦' }}</span>
            <span class="truncate w-full text-center"
              :class="form.categoriaId === cat.id ? 'text-theme-accent' : 'text-theme-text-muted'"
            >{{ cat.nombre }}</span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- Fecha -->
    <div>
      <label class="flex items-center gap-2 mb-2">
        <input
          v-model="campos.fecha"
          type="checkbox"
          class="w-4 h-4 rounded accent-theme-accent"
        />
        <span class="text-sm font-medium text-theme-text">Cambiar fecha</span>
      </label>
      <Transition name="expand">
        <input
          v-if="campos.fecha"
          v-model="form.fecha"
          type="date"
          class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        />
      </Transition>
    </div>

    <!-- Hora -->
    <div>
      <label class="flex items-center gap-2 mb-2">
        <input
          v-model="campos.hora"
          type="checkbox"
          class="w-4 h-4 rounded accent-theme-accent"
        />
        <span class="text-sm font-medium text-theme-text">Cambiar hora</span>
      </label>
      <Transition name="expand">
        <input
          v-if="campos.hora"
          v-model="form.hora"
          type="time"
          class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        />
      </Transition>
    </div>

    <!-- Notas -->
    <div>
      <label class="flex items-center gap-2 mb-2">
        <input
          v-model="campos.notas"
          type="checkbox"
          class="w-4 h-4 rounded accent-theme-accent"
        />
        <span class="text-sm font-medium text-theme-text">Cambiar notas</span>
      </label>
      <Transition name="expand">
        <textarea
          v-if="campos.notas"
          v-model="form.notas"
          rows="2"
          placeholder="Notas para todos los gastos seleccionados..."
          class="w-full px-4 py-3 rounded-xl bg-theme-input border border-theme-border text-theme-text placeholder-gray-600 text-sm focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors resize-none"
        ></textarea>
      </Transition>
    </div>

    <p v-if="errorMsg" class="text-red-400 text-xs">{{ errorMsg }}</p>

    <button
      class="w-full py-3.5 rounded-xl text-theme-on-accent font-semibold text-sm transition-colors mt-2 flex items-center justify-center gap-2"
      :class="saving ? 'bg-theme-accent/60 cursor-not-allowed' : 'bg-theme-accent hover:bg-theme-accent-dark active:scale-[0.98]'"
      :disabled="saving || !tieneCamposActivos"
      @click="guardar"
    >
      <svg v-if="saving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      {{ saving ? 'Guardando...' : `Aplicar a ${count} gasto${count === 1 ? '' : 's'}` }}
    </button>
  </SharedBaseBottomSheet>
</template>

<script setup>
const props = defineProps({
  categorias: { type: Array, default: () => [] },
  ids: { type: Array, required: true },
})

const emit = defineEmits(['close', 'saved'])

const count = computed(() => props.ids.length)

const campos = reactive({
  categoria: false,
  fecha: false,
  hora: false,
  notas: false,
})

const { fechaHoy, horaActual } = useFechaPeru()
const form = reactive({
  categoriaId: null,
  fecha: fechaHoy(),
  hora: horaActual(),
  notas: '',
})

const saving = ref(false)
const errorMsg = ref('')

const tieneCamposActivos = computed(() => {
  if (campos.categoria && !form.categoriaId) return false
  return campos.categoria || campos.fecha || campos.hora || campos.notas
})

async function guardar() {
  if (!tieneCamposActivos.value) return
  errorMsg.value = ''

  const camposUpdate = {}
  if (campos.categoria) camposUpdate.categoriaId = form.categoriaId
  if (campos.fecha) camposUpdate.fecha = form.fecha
  if (campos.hora) camposUpdate.hora = form.hora
  if (campos.notas) camposUpdate.notas = form.notas

  saving.value = true
  try {
    emit('saved', { ids: props.ids, campos: camposUpdate })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.expand-enter-active, .expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to, .expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
