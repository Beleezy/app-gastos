<template>
  <!-- Cabecera del proyecto (compacta) -->
  <div class="p-4">
    <div class="flex min-w-0 gap-3">
      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        :style="{ backgroundColor: (proyecto.categoriaColor || '#6b7280') + '22' }"
      >
        <span class="text-lg">{{ proyecto.categoriaIcono || '📦' }}</span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-sm font-semibold text-theme-text break-words">
            {{ proyecto.tipoGasto }}
          </h3>
          <span
            v-if="prioridadBadge(proyecto.prioridad)"
            class="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium"
            :class="prioridadBadge(proyecto.prioridad).clases"
          >
            {{ prioridadBadge(proyecto.prioridad).label }}
          </span>
          <span class="truncate text-[0.6875rem] text-theme-text-sec">
            {{ proyecto.categoriaNombre || 'Sin categoria' }}
          </span>
        </div>
        <p
          v-if="proyecto.descripcion"
          class="mt-0.5 truncate text-[0.6875rem] text-theme-text-muted"
        >
          {{ proyecto.descripcion }}
        </p>
      </div>
      <!-- Decidido X/N en esquina superior derecha -->
      <div v-if="progresoProyecto(proyecto).total > 0" class="shrink-0 text-right">
        <p class="text-[0.6875rem] uppercase tracking-[0.16em] text-theme-text-muted">Decidido</p>
        <p
          class="text-xs font-semibold whitespace-nowrap"
          :class="
            progresoProyecto(proyecto).porcentaje === 100 ? 'text-emerald-400' : 'text-sky-300'
          "
        >
          {{ progresoProyecto(proyecto).decididos }}/{{ progresoProyecto(proyecto).total }} ·
          {{ progresoProyecto(proyecto).porcentaje }}%
        </p>
        <span
          v-if="progresoProyecto(proyecto).decididos === 0 && !expandido"
          class="mt-0.5 inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[0.6875rem] font-medium text-violet-300"
        >
          <span class="h-1 w-1 rounded-full bg-violet-400 animate-pulse"></span>
          Por decidir
        </span>
      </div>
    </div>

    <!-- Min/Prom/Max densos en una fila. Enteros via SharedMoney: con texto
         grande a 380px los montos de 4 cifras con decimales se truncaban
         ("S/ 4,34..."); "k" solo aplica desde 5 cifras. -->
    <div class="mt-3 flex items-stretch rounded-xl bg-theme-input">
      <div class="min-w-0 flex-1 px-1.5 py-2 text-center">
        <p class="text-[0.6875rem] uppercase tracking-[0.16em] text-theme-text-muted">Mín</p>
        <SharedMoney
          :value="proyecto.resumen.totalMinimo"
          compact
          entero
          class="mt-0.5 block text-xs font-semibold text-emerald-400"
        />
      </div>
      <div class="w-px bg-theme-border/60"></div>
      <div class="min-w-0 flex-1 px-1.5 py-2 text-center">
        <p class="text-[0.6875rem] uppercase tracking-[0.16em] text-theme-text-muted">Prom</p>
        <SharedMoney
          :value="proyecto.resumen.totalPromedio"
          compact
          entero
          class="mt-0.5 block text-xs font-semibold text-sky-300"
        />
      </div>
      <div class="w-px bg-theme-border/60"></div>
      <div class="min-w-0 flex-1 px-1.5 py-2 text-center">
        <p class="text-[0.6875rem] uppercase tracking-[0.16em] text-theme-text-muted">Máx</p>
        <SharedMoney
          :value="proyecto.resumen.totalMaximo"
          compact
          entero
          class="mt-0.5 block text-xs font-semibold text-amber-300"
        />
      </div>
    </div>

    <!-- Barra slim de progreso -->
    <div
      v-if="progresoProyecto(proyecto).total > 0"
      class="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-theme-input"
    >
      <div
        class="h-full rounded-full transition-all duration-500"
        :class="
          progresoProyecto(proyecto).porcentaje === 100
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
            : 'bg-gradient-to-r from-sky-500 to-sky-400'
        "
        :style="{ width: progresoProyecto(proyecto).porcentaje + '%' }"
      ></div>
    </div>

    <!-- Footer: Ver detalles + kebab -->
    <div class="mt-3 flex items-center gap-2">
      <button
        data-testid="futuros-expandir"
        :aria-expanded="expandido"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-theme-input px-3 py-1.5 text-[0.6875rem] text-theme-text-sec transition-colors hover:text-theme-text"
        @click="$emit('toggle-expandir')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3.5 w-3.5 transition-transform"
          :class="expandido ? 'rotate-180' : ''"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25L12 15.75 4.5 8.25" />
        </svg>
        {{
          expandido
            ? 'Ocultar detalles'
            : `Ver ${proyecto.resumen.totalDetalles} detalle${proyecto.resumen.totalDetalles !== 1 ? 's' : ''}`
        }}
      </button>
      <div class="relative">
        <button
          class="tap-target flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-theme-border bg-theme-card text-theme-text-sec transition-colors hover:border-violet-500 hover:text-theme-text"
          :title="'Más acciones'"
          @click="$emit('toggle-menu')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
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
          class="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-theme-border bg-theme-card shadow-lg"
        >
          <button
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-theme-text transition-colors hover:bg-theme-input"
            @click="$emit('editar')"
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
            @click="$emit('eliminar')"
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
  </div>
</template>

<script setup>
// Cabecera de la tarjeta de proyecto en la lista de Gastos Futuros.
//
// Extraída de `Lista.vue`, que con ~1900 líneas era el archivo más grande
// del proyecto y tenía toda la jerarquía (proyecto → detalle → opción) en
// una sola plantilla. Este bloque es puramente de presentación: recibe el
// proyecto y su estado de UI, y comunica las acciones hacia arriba. No
// toca el store ni la API.
//
// `prioridadBadge` y `progresoProyecto` vienen de
// composables/useFuturosDecision.js (auto-importado), donde están
// cubiertos por tests.
defineProps({
  proyecto: { type: Object, required: true },
  /** ¿Está desplegado el bloque de detalles? */
  expandido: { type: Boolean, default: false },
  /** ¿Está abierto el menú kebab de ESTA tarjeta? */
  menuAbierto: { type: Boolean, default: false },
})

defineEmits(['toggle-expandir', 'toggle-menu', 'cerrar-menu', 'editar', 'eliminar'])
</script>
