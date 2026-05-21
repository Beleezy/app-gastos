<!--
  FormGastoManualV2 — rediseño del formulario manual de gasto.

  Cambios respecto a V1 (FormGastoManual.vue):
    • CTA "Guardar" en footer sticky de BaseBottomSheet (slot #footer) →
      siempre visible aunque el form crezca y el teclado se abra.
    • Inputs estandarizados a h-12 con tipografía 16px (evita zoom en iOS).
    • Grid de categorías de 3 columnas (V1: 3 también pero comprimido) con
      tap target ≥ 72px (emoji 24px + label 13px).
    • Chips rápidos "Hoy / Ayer" para fecha (input nativo `date` accesible
      por chip "Otra fecha").

  Misma lógica/contrato que V1 (mismas props, emits, validaciones).
-->
<template>
  <SharedBaseBottomSheet :title="editando ? 'Editar gasto' : (duplicando ? 'Copiar gasto' : 'Nuevo gasto')" @close="$emit('close')">
    <!-- Concepto -->
    <div class="relative">
      <label class="block text-sm font-semibold text-theme-text-muted mb-2">Concepto</label>
      <input
        v-model="form.concepto"
        type="text"
        data-testid="input-concepto"
        placeholder="Ej: Almuerzo, Pasaje, Recibo de luz..."
        class="w-full h-12 px-4 rounded-2xl bg-theme-input border text-theme-text placeholder-theme-text-muted text-base focus:outline-none focus:ring-1 transition-colors"
        :class="errores.concepto
          ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500'
          : 'border-theme-border focus:border-theme-accent focus:ring-theme-accent'"
        autocomplete="off"
        @input="buscarConceptos"
        @focus="mostrarSugerencias = true"
        @blur="onBlurConcepto"
      />
      <div
        v-if="mostrarSugerencias && sugerencias.length > 0 && form.concepto.length >= 2"
        class="absolute z-10 w-full mt-1 bg-theme-card border border-theme-border rounded-2xl overflow-hidden shadow-lg"
      >
        <button
          v-for="(s, i) in sugerencias"
          :key="i"
          class="w-full px-4 py-3 text-left text-sm text-theme-text-sec hover:bg-theme-border-md flex items-center justify-between transition-colors tap-44"
          @mousedown.prevent="seleccionarSugerencia(s)"
        >
          <span>{{ s.concepto }}</span>
          <span class="text-xs text-theme-text-muted">{{ s.count }}x</span>
        </button>
      </div>
      <p v-if="errores.concepto" class="mt-1.5 text-xs text-red-400 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
        {{ errores.concepto }}
      </p>
    </div>

    <!-- Monto -->
    <div>
      <label class="block text-sm font-semibold text-theme-text-muted mb-2">Monto</label>
      <div class="relative">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-base text-theme-text-muted">{{ currencySymbol }}</span>
        <input
          v-model="form.monto"
          type="number"
          inputmode="decimal"
          data-testid="input-monto"
          step="0.01"
          min="0"
          placeholder="0.00"
          class="w-full h-12 pl-10 pr-4 rounded-2xl bg-theme-input border text-theme-text placeholder-theme-text-muted text-base font-semibold focus:outline-none focus:ring-1 transition-colors"
          :class="errores.monto
            ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500'
            : 'border-theme-border focus:border-theme-accent focus:ring-theme-accent'"
          @blur="validarMonto"
          @input="errores.monto && validarMonto()"
        />
      </div>
      <p v-if="errores.monto" class="mt-1.5 text-xs text-red-400 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
        {{ errores.monto }}
      </p>
    </div>

    <!-- Categoría -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="block text-sm font-semibold text-theme-text-muted">Categoría</label>
        <span
          v-if="categoriaFueSugerida && form.categoriaId"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-theme-accent-bg text-theme-accent text-[11px] font-bold"
          title="Sugerida automáticamente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6.2 4.5L18.2 22 12 17.3 5.8 22l2.4-8.1L2 9.4h7.6z"/></svg>
          Sugerida
        </span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="cat in categorias"
          :key="cat.id"
          class="flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border-2 text-xs transition-all tap-44"
          :class="[
            form.categoriaId === cat.id
              ? 'border-theme-accent bg-theme-accent-bg'
              : (errores.categoria ? 'border-red-500/30 bg-theme-input' : 'border-theme-border bg-theme-input hover:border-theme-accent/30')
          ]"
          @click="elegirCategoria(cat.id)"
        >
          <span class="text-2xl leading-none">{{ cat.icono || '📦' }}</span>
          <span
            class="truncate w-full text-center text-[13px] font-medium"
            :class="form.categoriaId === cat.id ? 'text-theme-accent' : 'text-theme-text'"
          >{{ cat.nombre }}</span>
        </button>
      </div>
      <p v-if="errores.categoria" class="mt-1.5 text-xs text-red-400 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
        {{ errores.categoria }}
      </p>
    </div>

    <!-- Fecha + Hora -->
    <div>
      <label class="block text-sm font-semibold text-theme-text-muted mb-2">Fecha</label>
      <!-- Quick chips -->
      <div class="flex flex-wrap gap-2 mb-2">
        <button
          type="button"
          class="px-4 h-11 rounded-xl text-sm font-medium border tap-44 transition-colors"
          :class="form.fecha === fechaHoy()
            ? 'bg-theme-accent-bg text-theme-accent border-theme-accent'
            : 'bg-theme-input text-theme-text-sec border-theme-border hover:bg-theme-border-md'"
          @click="form.fecha = fechaHoy()"
        >Hoy</button>
        <button
          type="button"
          class="px-4 h-11 rounded-xl text-sm font-medium border tap-44 transition-colors"
          :class="form.fecha === ayerISO
            ? 'bg-theme-accent-bg text-theme-accent border-theme-accent'
            : 'bg-theme-input text-theme-text-sec border-theme-border hover:bg-theme-border-md'"
          @click="form.fecha = ayerISO"
        >Ayer</button>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <input
          v-model="form.fecha"
          type="date"
          data-testid="input-fecha"
          class="w-full h-12 px-4 rounded-2xl bg-theme-input border border-theme-border text-theme-text text-base focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        />
        <input
          v-model="form.hora"
          type="time"
          data-testid="input-hora"
          class="w-full h-12 px-4 rounded-2xl bg-theme-input border border-theme-border text-theme-text text-base focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors"
        />
      </div>
    </div>

    <!-- Notas -->
    <div>
      <label class="block text-sm font-semibold text-theme-text-muted mb-2">
        Notas <span class="font-normal text-theme-text-muted">(opcional)</span>
      </label>
      <textarea
        v-model="form.notas"
        data-testid="input-notas"
        rows="2"
        placeholder="Agregar notas o detalles..."
        class="w-full px-4 py-3 rounded-2xl bg-theme-input border border-theme-border text-theme-text placeholder-theme-text-muted text-base focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent transition-colors resize-none"
      ></textarea>
    </div>

    <p v-if="errorMsg" class="text-red-400 text-sm">{{ errorMsg }}</p>

    <!-- CTA persistente en el footer del bottom sheet -->
    <template #footer>
      <button
        class="w-full h-14 rounded-2xl text-theme-on-accent font-bold text-base transition-all flex items-center justify-center gap-2 tap-44"
        :class="(saving || !formularioValido)
          ? 'bg-theme-accent/40 cursor-not-allowed'
          : 'bg-theme-accent hover:bg-theme-accent-dark active:bg-theme-accent-dark active:scale-[0.98] shadow-md shadow-theme-accent/20'"
        :disabled="saving || !formularioValido"
        data-testid="btn-guardar"
        @click="guardar"
      >
        <svg v-if="saving" class="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {{ saving ? 'Guardando...' : (editando ? 'Actualizar gasto' : (duplicando ? 'Registrar copia' : 'Registrar gasto')) }}
      </button>
    </template>
  </SharedBaseBottomSheet>
</template>

<script setup>
const props = defineProps({
  categorias: { type: Array, default: () => [] },
  gastoEditar: { type: Object, default: null },
  gastoDuplicar: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const editando = computed(() => !!props.gastoEditar)
const duplicando = computed(() => !props.gastoEditar && !!props.gastoDuplicar)

const { fechaHoy, horaActual } = useFechaPeru()

// Fecha de ayer (ISO)
const ayerISO = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
})

const form = reactive({
  concepto: props.gastoEditar?.concepto || props.gastoDuplicar?.concepto || '',
  monto: props.gastoEditar?.monto || props.gastoDuplicar?.monto || null,
  categoriaId: props.gastoEditar?.categoriaId || props.gastoDuplicar?.categoriaId || null,
  fecha: props.gastoEditar?.fecha || fechaHoy(),
  hora: props.gastoEditar?.hora?.substring(0, 5) || horaActual(),
  notas: props.gastoEditar?.notas || props.gastoDuplicar?.notas || '',
})

const saving = ref(false)
const errorMsg = ref('')
const sugerencias = ref([])
const predictor = useCategoryPredictor()
const sugerenciaCategoria = ref(null)
const mostrarSugerencias = ref(false)
const categoriaFueSugerida = ref(false)
const errores = reactive({ concepto: '', monto: '', categoria: '' })
let debounceTimer = null

const { currencySymbol } = useCurrency()
const { createGasto, updateGasto } = useGastos()

const formularioValido = computed(() => {
  const c = String(form.concepto || '').trim()
  const m = parseFloat(form.monto)
  return c.length >= 2 && !isNaN(m) && m > 0 && !!form.categoriaId
})

function validarConcepto() {
  const c = String(form.concepto || '').trim()
  errores.concepto = c.length === 0 ? 'Indica un concepto' : (c.length < 2 ? 'Al menos 2 caracteres' : '')
}
function validarMonto() {
  const m = parseFloat(form.monto)
  errores.monto = (!form.monto || isNaN(m) || m <= 0) ? 'Ingresa un monto mayor a 0' : ''
}
function elegirCategoria(id) {
  form.categoriaId = id
  categoriaFueSugerida.value = false
  errores.categoria = ''
}

function buscarConceptos() {
  if (errores.concepto) validarConcepto()
  clearTimeout(debounceTimer)
  if (form.concepto.length < 2) { sugerencias.value = []; return }
  debounceTimer = setTimeout(async () => {
    try {
      sugerencias.value = await $fetch('/api/gastos/conceptos', { params: { q: form.concepto } })
    } catch { sugerencias.value = [] }
  }, 300)
}

function seleccionarSugerencia(s) {
  form.concepto = s.concepto
  if (s.categoriaId && !form.categoriaId) {
    form.categoriaId = s.categoriaId
    categoriaFueSugerida.value = true
  }
  sugerencias.value = []
  mostrarSugerencias.value = false
  errores.concepto = ''
}

function onBlurConcepto() {
  validarConcepto()
  setTimeout(() => { mostrarSugerencias.value = false }, 200)
}

watch(() => form.concepto, (concepto) => {
  if (form.categoriaId && !categoriaFueSugerida.value) { sugerenciaCategoria.value = null; return }
  if (!concepto || concepto.trim().length < 3) { sugerenciaCategoria.value = null; return }
  const r = predictor.predecir(concepto)
  sugerenciaCategoria.value = r && r.confianza >= 0.5 ? r : null
})

watch(() => sugerenciaCategoria.value, (v) => {
  if (v?.categoriaId && (!form.categoriaId || categoriaFueSugerida.value)) {
    form.categoriaId = v.categoriaId
    categoriaFueSugerida.value = true
    errores.categoria = ''
  }
})

async function guardar() {
  errorMsg.value = ''
  validarConcepto()
  validarMonto()
  errores.categoria = form.categoriaId ? '' : 'Selecciona una categoría'

  if (errores.concepto || errores.monto || errores.categoria) return
  const fechaIngresada = new Date(form.fecha + 'T00:00:00')
  const limiteFuturo = new Date()
  limiteFuturo.setDate(limiteFuturo.getDate() + 30)
  if (fechaIngresada > limiteFuturo) {
    errorMsg.value = 'La fecha no puede ser más de 30 días en el futuro'
    return
  }

  saving.value = true
  try {
    if (editando.value) {
      await updateGasto(props.gastoEditar.id, {
        concepto: form.concepto.trim(),
        monto: parseFloat(form.monto),
        categoriaId: form.categoriaId,
        fecha: form.fecha,
        hora: form.hora,
        notas: form.notas?.trim() || null,
      })
    } else {
      await createGasto({
        concepto: form.concepto.trim(),
        monto: parseFloat(form.monto),
        categoriaId: form.categoriaId,
        fecha: form.fecha,
        hora: form.hora,
        metodoRegistro: 'manual',
        notas: form.notas?.trim() || null,
      })
    }
    try { predictor.aprender(form.concepto.trim(), form.categoriaId) } catch { /* sin storage */ }
    emit('saved')
    emit('close')
  } catch (e) {
    useToast().error(handleApiError(e))
  } finally {
    saving.value = false
  }
}
</script>
