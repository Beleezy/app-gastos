<template>
  <div class="px-4 py-3">
    <div class="mb-2 flex items-center gap-2">
      <div class="relative flex-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-text-sec"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          v-model="busqueda"
          data-testid="futuros-buscar"
          aria-label="Buscar proyecto, detalle u opción"
          type="text"
          placeholder="Buscar proyecto, detalle u opción..."
          class="w-full rounded-xl border border-theme-border bg-theme-card py-2 pl-9 pr-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
        />
      </div>
      <button
        data-testid="futuros-orden"
        class="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-[0.6875rem] text-theme-text-sec hover:text-theme-text transition-colors"
        :title="`Ordenar por ${ordenLabel}`"
        @click="ciclarOrden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
          />
        </svg>
        {{ ordenLabel }}
      </button>
    </div>

    <!-- Filtros por prioridad y estado (pr-4: el último chip no se corta al borde) -->
    <div
      class="mb-4 flex items-center gap-2 overflow-x-auto pb-1 pr-8 scrollbar-hide scroll-fade-r"
    >
      <button
        v-for="f in filtrosProyecto"
        :key="f.value"
        :data-testid="`futuros-filtro-${f.value}`"
        :aria-pressed="filtroActual === f.value"
        class="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
        :class="[
          filtroActual === f.value
            ? f.accent || 'bg-violet-500 text-white'
            : 'bg-theme-card text-theme-text-muted',
          f.count === 0 && filtroActual !== f.value ? 'opacity-50' : '',
        ]"
        @click="filtroActual = f.value"
      >
        {{ f.label }}
        <span
          class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[0.6875rem] font-bold"
          :class="
            filtroActual === f.value
              ? 'bg-black/15 text-inherit'
              : 'bg-theme-border-md text-theme-text'
          "
        >
          {{ f.count }}
        </span>
      </button>
    </div>

    <div v-if="isLoading && gastosFuturos.length === 0" class="space-y-3">
      <div
        v-for="i in 2"
        :key="i"
        class="rounded-2xl border border-theme-border bg-theme-card p-4 animate-pulse"
      >
        <div class="h-4 w-2/3 rounded bg-theme-border-md"></div>
        <div class="mt-3 h-20 rounded-xl bg-theme-input"></div>
      </div>
    </div>

    <div
      v-else-if="gastosFiltrados.length === 0"
      class="rounded-2xl border border-dashed border-theme-border bg-theme-card px-5 py-10 text-center"
    >
      <div
        class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-theme-input text-sky-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h10.5"
          />
        </svg>
      </div>
      <p data-testid="futuros-vacio" class="text-sm text-theme-text">
        {{ busqueda ? 'No hay coincidencias' : 'Crea tu primer gasto futuro' }}
      </p>
      <p class="mt-1 text-xs text-theme-text-sec">
        {{
          busqueda
            ? 'Prueba con otro termino o limpia el filtro.'
            : 'Ejemplos: PC nueva, outfit invierno, setup streaming.'
        }}
      </p>
    </div>

    <div v-else class="space-y-3">
      <article
        v-for="proyecto in gastosFiltrados"
        :key="proyecto.id"
        data-testid="futuros-proyecto"
        class="rounded-2xl border border-theme-border bg-theme-card"
      >
        <!-- Cabecera: extraída a FuturosProyectoCabecera.vue. El menú y el
             despliegue siguen siendo estado de ESTA lista (son excluyentes
             entre tarjetas), así que viajan como props y vuelven como
             eventos. -->
        <FuturosProyectoCabecera
          :proyecto="proyecto"
          :expandido="estaExpandido(proyecto.id)"
          :menu-abierto="menuProyectoAbierto === proyecto.id"
          @toggle-expandir="toggleExpandido(proyecto.id)"
          @toggle-menu="toggleMenuProyecto(proyecto.id)"
          @cerrar-menu="cerrarMenuProyecto()"
          @editar="(emit('editar', proyecto), cerrarMenuProyecto())"
          @eliminar="((proyectoAEliminar = proyecto), cerrarMenuProyecto())"
        />

        <!-- Detalles expandidos (jerarquía plana, sin cards anidadas) -->
        <div v-if="estaExpandido(proyecto.id)" class="border-t border-theme-border px-4 pt-3 pb-4">
          <div class="space-y-5">
            <div
              v-for="detalle in detallesOrdenados(proyecto.detalles)"
              :key="detalle.id"
              class="space-y-2"
            >
              <!-- Cabecera detalle: modo edición -->
              <div
                v-if="detalleEditando?.detalleId === detalle.id"
                class="rounded-xl bg-theme-input p-3 space-y-2"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs font-medium text-theme-text">Editando detalle</p>
                  <button
                    class="text-[0.6875rem] text-theme-text-muted hover:text-theme-text transition-colors"
                    @click="cancelarEdicionDetalle"
                  >
                    Cancelar
                  </button>
                </div>
                <input
                  v-model="detalleEditando.nombre"
                  type="text"
                  placeholder="Nombre del detalle *"
                  class="w-full rounded-lg border border-theme-border bg-theme-input px-3 py-2 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
                />
                <div class="flex gap-1.5">
                  <button
                    v-for="opt in prioridadOpcionesDetalle"
                    :key="opt.value"
                    type="button"
                    class="flex-1 rounded-lg border px-2 py-1.5 text-[0.6875rem] font-medium transition-all"
                    :class="
                      detalleEditando.prioridad === opt.value
                        ? opt.activo
                        : 'border-theme-border bg-theme-input text-theme-text-muted'
                    "
                    @click="detalleEditando.prioridad = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
                <textarea
                  v-model="detalleEditando.notas"
                  rows="2"
                  placeholder="Notas del detalle (opcional)"
                  class="w-full resize-none rounded-lg border border-theme-border bg-theme-input px-3 py-2 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
                ></textarea>
                <button
                  class="w-full rounded-lg bg-violet-500 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600 disabled:opacity-60"
                  :disabled="guardandoInline"
                  @click="guardarEdicionDetalle(proyecto, detalle)"
                >
                  {{ guardandoInline ? 'Guardando...' : 'Guardar detalle' }}
                </button>
              </div>

              <!-- Cabecera detalle: modo lectura (título de sección) -->
              <div v-else class="flex items-center gap-2">
                <div class="min-w-0 flex-1">
                  <!-- Título: dot + nombre grande -->
                  <div class="flex items-center gap-2">
                    <span
                      class="h-2 w-2 shrink-0 rounded-full"
                      :class="puntoDetalleColor(detalle)"
                    ></span>
                    <h4
                      class="min-w-0 flex-1 text-base font-semibold text-theme-text leading-tight break-words"
                    >
                      {{ detalle.nombre }}
                    </h4>
                  </div>
                  <!-- Descripción (notas): subtítulo full-width que envuelve líneas -->
                  <p
                    v-if="detalle.notas"
                    class="mt-1 pl-4 text-[0.6875rem] text-theme-text-sec break-words leading-snug"
                  >
                    {{ detalle.notas }}
                  </p>
                  <!-- Metadata + precio en fila inferior -->
                  <div class="mt-1 flex items-center justify-between gap-3 pl-4">
                    <div class="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span class="text-[0.6875rem] text-theme-text-muted">
                        {{
                          detalle.estadoDecision
                            ? 'Opcion elegida'
                            : `${detalle.opciones.length} opcion${detalle.opciones.length !== 1 ? 'es' : ''}`
                        }}
                      </span>
                      <span
                        v-if="prioridadBadge(detalle.prioridad)"
                        class="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium"
                        :class="prioridadBadge(detalle.prioridad).clases"
                      >
                        {{ prioridadBadge(detalle.prioridad).label }}
                      </span>
                      <span
                        v-if="decisionBadge(detalle)"
                        class="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium"
                        :class="decisionBadge(detalle).clases"
                      >
                        {{ decisionBadge(detalle).label }}
                      </span>
                    </div>
                    <SharedMoney
                      :value="detalle.resumen.promedioReferencia || 0"
                      compact
                      entero
                      class="shrink-0 text-sm font-semibold text-sky-300 leading-tight"
                    />
                  </div>
                </div>
                <div class="flex shrink-0 items-center">
                  <div v-if="!detalle.estadoDecision" class="relative">
                    <button
                      class="tap-target flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-theme-border bg-theme-card text-theme-text-sec transition-colors hover:border-violet-500 hover:text-theme-text"
                      title="Más acciones"
                      @click="toggleMenuDetalle(detalle.id)"
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
                      v-if="menuDetalleAbierto === detalle.id"
                      class="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-theme-border bg-theme-card shadow-lg"
                    >
                      <button
                        class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-theme-text transition-colors hover:bg-theme-input"
                        @click="(iniciarEdicionDetalle(detalle), cerrarMenuDetalle())"
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
                        @click="(eliminarDetalleInline(proyecto, detalle), cerrarMenuDetalle())"
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

              <!-- Hint educativo cuando hay opciones por decidir -->
              <p
                v-if="
                  !detalle.estadoDecision &&
                  detalle.opciones.length > 1 &&
                  !haySeleccionEnDetalle(detalle.id)
                "
                class="pl-4 text-[0.6875rem] text-theme-text-muted italic"
              >
                💡 Toca una opción para comparar y decidir
              </p>

              <!-- Opciones del detalle (siempre visibles dentro del proyecto expandido) -->
              <div class="space-y-2">
                <!-- Fila de opción: extraída a FuturosOpcionFila.vue. El
                     estado exclusivo entre filas (menú abierto, opción en
                     edición, selección) sigue viviendo aquí. -->
                <FuturosOpcionFila
                  v-for="(opcion, idx) in detalle.opciones"
                  :key="opcion.id"
                  v-model:borrador="opcionEditando"
                  :opcion="opcion"
                  :detalle="detalle"
                  :idx="idx"
                  :seleccionada="estaSeleccionada(detalle.id, opcion.id)"
                  :es-mejor="esMejorOpcion(detalle, opcion)"
                  :editando="opcionEditando?.opcionId === opcion.id"
                  :menu-abierto="menuOpcionAbierto === opcion.id"
                  :guardando-inline="guardandoInline"
                  @seleccionar="seleccionarOpcion(detalle.id, opcion.id)"
                  @toggle-menu="toggleMenuOpcion(opcion.id)"
                  @cerrar-menu="cerrarMenuOpcion()"
                  @editar="iniciarEdicionOpcion(opcion)"
                  @eliminar="eliminarOpcionInline(proyecto, detalle, opcion)"
                  @mover="(dir) => moverOpcion(proyecto, detalle, opcion, dir)"
                  @decidir="(tipo) => abrirDecision(proyecto, detalle, opcion, tipo)"
                  @cancelar-edicion="cancelarEdicionOpcion()"
                  @guardar-edicion="guardarEdicionOpcion(proyecto, detalle)"
                />

                <!-- Botón agregar opción -->
                <button
                  v-if="!detalle.estadoDecision"
                  class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-theme-border bg-theme-input/50 py-2.5 text-[0.6875rem] font-medium text-theme-text-sec transition-colors hover:border-violet-500 hover:text-violet-400"
                  @click="abrirNuevaOpcion(proyecto, detalle)"
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
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  Agregar opción
                </button>
              </div>
            </div>

            <!-- Botón agregar detalle -->
            <button
              class="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-theme-border bg-theme-card/60 py-3 text-xs font-medium text-theme-text-sec transition-colors hover:border-violet-500 hover:text-violet-400"
              @click="abrirNuevoDetalle(proyecto)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Agregar detalle
            </button>
          </div>
        </div>
      </article>

      <div class="h-16"></div>
    </div>

    <!-- Overlay para cerrar menús kebab al hacer click fuera -->
    <div
      v-if="
        menuProyectoAbierto !== null || menuDetalleAbierto !== null || menuOpcionAbierto !== null
      "
      class="fixed inset-0 z-10"
      @click="cerrarTodosMenus"
    ></div>

    <!-- Confirmaciones de borrado.
         Antes eran tres modales escritos a mano aquí, casi idénticos entre
         sí y sin nada de lo que SharedConfirmDialog ya trae: role
         alertdialog, aria-modal, focus trap, cierre con Escape y con el
         botón atrás. El componente compartido se usa en otros 10 archivos
         del proyecto; este era el que se lo había perdido. -->
    <SharedConfirmDialog
      :model-value="proyectoAEliminar !== null"
      title="Eliminar gasto futuro"
      :message="`Se eliminarán «${proyectoAEliminar?.tipoGasto ?? ''}», sus detalles y todas las opciones guardadas.`"
      :confirm-label="eliminando ? 'Eliminando...' : 'Eliminar proyecto'"
      :loading="eliminando"
      variant="danger"
      @update:model-value="proyectoAEliminar = null"
      @confirm="confirmarEliminar"
    />

    <SharedConfirmDialog
      :model-value="detalleAEliminar !== null"
      title="Eliminar detalle"
      :message="mensajeEliminarDetalle"
      :confirm-label="guardandoInline ? 'Eliminando...' : 'Eliminar detalle'"
      :loading="guardandoInline"
      variant="danger"
      @update:model-value="detalleAEliminar = null"
      @confirm="confirmarEliminarDetalle"
    />

    <SharedConfirmDialog
      :model-value="opcionAEliminar !== null"
      title="Eliminar opción"
      :message="`Se eliminará «${opcionAEliminar?.opcion?.nombre ?? ''}» de forma permanente.`"
      :confirm-label="guardandoInline ? 'Eliminando...' : 'Eliminar opción'"
      :loading="guardandoInline"
      variant="danger"
      @update:model-value="opcionAEliminar = null"
      @confirm="confirmarEliminarOpcion"
    />

    <!-- Panel: nueva opción -->
    <div v-if="nuevaOpcionCtx" class="fixed inset-0 z-50 flex items-end justify-center">
      <div
        class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm"
        @click="cancelarNuevaOpcion"
      ></div>
      <div
        class="relative w-full max-w-lg rounded-t-3xl border-t border-theme-border bg-theme-card p-5 pb-8 space-y-3"
        style="max-height: 80dvh; overflow-y: auto; overscroll-behavior: contain"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-theme-text">Nueva opción</h3>
          <button
            class="text-theme-text-sec hover:text-theme-text transition-colors"
            @click="cancelarNuevaOpcion"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-xs text-theme-text-sec">
          {{ nuevaOpcionCtx.proyecto.tipoGasto }} › {{ nuevaOpcionCtx.detalle.nombre }}
        </p>
        <input
          v-model="nuevaOpcion.nombre"
          type="text"
          placeholder="Nombre de la opción *"
          class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
        />
        <input
          v-model="nuevaOpcion.referenciaUrl"
          type="url"
          placeholder="Link de referencia (opcional)"
          class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
        />
        <input
          v-model="nuevaOpcion.imagenUrl"
          type="url"
          placeholder="Link de imagen (opcional)"
          class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
        />
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="mb-1 block text-[0.6875rem] text-theme-text-muted">Min</label>
            <input
              v-model="nuevaOpcion.precioMinimo"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              class="w-full rounded-xl border border-theme-border bg-theme-input px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div>
            <label class="mb-1 block text-[0.6875rem] text-theme-text-muted">Prom</label>
            <input
              v-model="nuevaOpcion.precioPromedio"
              type="number"
              min="0"
              step="0.01"
              placeholder="Auto"
              class="w-full rounded-xl border border-theme-border bg-theme-input px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div>
            <label class="mb-1 block text-[0.6875rem] text-theme-text-muted">Max</label>
            <input
              v-model="nuevaOpcion.precioMaximo"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              class="w-full rounded-xl border border-theme-border bg-theme-input px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>
        <textarea
          v-model="nuevaOpcion.notas"
          rows="2"
          placeholder="Notas (tienda, color, talla, etc.)"
          class="w-full resize-none rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
        ></textarea>
        <p v-if="errorPanel" class="text-xs text-red-400">{{ errorPanel }}</p>
        <button
          class="w-full rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:opacity-60"
          :disabled="guardandoInline"
          @click="confirmarNuevaOpcion"
        >
          {{ guardandoInline ? 'Guardando...' : 'Agregar opción' }}
        </button>
      </div>
    </div>

    <!-- Panel: nuevo detalle -->
    <div v-if="nuevoDetalleCtx" class="fixed inset-0 z-50 flex items-end justify-center">
      <div
        class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm"
        @click="cancelarNuevoDetalle"
      ></div>
      <div
        class="relative w-full max-w-lg rounded-t-3xl border-t border-theme-border bg-theme-card p-5 pb-8 space-y-3"
        style="max-height: 85dvh; overflow-y: auto; overscroll-behavior: contain"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-theme-text">Nuevo detalle</h3>
          <button
            class="text-theme-text-sec hover:text-theme-text transition-colors"
            @click="cancelarNuevoDetalle"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-xs text-theme-text-sec">{{ nuevoDetalleCtx.proyecto.tipoGasto }}</p>
        <input
          v-model="nuevoDetalle.nombre"
          type="text"
          placeholder="Nombre del detalle * (ej: CPU, jean, casaca...)"
          class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
        />
        <div class="flex gap-1.5">
          <button
            v-for="opt in prioridadOpcionesDetalle"
            :key="opt.value"
            type="button"
            class="flex-1 rounded-lg border px-2 py-2 text-[0.6875rem] font-medium transition-all"
            :class="
              nuevoDetalle.prioridad === opt.value
                ? opt.activo
                : 'border-theme-border bg-theme-input text-theme-text-muted'
            "
            @click="nuevoDetalle.prioridad = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
        <textarea
          v-model="nuevoDetalle.notas"
          rows="2"
          placeholder="Notas del detalle (opcional)"
          class="w-full resize-none rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
        ></textarea>
        <p v-if="errorPanel" class="text-xs text-red-400">{{ errorPanel }}</p>
        <button
          class="w-full rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:opacity-60"
          :disabled="guardandoInline"
          @click="confirmarNuevoDetalle"
        >
          {{ guardandoInline ? 'Guardando...' : 'Agregar detalle' }}
        </button>
      </div>
    </div>
    <!-- Modal: decidir opción -->
    <div v-if="decisionCtx" class="fixed inset-0 z-50 flex items-end justify-center">
      <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="cancelarDecision"></div>
      <div
        class="relative w-full max-w-lg rounded-t-3xl border-t border-theme-border bg-theme-card p-5 pb-8 space-y-3"
        style="max-height: 85dvh; overflow-y: auto; overscroll-behavior: contain"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-theme-text">
            {{ decisionCtx.tipo === 'comprar' ? 'Comprar ya' : 'Enviar al planificador' }}
          </h3>
          <button
            class="text-theme-text-sec hover:text-theme-text transition-colors"
            @click="cancelarDecision"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-xs text-theme-text-sec">
          {{ decisionCtx.proyecto.tipoGasto }} › {{ decisionCtx.detalle.nombre }} ›
          <span class="text-theme-text">{{ decisionCtx.opcion.nombre }}</span>
        </p>
        <p class="text-[0.6875rem] text-theme-text-muted">
          {{
            decisionCtx.tipo === 'comprar'
              ? 'Se registrará como gasto real y el detalle quedará marcado como comprado. Las demás opciones se eliminarán.'
              : 'Se creará un gasto planificado en el mes de la fecha elegida. Las demás opciones se eliminarán.'
          }}
        </p>
        <div>
          <label class="mb-1 block text-[0.6875rem] text-theme-text-muted">Monto *</label>
          <input
            v-model="decisionForm.monto"
            type="number"
            min="0"
            step="0.01"
            class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div>
          <label class="mb-1 block text-[0.6875rem] text-theme-text-muted">
            {{ decisionCtx.tipo === 'comprar' ? 'Fecha de compra *' : 'Fecha probable de pago *' }}
          </label>
          <input
            v-model="decisionForm.fecha"
            type="date"
            class="w-full rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <textarea
          v-model="decisionForm.notas"
          rows="2"
          placeholder="Notas (opcional)"
          class="w-full resize-none rounded-xl border border-theme-border bg-theme-input px-4 py-3 text-sm text-theme-text placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
        ></textarea>
        <p v-if="errorPanel" class="text-xs text-red-400">{{ errorPanel }}</p>
        <button
          class="w-full rounded-xl py-3 text-sm font-semibold text-theme-text transition-colors disabled:opacity-60"
          :class="
            decisionCtx.tipo === 'comprar'
              ? 'bg-emerald-500/80 hover:bg-emerald-500'
              : 'bg-sky-500/80 hover:bg-sky-500'
          "
          :disabled="decidiendo"
          @click="confirmarDecision"
        >
          {{
            decidiendo
              ? 'Guardando...'
              : decisionCtx.tipo === 'comprar'
                ? 'Registrar compra'
                : 'Crear gasto planificado'
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['editar'])

const { gastosFuturos, updateGastoFuturo, deleteGastoFuturo, decidirOpcionFutura, isLoading } =
  useGastosFuturos()
const { success, error: toastError } = useToast()

// progresoProyecto / proyectoTieneDecididos / proyectoCompletamenteDecidido /
// detallesOrdenados / decisionBadge / prioridadBadge / hostDeUrl /
// rangoPrecios viven en composables/useFuturosDecision.js
// (auto-importado). Estaban inline en este archivo, que es el más grande del
// proyecto y el único módulo sin tests E2E: fuera son funciones puras con su
// propia batería en tests/futurosDecision.test.js.

const busqueda = ref('')
const busquedaDebounced = useDebouncedRef(busqueda, 200)
const filtroActual = ref('todos')
const ordenActual = ref('reciente')
const ordenes = [
  { value: 'reciente', label: 'Reciente' },
  { value: 'prom_desc', label: 'Mayor $' },
  { value: 'prom_asc', label: 'Menor $' },
  { value: 'nombre', label: 'Nombre' },
]
const ordenLabel = computed(
  () => ordenes.find((o) => o.value === ordenActual.value)?.label || 'Reciente',
)
// El mensaje de borrado de detalle avisa cuántas opciones se pierden: es
// la única de las tres confirmaciones cuyo texto no es una plantilla fija.
const mensajeEliminarDetalle = computed(() => {
  const d = detalleAEliminar.value?.detalle
  if (!d) return ''
  const n = d.opciones?.length || 0
  const cola = n > 0 ? ` Se perderá${n !== 1 ? 'n' : ''} ${n} opcion${n !== 1 ? 'es' : ''}.` : ''
  return `Se eliminará «${d.nombre ?? ''}» y todas sus opciones guardadas.${cola}`
})

function ciclarOrden() {
  const idx = ordenes.findIndex((o) => o.value === ordenActual.value)
  ordenActual.value = ordenes[(idx + 1) % ordenes.length].value
}

const filtrosProyecto = computed(() => {
  const all = gastosFuturos.value
  const count = (pred) => all.filter(pred).length
  return [
    { value: 'todos', label: 'Todos', count: all.length },
    {
      value: 'alta',
      label: 'Alta',
      count: count((p) => p.prioridad === 3),
      accent: 'bg-red-500 text-white',
    },
    {
      value: 'pendientes',
      label: 'Pendientes',
      count: count((p) => !proyectoCompletamenteDecidido(p)),
    },
    {
      value: 'decididos',
      label: 'Decididos',
      count: count(proyectoTieneDecididos),
      accent: 'bg-sky-500 text-white',
    },
  ]
})

const menuProyectoAbierto = ref(null)
const menuDetalleAbierto = ref(null)
const menuOpcionAbierto = ref(null)
function toggleMenuProyecto(id) {
  menuProyectoAbierto.value = menuProyectoAbierto.value === id ? null : id
  menuDetalleAbierto.value = null
  menuOpcionAbierto.value = null
}
function cerrarMenuProyecto() {
  menuProyectoAbierto.value = null
}
function toggleMenuDetalle(id) {
  menuDetalleAbierto.value = menuDetalleAbierto.value === id ? null : id
  menuProyectoAbierto.value = null
  menuOpcionAbierto.value = null
}
function cerrarMenuDetalle() {
  menuDetalleAbierto.value = null
}
function toggleMenuOpcion(id) {
  menuOpcionAbierto.value = menuOpcionAbierto.value === id ? null : id
  menuProyectoAbierto.value = null
  menuDetalleAbierto.value = null
}
function cerrarMenuOpcion() {
  menuOpcionAbierto.value = null
}
function cerrarTodosMenus() {
  menuProyectoAbierto.value = null
  menuDetalleAbierto.value = null
  menuOpcionAbierto.value = null
}

const expandido = ref({})
// Selección "tap-to-reveal" por detalle: { [detalleId]: opcionId }
const opcionSeleccionadaPorDetalle = ref({})
function seleccionarOpcion(detalleId, opcionId) {
  const actual = opcionSeleccionadaPorDetalle.value[detalleId]
  opcionSeleccionadaPorDetalle.value = {
    ...opcionSeleccionadaPorDetalle.value,
    [detalleId]: actual === opcionId ? null : opcionId,
  }
  // Cualquier cambio de selección cierra el menú · · · de opción
  menuOpcionAbierto.value = null
}
function estaSeleccionada(detalleId, opcionId) {
  return opcionSeleccionadaPorDetalle.value[detalleId] === opcionId
}

function haySeleccionEnDetalle(detalleId) {
  return !!opcionSeleccionadaPorDetalle.value[detalleId]
}

function puntoDetalleColor(detalle) {
  if (detalle.estadoDecision === 'comprada') return 'bg-emerald-400'
  if (detalle.estadoDecision === 'planificada') return 'bg-sky-400'
  if (detalle.prioridad === 3) return 'bg-red-400'
  if (detalle.prioridad === 2) return 'bg-amber-400'
  if (detalle.prioridad === 1) return 'bg-emerald-400'
  return 'bg-gray-500'
}
const proyectoAEliminar = ref(null)
const detalleAEliminar = ref(null) // { proyecto, detalle }
const opcionAEliminar = ref(null) // { proyecto, detalle, opcion }
const eliminando = ref(false)
const guardandoInline = ref(false)
const errorPanel = ref('')

const prioridadOpcionesDetalle = [
  { value: 3, label: 'Alta', activo: 'bg-red-500/15 border-red-500/40 text-red-400' },
  { value: 2, label: 'Media', activo: 'bg-amber-500/15 border-amber-500/40 text-amber-300' },
  { value: 1, label: 'Baja', activo: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' },
  { value: 0, label: 'Sin def.', activo: 'bg-theme-input border-theme-border text-theme-text-sec' },
]

// Edición inline de detalle
const detalleEditando = ref(null) // { detalleId, nombre, notas, prioridad }

// Edición inline de opción
const opcionEditando = ref(null) // { opcionId, nombre, referenciaUrl, ... }

// Nuevo detalle
const nuevoDetalleCtx = ref(null) // { proyecto }
const nuevoDetalle = ref({ nombre: '', notas: '', prioridad: 0 })

// Nueva opción
const nuevaOpcionCtx = ref(null) // { proyecto, detalle }
const nuevaOpcion = ref(opcionVacia())

// Decisión de opción
const decisionCtx = ref(null) // { proyecto, detalle, opcion, tipo }
const decisionForm = ref({ monto: '', fecha: '', notas: '' })
const decidiendo = ref(false)

// Botón atrás (Android) + bloqueo del scroll del body para cada modal/sheet
useOverlayBack(
  computed(() => proyectoAEliminar.value !== null),
  () => {
    proyectoAEliminar.value = null
  },
)
useOverlayBack(
  computed(() => detalleAEliminar.value !== null),
  () => {
    detalleAEliminar.value = null
  },
)
useOverlayBack(
  computed(() => opcionAEliminar.value !== null),
  () => {
    opcionAEliminar.value = null
  },
)
useOverlayBack(
  computed(() => nuevoDetalleCtx.value !== null),
  () => cancelarNuevoDetalle(),
)
useOverlayBack(
  computed(() => nuevaOpcionCtx.value !== null),
  () => cancelarNuevaOpcion(),
)
useOverlayBack(
  computed(() => decisionCtx.value !== null),
  () => cancelarDecision(),
)

watch(
  gastosFuturos,
  (items) => {
    if (!items.length) {
      expandido.value = {}
      opcionSeleccionadaPorDetalle.value = {}
    }
  },
  { immediate: true },
)

const gastosFiltrados = computed(() => {
  const term = (busquedaDebounced.value || '').trim().toLowerCase()
  let result = gastosFuturos.value

  // Filtro por prioridad/estado
  if (filtroActual.value === 'alta') result = result.filter((p) => p.prioridad === 3)
  else if (filtroActual.value === 'media') result = result.filter((p) => p.prioridad === 2)
  else if (filtroActual.value === 'baja') result = result.filter((p) => p.prioridad === 1)
  else if (filtroActual.value === 'pendientes')
    result = result.filter((p) => !proyectoCompletamenteDecidido(p))
  else if (filtroActual.value === 'decididos') result = result.filter(proyectoTieneDecididos)

  // Búsqueda
  if (term) {
    result = result.filter((proyecto) => {
      const hayEnProyecto = [
        proyecto.tipoGasto,
        proyecto.descripcion,
        proyecto.categoriaNombre,
      ].some((v) => (v || '').toLowerCase().includes(term))
      if (hayEnProyecto) return true
      return proyecto.detalles.some(
        (d) =>
          (d.nombre || '').toLowerCase().includes(term) ||
          (d.notas || '').toLowerCase().includes(term) ||
          d.opciones.some(
            (o) =>
              (o.nombre || '').toLowerCase().includes(term) ||
              (o.notas || '').toLowerCase().includes(term) ||
              (o.referenciaUrl || '').toLowerCase().includes(term),
          ),
      )
    })
  }

  // Ordenamiento — la prioridad siempre manda (alta > media > baja > sin def.)
  // y el modo elegido por el usuario actúa como criterio secundario.
  const sorted = [...result]
  const cmpPrioridad = (a, b) => (b.prioridad ?? 0) - (a.prioridad ?? 0)
  let cmpSecundario
  if (ordenActual.value === 'prom_desc') {
    cmpSecundario = (a, b) => (b.resumen?.totalPromedio || 0) - (a.resumen?.totalPromedio || 0)
  } else if (ordenActual.value === 'prom_asc') {
    cmpSecundario = (a, b) => (a.resumen?.totalPromedio || 0) - (b.resumen?.totalPromedio || 0)
  } else if (ordenActual.value === 'nombre') {
    cmpSecundario = (a, b) => (a.tipoGasto || '').localeCompare(b.tipoGasto || '')
  } else {
    // 'reciente'
    cmpSecundario = (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  }
  sorted.sort((a, b) => cmpPrioridad(a, b) || cmpSecundario(a, b))
  return sorted
})

function toggleExpandido(id) {
  expandido.value = { ...expandido.value, [id]: !expandido.value[id] }
}

function estaExpandido(id) {
  return !!expandido.value[id]
}

const { rankearOpciones: rankearOpcionesHelper } = useOpcionesScoring()
// `rankearOpciones` se usa SOLO para identificar la mejor opción
// (badge visual). NO reordena el array — eso preservaría la
// flecha "subir/bajar" del usuario.
function esMejorOpcion(detalle, opcion) {
  const opciones = detalle?.opciones
  if (!Array.isArray(opciones) || opciones.length < 2) return false
  const ranked = rankearOpcionesHelper(opciones)
  if (!ranked.length) return false
  return ranked[0]?.id === opcion?.id
}

function opcionVacia() {
  return {
    nombre: '',
    referenciaUrl: '',
    imagenUrl: '',
    precioMinimo: '',
    precioPromedio: '',
    precioMaximo: '',
    notas: '',
  }
}

function parseAmount(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : null
}

function opcionToPayload(o) {
  return {
    nombre: o.nombre,
    referenciaUrl: o.referenciaUrl || null,
    imagenUrl: o.imagenUrl || null,
    precioMinimo: o.precioMinimo ?? null,
    precioPromedio: o.precioPromedio ?? null,
    precioMaximo: o.precioMaximo ?? null,
    notas: o.notas || null,
  }
}

// Construye el payload completo del proyecto con detalles/opciones sobreescritos según necesidad
function buildPayload(proyecto, overrides = {}) {
  return {
    categoriaId: proyecto.categoriaId,
    tipoGasto: proyecto.tipoGasto,
    descripcion: proyecto.descripcion,
    prioridad: proyecto.prioridad ?? 0,
    detalles: (overrides.detalles ?? proyecto.detalles).map((d) => {
      const detalleOverride = overrides.detalleId === d.id ? overrides : null
      const useOverrideOpciones =
        overrides.opcionesDetalleId && d.id && overrides.opcionesDetalleId === d.id
      return {
        id: d.id,
        nombre: detalleOverride?.nombre ?? d.nombre,
        notas: detalleOverride?.notas ?? d.notas ?? null,
        prioridad: detalleOverride?.prioridad ?? d.prioridad ?? 0,
        opciones: (useOverrideOpciones ? overrides.opciones : d.opciones || []).map(
          opcionToPayload,
        ),
      }
    }),
  }
}

// ── Detalle: editar ──────────────────────────────────────────────
function iniciarEdicionDetalle(detalle) {
  opcionEditando.value = null
  detalleEditando.value = {
    detalleId: detalle.id,
    nombre: detalle.nombre,
    notas: detalle.notas || '',
    prioridad: detalle.prioridad ?? 0,
  }
}

function cancelarEdicionDetalle() {
  detalleEditando.value = null
}

async function guardarEdicionDetalle(proyecto, detalle) {
  const nombre = detalleEditando.value.nombre.trim()
  if (!nombre) {
    toastError('El nombre del detalle es obligatorio')
    return
  }

  guardandoInline.value = true
  try {
    await updateGastoFuturo(
      proyecto.id,
      buildPayload(proyecto, {
        detalleId: detalle.id,
        nombre,
        notas: detalleEditando.value.notas.trim() || null,
        prioridad: detalleEditando.value.prioridad ?? 0,
      }),
    )
    detalleEditando.value = null
    success('Detalle actualizado')
  } catch (e) {
    toastError(handleApiError(e, 'No se pudo guardar'))
  } finally {
    guardandoInline.value = false
  }
}

// ── Detalle: eliminar ────────────────────────────────────────────
function eliminarDetalleInline(proyecto, detalle) {
  if (proyecto.detalles.length <= 1) {
    toastError('El proyecto debe tener al menos un detalle')
    return
  }
  detalleAEliminar.value = { proyecto, detalle }
}

async function confirmarEliminarDetalle() {
  if (!detalleAEliminar.value) return
  const { proyecto, detalle } = detalleAEliminar.value
  guardandoInline.value = true
  try {
    await updateGastoFuturo(
      proyecto.id,
      buildPayload(proyecto, {
        detalles: proyecto.detalles.filter((d) => d.id !== detalle.id),
      }),
    )
    success('Detalle eliminado')
    detalleAEliminar.value = null
  } catch (e) {
    toastError(handleApiError(e, 'No se pudo eliminar'))
  } finally {
    guardandoInline.value = false
  }
}

// ── Detalle: nuevo ───────────────────────────────────────────────
function abrirNuevoDetalle(proyecto) {
  nuevoDetalleCtx.value = { proyecto }
  nuevoDetalle.value = { nombre: '', notas: '', prioridad: 0 }
  errorPanel.value = ''
}

function cancelarNuevoDetalle() {
  nuevoDetalleCtx.value = null
  errorPanel.value = ''
}

async function confirmarNuevoDetalle() {
  const nombre = nuevoDetalle.value.nombre.trim()
  if (!nombre) {
    errorPanel.value = 'El nombre del detalle es obligatorio'
    return
  }

  const { proyecto } = nuevoDetalleCtx.value
  const detalleNuevo = {
    nombre,
    notas: nuevoDetalle.value.notas.trim() || null,
    prioridad: nuevoDetalle.value.prioridad ?? 0,
    opciones: [],
  }

  guardandoInline.value = true
  errorPanel.value = ''
  try {
    await updateGastoFuturo(
      proyecto.id,
      buildPayload(proyecto, {
        detalles: [...proyecto.detalles, detalleNuevo],
      }),
    )
    nuevoDetalleCtx.value = null
    success('Detalle agregado')
  } catch (e) {
    errorPanel.value = handleApiError(e, 'No se pudo agregar')
  } finally {
    guardandoInline.value = false
  }
}

// ── Opción: reordenar ────────────────────────────────────────────
async function moverOpcion(proyecto, detalle, opcion, direction) {
  const idx = detalle.opciones.indexOf(opcion)
  const newIdx = idx + direction
  if (newIdx < 0 || newIdx >= detalle.opciones.length) return

  const reordered = [...detalle.opciones]
  ;[reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]]

  guardandoInline.value = true
  try {
    await updateGastoFuturo(
      proyecto.id,
      buildPayload(proyecto, {
        opcionesDetalleId: detalle.id,
        opciones: reordered.map(opcionToPayload),
      }),
    )
  } catch (e) {
    toastError(handleApiError(e, 'No se pudo reordenar'))
  } finally {
    guardandoInline.value = false
  }
}

// ── Opción: editar ───────────────────────────────────────────────
function iniciarEdicionOpcion(opcion) {
  detalleEditando.value = null
  opcionEditando.value = {
    opcionId: opcion.id,
    nombre: opcion.nombre,
    referenciaUrl: opcion.referenciaUrl || '',
    imagenUrl: opcion.imagenUrl || '',
    precioMinimo: opcion.precioMinimo ?? '',
    precioPromedio: opcion.precioPromedio ?? '',
    precioMaximo: opcion.precioMaximo ?? '',
    notas: opcion.notas || '',
  }
}

function cancelarEdicionOpcion() {
  opcionEditando.value = null
}

async function guardarEdicionOpcion(proyecto, detalle) {
  const nombre = opcionEditando.value.nombre.trim()
  if (!nombre) {
    toastError('El nombre de la opcion es obligatorio')
    return
  }

  const opcionActualizada = {
    nombre,
    referenciaUrl: opcionEditando.value.referenciaUrl.trim() || null,
    imagenUrl: opcionEditando.value.imagenUrl.trim() || null,
    precioMinimo: parseAmount(opcionEditando.value.precioMinimo),
    precioPromedio: parseAmount(opcionEditando.value.precioPromedio),
    precioMaximo: parseAmount(opcionEditando.value.precioMaximo),
    notas: opcionEditando.value.notas.trim() || null,
  }

  const nuevasOpciones = detalle.opciones.map((o) =>
    o.id === opcionEditando.value.opcionId ? opcionActualizada : opcionToPayload(o),
  )

  guardandoInline.value = true
  try {
    await updateGastoFuturo(
      proyecto.id,
      buildPayload(proyecto, {
        opcionesDetalleId: detalle.id,
        opciones: nuevasOpciones,
      }),
    )
    opcionEditando.value = null
    success('Opcion actualizada')
  } catch (e) {
    toastError(handleApiError(e, 'No se pudo guardar'))
  } finally {
    guardandoInline.value = false
  }
}

// ── Opción: eliminar ─────────────────────────────────────────────
function eliminarOpcionInline(proyecto, detalle, opcion) {
  opcionAEliminar.value = { proyecto, detalle, opcion }
}

async function confirmarEliminarOpcion() {
  if (!opcionAEliminar.value) return
  const { proyecto, detalle, opcion } = opcionAEliminar.value
  const nuevasOpciones = detalle.opciones.filter((o) => o.id !== opcion.id).map(opcionToPayload)

  guardandoInline.value = true
  try {
    await updateGastoFuturo(
      proyecto.id,
      buildPayload(proyecto, {
        opcionesDetalleId: detalle.id,
        opciones: nuevasOpciones,
      }),
    )
    success('Opcion eliminada')
    opcionAEliminar.value = null
  } catch (e) {
    toastError(handleApiError(e, 'No se pudo eliminar'))
  } finally {
    guardandoInline.value = false
  }
}

// ── Opción: nueva ────────────────────────────────────────────────
function abrirNuevaOpcion(proyecto, detalle) {
  nuevaOpcionCtx.value = { proyecto, detalle }
  nuevaOpcion.value = opcionVacia()
  errorPanel.value = ''
}

function cancelarNuevaOpcion() {
  nuevaOpcionCtx.value = null
  errorPanel.value = ''
}

async function confirmarNuevaOpcion() {
  const nombre = nuevaOpcion.value.nombre.trim()
  if (!nombre) {
    errorPanel.value = 'El nombre de la opcion es obligatorio'
    return
  }

  const { proyecto, detalle } = nuevaOpcionCtx.value
  const opcionNueva = {
    nombre,
    referenciaUrl: nuevaOpcion.value.referenciaUrl.trim() || null,
    imagenUrl: nuevaOpcion.value.imagenUrl.trim() || null,
    precioMinimo: parseAmount(nuevaOpcion.value.precioMinimo),
    precioPromedio: parseAmount(nuevaOpcion.value.precioPromedio),
    precioMaximo: parseAmount(nuevaOpcion.value.precioMaximo),
    notas: nuevaOpcion.value.notas.trim() || null,
  }

  guardandoInline.value = true
  errorPanel.value = ''
  try {
    await updateGastoFuturo(
      proyecto.id,
      buildPayload(proyecto, {
        opcionesDetalleId: detalle.id,
        opciones: [...detalle.opciones.map(opcionToPayload), opcionNueva],
      }),
    )
    nuevaOpcionCtx.value = null
    success('Opcion agregada')
  } catch (e) {
    errorPanel.value = handleApiError(e, 'No se pudo agregar')
  } finally {
    guardandoInline.value = false
  }
}

// ── Decisión de opción ───────────────────────────────────────────
function abrirDecision(proyecto, detalle, opcion, tipo) {
  const { fechaHoy } = useFechaPeru()
  const hoy = fechaHoy()
  decisionCtx.value = { proyecto, detalle, opcion, tipo }
  decisionForm.value = {
    monto: opcion.precioPromedio ?? opcion.precioMinimo ?? opcion.precioMaximo ?? '',
    fecha: hoy,
    notas: '',
  }
  errorPanel.value = ''
}

function cancelarDecision() {
  decisionCtx.value = null
  errorPanel.value = ''
}

async function confirmarDecision() {
  const ctx = decisionCtx.value
  if (!ctx) return
  const monto = parseAmount(decisionForm.value.monto)
  if (!monto || monto <= 0) {
    errorPanel.value = 'El monto debe ser mayor a 0'
    return
  }
  if (!decisionForm.value.fecha) {
    errorPanel.value = 'La fecha es obligatoria'
    return
  }

  decidiendo.value = true
  errorPanel.value = ''
  try {
    await decidirOpcionFutura(ctx.proyecto.id, ctx.detalle.id, {
      tipo: ctx.tipo,
      opcionId: ctx.opcion.id,
      monto,
      fecha: decisionForm.value.fecha,
      notas: decisionForm.value.notas.trim() || null,
    })
    success(ctx.tipo === 'comprar' ? 'Opcion comprada y registrada' : 'Opcion planificada')
    decisionCtx.value = null
  } catch (e) {
    errorPanel.value = handleApiError(e, 'No se pudo decidir')
  } finally {
    decidiendo.value = false
  }
}

// ── Proyecto: eliminar ───────────────────────────────────────────
async function confirmarEliminar() {
  if (!proyectoAEliminar.value) return
  eliminando.value = true
  try {
    await deleteGastoFuturo(proyectoAEliminar.value.id)
    success('Gasto futuro eliminado')
    proyectoAEliminar.value = null
  } catch (e) {
    toastError(handleApiError(e, 'No se pudo eliminar el gasto futuro'))
  } finally {
    eliminando.value = false
  }
}
</script>
