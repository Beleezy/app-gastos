<template>
  <SharedBaseBottomSheet :title="modoEdicion ? 'Editar proyecto' : 'Nuevo gasto futuro'" @close="$emit('close')">
    <div class="space-y-4">
      <div v-if="!modoEdicion" class="rounded-2xl border border-sky-500/15 bg-sky-500/8 px-4 py-3">
        <p class="text-xs uppercase tracking-[0.18em] text-sky-300/80">Resumen tentativo</p>
        <div class="mt-2 grid grid-cols-3 gap-2">
          <div class="rounded-xl bg-theme-card/80 px-3 py-2">
            <p class="text-[10px] uppercase tracking-[0.16em] text-theme-text-muted">Min</p>
            <p class="mt-1 text-xs font-medium text-emerald-400">{{ currencySymbol }} {{ formatMonto(resumenTentativo.totalMinimo) }}</p>
          </div>
          <div class="rounded-xl bg-theme-card/80 px-3 py-2">
            <p class="text-[10px] uppercase tracking-[0.16em] text-theme-text-muted">Prom</p>
            <p class="mt-1 text-xs font-medium text-sky-300">{{ currencySymbol }} {{ formatMonto(resumenTentativo.totalPromedio) }}</p>
          </div>
          <div class="rounded-xl bg-theme-card/80 px-3 py-2">
            <p class="text-[10px] uppercase tracking-[0.16em] text-theme-text-muted">Max</p>
            <p class="mt-1 text-xs font-medium text-amber-300">{{ currencySymbol }} {{ formatMonto(resumenTentativo.totalMaximo) }}</p>
          </div>
        </div>
        <p class="mt-2 text-[11px] text-theme-text-sec">
          {{ resumenTentativo.totalDetalles }} detalles · {{ resumenTentativo.totalOpciones }} opciones tentativas
        </p>
      </div>

      <div v-if="modoEdicion" class="rounded-2xl border border-sky-500/15 bg-sky-500/8 px-4 py-3">
        <p class="text-[11px] text-sky-300/80">Edita los datos generales del proyecto. Los detalles y opciones se gestionan desde la vista principal.</p>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-theme-text-muted">Tipo de gasto</label>
        <input
          v-model="form.tipoGasto"
          type="text"
          placeholder="Ej: PC nueva, Outfit invierno..."
          class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
        />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-theme-text-muted">Categoria</label>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="cat in categorias"
            :key="cat.id"
            class="flex flex-col items-center gap-1 rounded-xl border p-2 transition-all"
            :class="form.categoriaId === cat.id ? 'border-violet-500 bg-violet-500/10' : 'border-theme-border bg-theme-input'"
            @click="form.categoriaId = cat.id"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-lg" :style="{ backgroundColor: (cat.color || '#6b7280') + '26' }">
              <span class="text-sm">{{ cat.icono || getEmoji(cat.nombre) }}</span>
            </div>
            <span class="w-full truncate text-center text-[10px] leading-tight text-theme-text-muted">{{ cat.nombre }}</span>
          </button>
        </div>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-theme-text-muted">Prioridad</label>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="opt in prioridadOpciones"
            :key="opt.value"
            type="button"
            class="rounded-xl border px-2 py-2.5 text-xs font-medium transition-all"
            :class="form.prioridad === opt.value ? opt.bg + ' ' + opt.color : 'border-theme-border bg-theme-input text-theme-text-muted'"
            @click="form.prioridad = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-theme-text-muted">Descripcion general <span class="text-theme-text-muted">(opcional)</span></label>
        <textarea
          v-model="form.descripcion"
          rows="2"
          placeholder="Objetivo, notas generales, prioridad..."
          class="w-full resize-none rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
        ></textarea>
      </div>

      <div v-if="!modoEdicion" class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-theme-text">Detalles</p>
            <p class="text-xs text-theme-text-sec">Toca un detalle para expandirlo y editar sus opciones.</p>
          </div>
          <button
            class="rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/20"
            @click="agregarDetalle"
          >
            + Detalle
          </button>
        </div>

        <div
          v-for="(detalle, detalleIndex) in form.detalles"
          :key="detalle.key"
          class="overflow-hidden rounded-2xl border border-theme-border bg-theme-card"
        >
          <!-- Cabecera colapsable -->
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
            @click="toggleDetalle(detalle.key)"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-theme-text">
                {{ detalle.nombre || `Detalle ${detalleIndex + 1}` }}
              </p>
              <p class="mt-0.5 text-[11px] text-theme-text-muted">
                {{ detalle.opciones.length }} opcion{{ detalle.opciones.length !== 1 ? 'es' : '' }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <button
                v-if="form.detalles.length > 1"
                type="button"
                class="text-[11px] text-theme-text-sec transition-colors hover:text-red-400"
                @click.stop="eliminarDetalle(detalleIndex)"
              >
                Quitar
              </button>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 shrink-0 text-theme-text-muted transition-transform"
                :class="detalleExpandido(detalle.key) ? 'rotate-180' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25L12 15.75 4.5 8.25" />
              </svg>
            </div>
          </button>

          <!-- Contenido expandido -->
          <div v-if="detalleExpandido(detalle.key)" class="border-t border-theme-border px-3 pb-3 pt-3 space-y-3">
            <input
              v-model="detalle.nombre"
              type="text"
              placeholder="Ej: CPU, mouse, jean, casaca..."
              class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
            />

            <textarea
              v-model="detalle.notas"
              rows="2"
              placeholder="Notas del detalle (opcional)"
              class="w-full resize-none rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
            ></textarea>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-xs font-medium uppercase tracking-[0.18em] text-theme-text-muted">Opciones tentativas</p>
                <button
                  type="button"
                  class="rounded-full bg-theme-input px-3 py-1.5 text-[11px] font-medium text-theme-text-sec transition-colors hover:text-theme-text"
                  @click="agregarOpcion(detalle)"
                >
                  + Opcion
                </button>
              </div>

              <div
                v-for="(opcion, optionIndex) in detalle.opciones"
                :key="opcion.key"
                class="rounded-xl border border-theme-border bg-theme-input/70 p-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <p class="text-xs font-medium text-theme-text">{{ opcion.nombre || `Opcion ${optionIndex + 1}` }}</p>
                  <button
                    type="button"
                    class="text-[11px] text-theme-text-sec transition-colors hover:text-red-400"
                    @click="eliminarOpcion(detalle, optionIndex)"
                  >
                    Quitar
                  </button>
                </div>

                <div class="mt-3 space-y-3">
                  <input
                    v-model="opcion.nombre"
                    type="text"
                    placeholder="Ej: Ryzen 7 7800X3D, Jean slim..."
                    class="w-full rounded-xl border border-theme-border bg-theme-card px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                  />

                  <input
                    v-model="opcion.referenciaUrl"
                    type="url"
                    placeholder="Link de referencia"
                    class="w-full rounded-xl border border-theme-border bg-theme-card px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                  />

                  <input
                    v-model="opcion.imagenUrl"
                    type="url"
                    placeholder="Link de imagen (opcional)"
                    class="w-full rounded-xl border border-theme-border bg-theme-card px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                  />

                  <div class="grid grid-cols-3 gap-2">
                    <div>
                      <label class="mb-1 block text-[11px] text-theme-text-muted">Min</label>
                      <input
                        v-model="opcion.precioMinimo"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        class="w-full rounded-xl border border-theme-border bg-theme-card px-3 py-2.5 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label class="mb-1 block text-[11px] text-theme-text-muted">Prom</label>
                      <input
                        v-model="opcion.precioPromedio"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Auto"
                        class="w-full rounded-xl border border-theme-border bg-theme-card px-3 py-2.5 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label class="mb-1 block text-[11px] text-theme-text-muted">Max</label>
                      <input
                        v-model="opcion.precioMaximo"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        class="w-full rounded-xl border border-theme-border bg-theme-card px-3 py-2.5 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                      />
                    </div>
                  </div>

                  <textarea
                    v-model="opcion.notas"
                    rows="2"
                    placeholder="Notas de esta opcion (tienda, color, talla, etc.)"
                    class="w-full resize-none rounded-xl border border-theme-border bg-theme-card px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p v-if="errorMsg" class="text-xs text-red-400">{{ errorMsg }}</p>

      <button
        class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-colors"
        :class="saving ? 'cursor-not-allowed bg-violet-500/70' : 'bg-violet-500 hover:bg-violet-600 active:bg-violet-700'"
        :disabled="saving"
        @click="guardar"
      >
        <svg v-if="saving" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        {{ saving ? 'Guardando...' : modoEdicion ? 'Guardar gasto futuro' : 'Crear gasto futuro' }}
      </button>
    </div>
  </SharedBaseBottomSheet>
</template>

<script setup>
const props = defineProps({
  gastoEditar: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

let draftId = 0
const nextKey = () => `draft-${++draftId}`

function createOption(data = {}) {
  return {
    key: nextKey(),
    nombre: data.nombre || '',
    referenciaUrl: data.referenciaUrl || '',
    imagenUrl: data.imagenUrl || '',
    precioMinimo: data.precioMinimo ?? '',
    precioPromedio: data.precioPromedio ?? '',
    precioMaximo: data.precioMaximo ?? '',
    notas: data.notas || '',
  }
}

function createDetail(data = {}) {
  return {
    key: nextKey(),
    nombre: data.nombre || '',
    notas: data.notas || '',
    opciones: Array.isArray(data.opciones) && data.opciones.length
      ? data.opciones.map(opcion => createOption(opcion))
      : [createOption()],
  }
}

const { createGastoFuturo, updateGastoFuturo } = useGastosFuturos()
const { categorias, getCategoriaIcono } = useCategorias()
const { currencySymbol, formatMonto } = useCurrency()
const { success, error: toastError } = useToast()

const modoEdicion = computed(() => !!props.gastoEditar)

const form = reactive({
  categoriaId: props.gastoEditar?.categoriaId || null,
  tipoGasto: props.gastoEditar?.tipoGasto || '',
  descripcion: props.gastoEditar?.descripcion || '',
  prioridad: props.gastoEditar?.prioridad ?? 0,
  detalles: Array.isArray(props.gastoEditar?.detalles) && props.gastoEditar.detalles.length
    ? props.gastoEditar.detalles.map(detalle => createDetail(detalle))
    : [createDetail()],
})

const prioridadOpciones = [
  { value: 3, label: 'Alta', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/40' },
  { value: 2, label: 'Media', color: 'text-amber-300', bg: 'bg-amber-500/15 border-amber-500/40' },
  { value: 1, label: 'Baja', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/40' },
  { value: 0, label: 'Sin def.', color: 'text-theme-text-sec', bg: 'bg-theme-input border-theme-border' },
]

const saving = ref(false)
const errorMsg = ref('')

// Acordeón de detalles — solo uno abierto a la vez
const detalleAbierto = ref(form.detalles[0]?.key ?? null)

function detalleExpandido(key) {
  return detalleAbierto.value === key
}

function toggleDetalle(key) {
  detalleAbierto.value = detalleAbierto.value === key ? null : key
}

const resumenTentativo = computed(() => {
  const payload = normalizarDetalles(false)
  const resumen = {
    totalDetalles: payload.length,
    totalOpciones: 0,
    totalMinimo: 0,
    totalMaximo: 0,
    totalPromedio: 0,
  }

  for (const detalle of payload) {
    const minimos = []
    const maximos = []
    const promedios = []
    resumen.totalOpciones += detalle.opciones.length

    for (const opcion of detalle.opciones) {
      const promedio = opcion.precioPromedio ?? inferAverage(opcion)
      const minimo = opcion.precioMinimo ?? promedio ?? opcion.precioMaximo
      const maximo = opcion.precioMaximo ?? promedio ?? opcion.precioMinimo
      if (minimo !== null) minimos.push(minimo)
      if (maximo !== null) maximos.push(maximo)
      if (promedio !== null) promedios.push(promedio)
    }

    if (minimos.length) resumen.totalMinimo += Math.min(...minimos)
    if (maximos.length) resumen.totalMaximo += Math.max(...maximos)
    if (promedios.length) resumen.totalPromedio += promedios.reduce((sum, value) => sum + value, 0) / promedios.length
  }

  resumen.totalMinimo = round2(resumen.totalMinimo)
  resumen.totalMaximo = round2(resumen.totalMaximo)
  resumen.totalPromedio = round2(resumen.totalPromedio)
  return resumen
})

function getEmoji(nombre) {
  return getCategoriaIcono(nombre)
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function parseAmount(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? round2(number) : null
}

function inferAverage(option) {
  if (option.precioPromedio !== null && option.precioPromedio !== undefined) return option.precioPromedio
  if (option.precioMinimo !== null && option.precioMaximo !== null) return round2((option.precioMinimo + option.precioMaximo) / 2)
  return option.precioMinimo ?? option.precioMaximo ?? null
}

function agregarDetalle() {
  const nuevo = createDetail()
  form.detalles.push(nuevo)
  detalleAbierto.value = nuevo.key
}

function eliminarDetalle(index) {
  form.detalles.splice(index, 1)
}

function agregarOpcion(detalle) {
  detalle.opciones.push(createOption())
}

function eliminarOpcion(detalle, index) {
  detalle.opciones.splice(index, 1)
  if (detalle.opciones.length === 0) {
    detalle.opciones.push(createOption())
  }
}

function normalizarDetalles(validar = true) {
  const detalles = []

  for (const [detalleIndex, detalle] of form.detalles.entries()) {
    const nombre = detalle.nombre.trim()
    const notas = detalle.notas.trim() || null
    const opciones = []

    for (const [optionIndex, opcion] of detalle.opciones.entries()) {
      const nombreOpcion = opcion.nombre.trim()
      const referenciaUrl = opcion.referenciaUrl.trim() || null
      const imagenUrl = opcion.imagenUrl.trim() || null
      const notasOpcion = opcion.notas.trim() || null
      const precioMinimo = parseAmount(opcion.precioMinimo)
      const precioPromedioInput = parseAmount(opcion.precioPromedio)
      const precioMaximo = parseAmount(opcion.precioMaximo)
      const precioPromedio = inferAverage({ precioMinimo, precioPromedio: precioPromedioInput, precioMaximo })

      const tieneContenido = Boolean(
        nombreOpcion || referenciaUrl || imagenUrl || notasOpcion
        || precioMinimo !== null || precioPromedio !== null || precioMaximo !== null
      )

      if (!tieneContenido) continue

      if (validar && !nombreOpcion) {
        throw new Error(`La opcion ${optionIndex + 1} del detalle ${detalleIndex + 1} debe tener nombre`)
      }

      if (validar && precioMinimo !== null && precioMaximo !== null && precioMinimo > precioMaximo) {
        throw new Error(`El rango de precios no es valido en ${nombreOpcion || `detalle ${detalleIndex + 1}`}`)
      }

      opciones.push({
        nombre: nombreOpcion,
        referenciaUrl,
        imagenUrl,
        precioMinimo,
        precioPromedio,
        precioMaximo,
        notas: notasOpcion,
      })
    }

    if (!nombre && !notas && opciones.length === 0) continue

    if (validar && !nombre) {
      throw new Error(`El detalle ${detalleIndex + 1} debe tener nombre`)
    }

    detalles.push({
      nombre,
      notas,
      opciones,
    })
  }

  return detalles
}

async function guardar() {
  errorMsg.value = ''

  if (!form.tipoGasto.trim()) {
    errorMsg.value = 'El tipo de gasto es obligatorio'
    return
  }

  if (!form.categoriaId) {
    errorMsg.value = 'Selecciona una categoria'
    return
  }

  let detalles = []
  if (!modoEdicion.value) {
    try {
      detalles = normalizarDetalles(true)
    } catch (error) {
      errorMsg.value = error.message || 'Revisa los detalles ingresados'
      return
    }

    if (!detalles.length) {
      errorMsg.value = 'Agrega al menos un detalle'
      return
    }
  }

  saving.value = true
  try {
    if (modoEdicion.value) {
      // En modo edición solo actualizamos los datos del proyecto, preservando detalles existentes
      const existingDetalles = (props.gastoEditar.detalles || []).map(d => ({
        id: d.id,
        nombre: d.nombre,
        notas: d.notas || null,
        prioridad: d.prioridad ?? 0,
        opciones: (d.opciones || []).map(o => ({
          nombre: o.nombre,
          referenciaUrl: o.referenciaUrl || null,
          imagenUrl: o.imagenUrl || null,
          precioMinimo: o.precioMinimo ?? null,
          precioPromedio: o.precioPromedio ?? null,
          precioMaximo: o.precioMaximo ?? null,
          notas: o.notas || null,
        })),
      }))
      const payload = {
        categoriaId: form.categoriaId,
        tipoGasto: form.tipoGasto.trim(),
        descripcion: form.descripcion.trim() || null,
        prioridad: form.prioridad ?? 0,
        detalles: existingDetalles,
      }
      await updateGastoFuturo(props.gastoEditar.id, payload)
      success('Proyecto actualizado')
    } else {
      const payload = {
        categoriaId: form.categoriaId,
        tipoGasto: form.tipoGasto.trim(),
        descripcion: form.descripcion.trim() || null,
        prioridad: form.prioridad ?? 0,
        detalles,
      }
      await createGastoFuturo(payload)
      success('Gasto futuro creado')
    }

    emit('saved')
    emit('close')
  } catch (error) {
    const message = error?.data?.message || error?.message || 'Error al guardar el gasto futuro'
    errorMsg.value = message
    toastError(message)
  } finally {
    saving.value = false
  }
}
</script>
