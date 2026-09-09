<template>
  <div
    data-testid="futuros-opcion"
    class="rounded-xl border bg-theme-input transition-all"
    :class="
      seleccionada
        ? esMejor && (detalle.opciones || []).length > 1
          ? 'border-emerald-400/70 bg-emerald-500/10 shadow-sm'
          : 'border-sky-400/60 bg-sky-500/5 shadow-sm'
        : esMejor && (detalle.opciones || []).length > 1
          ? 'border-emerald-500/30'
          : 'border-theme-border'
    "
  >
    <!-- Opción: modo edición -->
    <div v-if="editando" class="p-3 space-y-2">
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-medium text-theme-text">Editando opción</p>
        <button
          class="text-[0.6875rem] text-theme-text-muted hover:text-theme-text transition-colors"
          @click="$emit('cancelar-edicion')"
        >
          Cancelar
        </button>
      </div>
      <input
        v-model="borrador.nombre"
        type="text"
        placeholder="Nombre de la opción *"
        class="w-full rounded-lg border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
      />
      <input
        v-model="borrador.referenciaUrl"
        type="url"
        placeholder="Link de referencia (opcional)"
        class="w-full rounded-lg border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
      />
      <input
        v-model="borrador.imagenUrl"
        type="url"
        placeholder="Link de imagen (opcional)"
        class="w-full rounded-lg border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
      />
      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="mb-1 block text-[0.6875rem] text-theme-text-muted">Min</label>
          <input
            v-model="borrador.precioMinimo"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            class="w-full rounded-lg border border-theme-border bg-theme-card px-2 py-2 text-sm text-theme-text focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div>
          <label class="mb-1 block text-[0.6875rem] text-theme-text-muted">Prom</label>
          <input
            v-model="borrador.precioPromedio"
            type="number"
            min="0"
            step="0.01"
            placeholder="Auto"
            class="w-full rounded-lg border border-theme-border bg-theme-card px-2 py-2 text-sm text-theme-text focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div>
          <label class="mb-1 block text-[0.6875rem] text-theme-text-muted">Max</label>
          <input
            v-model="borrador.precioMaximo"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            class="w-full rounded-lg border border-theme-border bg-theme-card px-2 py-2 text-sm text-theme-text focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>
      <textarea
        v-model="borrador.notas"
        rows="2"
        placeholder="Notas (tienda, color, talla, etc.)"
        class="w-full resize-none rounded-lg border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
      ></textarea>
      <button
        class="w-full rounded-lg bg-violet-500 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600 disabled:opacity-60"
        :disabled="guardandoInline"
        @click="$emit('guardar-edicion')"
      >
        {{ guardandoInline ? 'Guardando...' : 'Guardar cambios' }}
      </button>
    </div>

    <!-- Opción: modo lectura (fila densa, tap-to-reveal) -->
    <template v-else>
      <div
        class="flex items-stretch gap-3 px-3 py-2.5"
        data-testid="futuros-opcion-fila"
        :class="!detalle.estadoDecision ? 'cursor-pointer' : ''"
        :role="!detalle.estadoDecision ? 'button' : undefined"
        :tabindex="!detalle.estadoDecision ? 0 : undefined"
        @click="!detalle.estadoDecision && $emit('seleccionar')"
        @keydown.enter.prevent="!detalle.estadoDecision && $emit('seleccionar')"
        @keydown.space.prevent="!detalle.estadoDecision && $emit('seleccionar')"
      >
        <!-- Número índice -->
        <div
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[0.6875rem] font-semibold"
          :class="
            seleccionada
              ? esMejor && (detalle.opciones || []).length > 1
                ? 'bg-emerald-500/30 text-emerald-200'
                : 'bg-sky-500/25 text-sky-200'
              : esMejor && (detalle.opciones || []).length > 1
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-theme-card text-theme-text-sec'
          "
        >
          {{ idx + 1 }}
        </div>

        <!-- Bloque texto principal -->
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-3">
            <p class="min-w-0 text-sm font-medium text-theme-text break-words">
              {{ opcion.nombre }}
            </p>
            <SharedMoney
              v-if="Number(opcion.precioPromedio) > 0"
              :value="opcion.precioPromedio"
              compact
              entero
              class="shrink-0 text-sm font-semibold text-sky-300"
            />
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem]">
            <!-- Con un solo precio se muestra solo ese (antes "S/ 480 — S/ 0") -->
            <span v-if="rangoPrecios(opcion)" class="text-theme-text-sec whitespace-nowrap">
              <SharedMoney :value="rangoPrecios(opcion).min" compact entero /><template
                v-if="rangoPrecios(opcion).max !== null"
              >
                — <SharedMoney :value="rangoPrecios(opcion).max" compact entero
              /></template>
            </span>
            <span
              v-if="esMejor && (detalle.opciones || []).length > 1"
              class="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[0.6875rem] font-medium text-emerald-300"
            >
              Mejor precio
            </span>
            <a
              v-if="opcion.referenciaUrl"
              :href="opcion.referenciaUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-0.5 text-violet-400 hover:text-violet-300 max-w-[9rem]"
              @click.stop
            >
              <span class="truncate">{{ hostDeUrl(opcion.referenciaUrl) }}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-2.5 w-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5"
                />
              </svg>
            </a>
          </div>
          <p v-if="opcion.notas" class="mt-1 text-[0.6875rem] text-theme-text-muted">
            {{ opcion.notas }}
          </p>
        </div>

        <!-- Imagen miniatura -->
        <img
          v-if="opcion.imagenUrl"
          :src="opcion.imagenUrl"
          :alt="opcion.nombre"
          class="h-12 w-12 shrink-0 self-center rounded-lg object-cover"
          loading="lazy"
          @click.stop
        />
      </div>

      <!-- Acciones reveladas al seleccionar (o automáticas si hay solo 1 opción) -->
      <div
        v-if="(seleccionada || detalle.opciones.length === 1) && !detalle.estadoDecision"
        class="flex items-center gap-1.5 border-t border-theme-border/60 px-3 py-2"
        @click.stop
      >
        <button
          class="flex-1 rounded-lg bg-sky-500/15 px-3 py-1.5 text-[0.6875rem] font-medium text-sky-300 transition-colors hover:bg-sky-500/25"
          @click="$emit('decidir', 'planificar')"
        >
          Planificar
        </button>
        <button
          class="flex-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[0.6875rem] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
          @click="$emit('decidir', 'comprar')"
        >
          Comprar ya
        </button>
        <div class="relative">
          <button
            class="tap-target flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-card text-theme-text-sec transition-colors hover:border-violet-500 hover:text-theme-text"
            title="Más acciones"
            data-testid="futuros-opcion-menu"
            @click.stop="$emit('toggle-menu')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <circle cx="4" cy="10" r="1.6" />
              <circle cx="10" cy="10" r="1.6" />
              <circle cx="16" cy="10" r="1.6" />
            </svg>
          </button>
          <div
            v-if="menuAbierto"
            class="absolute right-0 bottom-full z-20 mb-1 w-36 overflow-hidden rounded-xl border border-theme-border bg-theme-card shadow-lg"
          >
            <button
              v-if="detalle.opciones.length > 1 && idx > 0"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-theme-text transition-colors hover:bg-theme-input"
              @click="($emit('mover', -1), $emit('cerrar-menu'))"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4.5 15.75l7.5-7.5 7.5 7.5"
                />
              </svg>
              Subir
            </button>
            <button
              v-if="detalle.opciones.length > 1 && idx < detalle.opciones.length - 1"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-theme-text transition-colors hover:bg-theme-input"
              @click="($emit('mover', 1), $emit('cerrar-menu'))"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
              Bajar
            </button>
            <button
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-theme-text transition-colors hover:bg-theme-input"
              @click="($emit('editar'), $emit('cerrar-menu'))"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                />
              </svg>
              Editar
            </button>
            <button
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-400 transition-colors hover:bg-red-500/10"
              @click="($emit('eliminar'), $emit('cerrar-menu'))"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
// Fila de una opción dentro de un detalle de Gasto Futuro.
//
// Era el bloque más anidado de `Lista.vue` (proyecto → detalle → opción),
// 339 líneas a ocho niveles de indentación. Aquí es de presentación pura:
// recibe la opción, su detalle y el estado de UI, y sube las acciones. La
// lista sigue siendo dueña del estado —qué menú está abierto, qué opción
// se está editando— porque son exclusivos entre filas.
//
// `esMejor` llega calculado desde arriba en vez de calcularse aquí: la
// comparación necesita TODAS las opciones del detalle, y hacerla por fila
// sería recorrer la lista una vez por opción.
defineProps({
  opcion: { type: Object, required: true },
  /** Detalle al que pertenece. Se usa para el estado de decisión y para
   *  saber si la opción es la primera/última al ofrecer "mover". */
  detalle: { type: Object, required: true },
  /** Posición dentro del detalle (para numerar y para los topes de mover). */
  idx: { type: Number, required: true },
  seleccionada: { type: Boolean, default: false },
  /** ¿Es la mejor opción según el scoring? Solo se marca si hay más de una. */
  esMejor: { type: Boolean, default: false },
  /** ¿Esta fila está en modo edición? */
  editando: { type: Boolean, default: false },
  menuAbierto: { type: Boolean, default: false },
  guardandoInline: { type: Boolean, default: false },
})

// El borrador de edición es un v-model y no una prop: los inputs escriben
// dentro de él y la lista sigue siendo su dueña (`opcionEditando`). Con una
// prop normal esto sería mutar props — que es lo que hacía la plantilla
// original, solo que sin que se notara por estar todo en el mismo archivo.
const borrador = defineModel('borrador', { type: Object, default: null })

defineEmits([
  'seleccionar',
  'toggle-menu',
  'cerrar-menu',
  'editar',
  'eliminar',
  'mover',
  'decidir',
  'cancelar-edicion',
  'guardar-edicion',
])
</script>
