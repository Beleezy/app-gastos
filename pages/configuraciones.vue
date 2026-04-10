<template>
  <div>
    <LayoutAppHeader>
      <template #title>Configuraciones</template>
    </LayoutAppHeader>

    <div class="max-w-lg mx-auto px-4 py-4 space-y-4">
      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="bg-theme-card rounded-xl p-5 animate-pulse">
          <div class="h-4 bg-theme-border-md rounded w-1/3 mb-3"></div>
          <div class="h-10 bg-theme-border-md rounded w-full"></div>
        </div>
      </div>

      <template v-else>
        <!-- Nombre de usuario -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <label class="text-sm font-medium text-theme-text">Nombre</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">Tu nombre aparecera en los reportes PDF generados.</p>
          <input
            v-model="form.nombre"
            type="text"
            maxlength="100"
            class="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
            placeholder="Ej: Bryan"
          />
        </div>

        <!-- Presupuesto mensual por defecto -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <label class="text-sm font-medium text-theme-text">Presupuesto mensual por defecto</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">Este monto se usara como presupuesto base al crear un nuevo mes en el planificador.</p>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-400">{{ currencySymbol }}</span>
            <input
              v-model="form.presupuestoMensualDefault"
              type="number"
              step="0.01"
              min="0"
              class="flex-1 bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder="0.00"
            />
          </div>
        </div>

        <!-- Moneda preferida -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <label class="text-sm font-medium text-theme-text">Moneda</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">Moneda principal para mostrar tus montos.</p>
          <select
            v-model="form.monedaPreferida"
            class="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
          >
            <option value="PEN">Soles (S/)</option>
            <option value="USD">Dolares (US$)</option>
            <option value="EUR">Euros (EUR)</option>
          </select>
        </div>

        <!-- Zona horaria -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <label class="text-sm font-medium text-theme-text">Zona horaria</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">Afecta el calculo de fechas en el registro por voz.</p>
          <select
            v-model="form.zonaHoraria"
            class="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
          >
            <option value="America/Lima">Lima (UTC-5)</option>
            <option value="America/Bogota">Bogota (UTC-5)</option>
            <option value="America/Mexico_City">Ciudad de Mexico (UTC-6)</option>
            <option value="America/Argentina/Buenos_Aires">Buenos Aires (UTC-3)</option>
            <option value="America/Santiago">Santiago (UTC-4)</option>
            <option value="America/New_York">Nueva York (UTC-5)</option>
            <option value="Europe/Madrid">Madrid (UTC+1)</option>
          </select>
        </div>

        <!-- Locale -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <label class="text-sm font-medium text-theme-text">Formato regional</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">Formato de numeros y reconocimiento de voz.</p>
          <select
            v-model="form.locale"
            class="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
          >
            <option value="es-PE">Espanol (Peru)</option>
            <option value="es-CO">Espanol (Colombia)</option>
            <option value="es-MX">Espanol (Mexico)</option>
            <option value="es-AR">Espanol (Argentina)</option>
            <option value="es-ES">Espanol (Espana)</option>
            <option value="en-US">Ingles (EE.UU.)</option>
          </select>
        </div>

        <!-- Día de inicio de ciclo -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <label class="text-sm font-medium text-theme-text">Dia de inicio del ciclo</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">El dia del mes en que comienza tu ciclo financiero.</p>
          <input
            v-model.number="form.diaInicioCiclo"
            type="number"
            min="1"
            max="28"
            class="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
            placeholder="1"
          />
        </div>

        <!-- Días PDF saldadas -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <label class="text-sm font-medium text-theme-text">Dias de saldadas en PDF</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">Cantidad de dias hacia atras para incluir deudas saldadas al exportar PDF.</p>
          <input
            v-model.number="form.diasPdfSaldadas"
            type="number"
            min="1"
            max="90"
            class="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
            placeholder="7"
          />
        </div>

        <!-- Tema -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 110 10A5 5 0 0112 7z" />
              </svg>
              <div>
                <p class="text-sm font-medium text-theme-text">Tema</p>
                <p class="text-xs text-theme-text-sec">{{ isDark ? 'Oscuro' : 'Claro' }}</p>
              </div>
            </div>
            <button
              class="relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none"
              :class="isDark ? 'bg-primary-700' : 'bg-blue-500'"
              @click="toggleTheme"
            >
              <span
                class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300"
                :class="isDark ? 'left-0.5' : 'left-6'"
              ></span>
            </button>
          </div>
        </div>

        <!-- Categorías personalizadas -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <span class="text-base">🏷️</span>
              <label class="text-sm font-medium text-theme-text">Mis categorias</label>
            </div>
            <span class="text-xs text-theme-text-sec">{{ misCategorias.length }} activas</span>
          </div>
          <p class="text-xs text-theme-text-sec mb-4">Personaliza las categorias para clasificar tus gastos.</p>

          <!-- Categorías actuales del usuario -->
          <div v-if="misCategorias.length > 0" class="space-y-2 mb-4">
            <div
              v-for="cat in misCategorias"
              :key="cat.id"
              class="flex items-center justify-between bg-theme-input rounded-xl px-3 py-2.5 border border-theme-border"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <span
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                  :style="{ backgroundColor: cat.color + '26' }"
                >{{ cat.icono }}</span>
                <div class="min-w-0">
                  <p class="text-sm text-theme-text truncate">{{ cat.nombre }}</p>
                  <p v-if="cat.esPredefinida" class="text-[10px] text-theme-text-muted">Predefinida</p>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button
                  v-if="!cat.esPredefinida"
                  class="p-1.5 rounded-lg text-theme-text-sec hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  @click="editarCategoria(cat)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  v-if="!cat.esPredefinida"
                  class="p-1.5 rounded-lg text-theme-text-sec hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  @click="eliminarCategoria(cat)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Botón agregar categoría -->
          <button
            class="w-full py-2.5 rounded-xl text-sm font-medium border-2 border-dashed border-theme-border text-theme-text-sec hover:border-blue-500/50 hover:text-blue-400 transition-colors"
            @click="mostrarSelectorCategorias = true"
          >
            + Agregar categoria
          </button>
        </div>

        <!-- Modal selector de categorías -->
        <Teleport to="body">
          <Transition name="modal">
            <div v-if="mostrarSelectorCategorias" class="fixed inset-0 z-50 flex items-end justify-center">
              <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cerrarSelectorCategorias"></div>
              <div class="relative w-full max-w-lg bg-theme-card rounded-t-2xl border-t border-theme-border max-h-[85vh] flex flex-col animate-slide-up">
                <!-- Header del modal -->
                <div class="flex items-center justify-between p-4 border-b border-theme-border shrink-0">
                  <h3 class="text-base font-semibold text-theme-text">
                    {{ editandoCategoria ? 'Editar categoria' : 'Agregar categoria' }}
                  </h3>
                  <button class="p-1 rounded-lg hover:bg-theme-border-md transition-colors" @click="cerrarSelectorCategorias">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-theme-text-sec" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <!-- Tabs: Preseleccionadas / Personalizada -->
                <div class="flex border-b border-theme-border shrink-0">
                  <button
                    class="flex-1 py-2.5 text-sm font-medium transition-colors"
                    :class="tabCategoria === 'preseleccionadas' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-theme-text-sec'"
                    @click="tabCategoria = 'preseleccionadas'"
                  >
                    Preseleccionadas
                  </button>
                  <button
                    class="flex-1 py-2.5 text-sm font-medium transition-colors"
                    :class="tabCategoria === 'personalizada' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-theme-text-sec'"
                    @click="tabCategoria = 'personalizada'"
                  >
                    Crear nueva
                  </button>
                </div>

                <!-- Contenido scrolleable -->
                <div class="overflow-y-auto flex-1 p-4">
                  <!-- Tab preseleccionadas -->
                  <div v-if="tabCategoria === 'preseleccionadas'">
                    <!-- Buscador -->
                    <input
                      v-model="busquedaCategoria"
                      type="text"
                      placeholder="Buscar categoria..."
                      class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-sm text-theme-text mb-3 focus:outline-none focus:border-blue-500/50"
                    />
                    <div class="grid grid-cols-2 gap-2">
                      <button
                        v-for="cat in categoriasPreseleccionadasFiltradas"
                        :key="cat.nombre"
                        class="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all"
                        :class="categoriasExistentes.has(cat.nombre) ? 'border-theme-border bg-theme-border-md opacity-50 cursor-not-allowed' : 'border-theme-border hover:border-blue-500/50 active:scale-[0.97]'"
                        :disabled="categoriasExistentes.has(cat.nombre)"
                        @click="agregarPreseleccionada(cat)"
                      >
                        <span class="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" :style="{ backgroundColor: cat.color + '26' }">{{ cat.icono }}</span>
                        <span class="text-xs text-theme-text truncate">{{ cat.nombre }}</span>
                        <svg v-if="categoriasExistentes.has(cat.nombre)" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Tab personalizada -->
                  <div v-if="tabCategoria === 'personalizada'" class="space-y-4">
                    <!-- Nombre -->
                    <div>
                      <label class="text-xs text-theme-text-sec mb-1 block">Nombre</label>
                      <input
                        v-model="nuevaCategoria.nombre"
                        type="text"
                        maxlength="50"
                        class="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-blue-500/50"
                        placeholder="Ej: Mascotas, Suscripciones..."
                      />
                    </div>

                    <!-- Selector de ícono -->
                    <div>
                      <label class="text-xs text-theme-text-sec mb-1 block">Icono</label>
                      <div class="grid grid-cols-8 gap-1.5">
                        <button
                          v-for="emoji in ICONOS_DISPONIBLES"
                          :key="emoji"
                          class="w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all"
                          :class="nuevaCategoria.icono === emoji ? 'bg-blue-500/20 ring-2 ring-blue-500 scale-110' : 'bg-theme-input hover:bg-theme-border-md'"
                          @click="nuevaCategoria.icono = emoji"
                        >{{ emoji }}</button>
                      </div>
                    </div>

                    <!-- Selector de color -->
                    <div>
                      <label class="text-xs text-theme-text-sec mb-1 block">Color</label>
                      <div class="grid grid-cols-8 gap-1.5">
                        <button
                          v-for="c in COLORES_DISPONIBLES"
                          :key="c"
                          class="w-9 h-9 rounded-lg transition-all"
                          :class="nuevaCategoria.color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'"
                          :style="{ backgroundColor: c }"
                          @click="nuevaCategoria.color = c"
                        ></button>
                      </div>
                    </div>

                    <!-- Preview -->
                    <div v-if="nuevaCategoria.nombre && nuevaCategoria.icono" class="bg-theme-input rounded-xl p-3 border border-theme-border">
                      <p class="text-xs text-theme-text-sec mb-2">Vista previa:</p>
                      <div class="flex items-center gap-2.5">
                        <span class="w-9 h-9 rounded-lg flex items-center justify-center text-lg" :style="{ backgroundColor: nuevaCategoria.color + '26' }">{{ nuevaCategoria.icono }}</span>
                        <span class="text-sm font-medium text-theme-text">{{ nuevaCategoria.nombre }}</span>
                      </div>
                    </div>

                    <!-- Botón crear -->
                    <button
                      class="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                      :class="puedeCrearCategoria ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-primary-700/50 text-gray-500 cursor-not-allowed'"
                      :disabled="!puedeCrearCategoria || guardandoCategoria"
                      @click="crearCategoriaPersonalizada"
                    >
                      {{ guardandoCategoria ? 'Guardando...' : (editandoCategoria ? 'Guardar cambios' : 'Crear categoria') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>

        <!-- Modal confirmar eliminación -->
        <Teleport to="body">
          <Transition name="modal">
            <div v-if="categoriaAEliminar" class="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="categoriaAEliminar = null"></div>
              <div class="relative bg-theme-card rounded-2xl border border-theme-border p-5 w-full max-w-sm">
                <div class="text-center">
                  <span class="text-3xl block mb-3">{{ categoriaAEliminar.icono }}</span>
                  <h3 class="text-base font-semibold text-theme-text mb-1">Eliminar categoria</h3>
                  <p class="text-sm text-theme-text-sec mb-4">¿Eliminar "{{ categoriaAEliminar.nombre }}"? No se puede deshacer.</p>
                  <div class="flex gap-3">
                    <button
                      class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-theme-input border border-theme-border text-theme-text hover:bg-theme-border-md transition-colors"
                      @click="categoriaAEliminar = null"
                    >Cancelar</button>
                    <button
                      class="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors active:scale-[0.98]"
                      :disabled="eliminandoCategoria"
                      @click="confirmarEliminar"
                    >{{ eliminandoCategoria ? 'Eliminando...' : 'Eliminar' }}</button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>

        <!-- Save button -->
        <button
          class="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
          :class="hasChanges ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-primary-700/50 text-gray-500 cursor-not-allowed'"
          :disabled="!hasChanges || saving"
          @click="guardar"
        >
          {{ saving ? 'Guardando...' : 'Guardar cambios' }}
        </button>

        <!-- Toast -->
        <Transition name="toast">
          <div v-if="toastMsg"
            class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg backdrop-blur-sm"
          >
            {{ toastMsg }}
          </div>
        </Transition>

        <!-- Cerrar sesión -->
        <button
          class="w-full py-3 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all active:scale-[0.98] border border-red-500/20"
          @click="cerrarSesion"
        >
          <span class="flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesion
          </span>
        </button>
      </template>

      <!-- App info -->
      <div class="text-center pt-4 pb-8">
        <p class="text-xs text-theme-text-muted">Mis Finanzas v{{ useRuntimeConfig().public.appVersion }}</p>
        <p class="text-xs text-theme-text-muted mt-1">Sistema de finanzas personales</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const { config, isLoading, fetchConfig, updateConfig } = useConfiguraciones()
const { currencySymbol } = useCurrency()
const { isDark, toggleTheme } = useTheme()
const { logout } = useAuth()

async function cerrarSesion() {
  await logout()
}

// ── Categorías ──
const CATEGORIAS_PRESELECCIONADAS = [
  { nombre: 'Alimentacion',    icono: '🍽️',  color: '#ef4444' },
  { nombre: 'Transporte',      icono: '🚌',  color: '#3b82f6' },
  { nombre: 'Vivienda',        icono: '🏠',  color: '#f59e0b' },
  { nombre: 'Salud',           icono: '🏥',  color: '#10b981' },
  { nombre: 'Educacion',       icono: '📚',  color: '#8b5cf6' },
  { nombre: 'Entretenimiento', icono: '🎮',  color: '#ec4899' },
  { nombre: 'Vestimenta',      icono: '👕',  color: '#f97316' },
  { nombre: 'Servicios',       icono: '⚡',  color: '#06b6d4' },
  { nombre: 'Ahorro',          icono: '💰',  color: '#22c55e' },
  { nombre: 'Deudas',          icono: '💳',  color: '#e11d48' },
  { nombre: 'Otros',           icono: '📦',  color: '#6b7280' },
  { nombre: 'Mascotas',        icono: '🐾',  color: '#a855f7' },
  { nombre: 'Suscripciones',   icono: '🔄',  color: '#6366f1' },
  { nombre: 'Supermercado',    icono: '🛒',  color: '#f43f5e' },
  { nombre: 'Restaurantes',    icono: '🍔',  color: '#dc2626' },
  { nombre: 'Cafe',            icono: '☕',  color: '#92400e' },
  { nombre: 'Snacks',          icono: '🍿',  color: '#fb923c' },
  { nombre: 'Bebidas',         icono: '🥤',  color: '#f472b6' },
  { nombre: 'Farmacia',        icono: '💊',  color: '#14b8a6' },
  { nombre: 'Gym',             icono: '🏋️',  color: '#0ea5e9' },
  { nombre: 'Deportes',        icono: '⚽',  color: '#16a34a' },
  { nombre: 'Taxi',            icono: '🚕',  color: '#eab308' },
  { nombre: 'Gasolina',        icono: '⛽',  color: '#78716c' },
  { nombre: 'Estacionamiento', icono: '🅿️',  color: '#64748b' },
  { nombre: 'Peajes',          icono: '🛣️',  color: '#475569' },
  { nombre: 'Internet',        icono: '🌐',  color: '#2563eb' },
  { nombre: 'Telefono',        icono: '📱',  color: '#7c3aed' },
  { nombre: 'Streaming',       icono: '📺',  color: '#9333ea' },
  { nombre: 'Musica',          icono: '🎵',  color: '#c026d3' },
  { nombre: 'Videojuegos',     icono: '🎮',  color: '#4f46e5' },
  { nombre: 'Libros',          icono: '📖',  color: '#0d9488' },
  { nombre: 'Cursos',          icono: '🎓',  color: '#7c3aed' },
  { nombre: 'Regalos',         icono: '🎁',  color: '#e11d48' },
  { nombre: 'Donaciones',      icono: '🤝',  color: '#059669' },
  { nombre: 'Seguros',         icono: '🛡️',  color: '#1d4ed8' },
  { nombre: 'Impuestos',       icono: '🏛️',  color: '#374151' },
  { nombre: 'Alquiler',        icono: '🔑',  color: '#b45309' },
  { nombre: 'Mantenimiento',   icono: '🔧',  color: '#525252' },
  { nombre: 'Limpieza',        icono: '🧹',  color: '#0891b2' },
  { nombre: 'Muebles',         icono: '🛋️',  color: '#a16207' },
  { nombre: 'Electronica',     icono: '💻',  color: '#334155' },
  { nombre: 'Ropa Deportiva',  icono: '👟',  color: '#ea580c' },
  { nombre: 'Belleza',         icono: '💅',  color: '#db2777' },
  { nombre: 'Peluqueria',      icono: '💇',  color: '#be185d' },
  { nombre: 'Dentista',        icono: '🦷',  color: '#0f766e' },
  { nombre: 'Optica',          icono: '👓',  color: '#4338ca' },
  { nombre: 'Viajes',          icono: '✈️',  color: '#0284c7' },
  { nombre: 'Hoteleria',       icono: '🏨',  color: '#7e22ce' },
  { nombre: 'Propinas',        icono: '💵',  color: '#15803d' },
  { nombre: 'Inversiones',     icono: '📈',  color: '#047857' },
]

const ICONOS_DISPONIBLES = [
  '🍽️','🚌','🏠','🏥','📚','🎮','👕','⚡','💰','💳','📦','🐾',
  '🔄','🛒','🍔','☕','🍿','🥤','💊','🏋️','⚽','🚕','⛽','🌐',
  '📱','📺','🎵','📖','🎓','🎁','🤝','🛡️','🏛️','🔑','🔧','🧹',
  '🛋️','💻','👟','💅','💇','🦷','👓','✈️','🏨','💵','📈','🎪',
  '🧸','🍕','🍺','🎂','🏖️','⛪','🎭','🖥️','🎨','🧘','🚲','🛍️',
  '🪴','🧊','🎯','📮',
]

const COLORES_DISPONIBLES = [
  '#ef4444','#f97316','#f59e0b','#eab308','#22c55e','#10b981','#14b8a6','#06b6d4',
  '#0ea5e9','#3b82f6','#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899','#f43f5e',
  '#78716c','#64748b','#374151','#92400e','#166534','#1e40af','#581c87','#9f1239',
]

const misCategorias = ref([])
const mostrarSelectorCategorias = ref(false)
const tabCategoria = ref('preseleccionadas')
const busquedaCategoria = ref('')
const guardandoCategoria = ref(false)
const eliminandoCategoria = ref(false)
const categoriaAEliminar = ref(null)
const editandoCategoria = ref(null)

const nuevaCategoria = reactive({
  nombre: '',
  icono: '📦',
  color: '#6b7280',
})

const categoriasExistentes = computed(() => {
  return new Set(misCategorias.value.map(c => c.nombre))
})

const categoriasPreseleccionadasFiltradas = computed(() => {
  if (!busquedaCategoria.value) return CATEGORIAS_PRESELECCIONADAS
  const q = busquedaCategoria.value.toLowerCase()
  return CATEGORIAS_PRESELECCIONADAS.filter(c => c.nombre.toLowerCase().includes(q))
})

const puedeCrearCategoria = computed(() => {
  return nuevaCategoria.nombre.trim().length > 0 && nuevaCategoria.icono && nuevaCategoria.color
})

async function fetchCategorias() {
  try {
    const data = await $fetch('/api/categorias')
    misCategorias.value = data
  } catch (e) {
    console.error('Error cargando categorías:', e)
  }
}

async function agregarPreseleccionada(cat) {
  if (categoriasExistentes.value.has(cat.nombre)) return
  guardandoCategoria.value = true
  try {
    await $fetch('/api/categorias', {
      method: 'POST',
      body: { nombre: cat.nombre, icono: cat.icono, color: cat.color },
    })
    await fetchCategorias()
    showCatToast(`${cat.icono} ${cat.nombre} agregada`)
  } catch (e) {
    showCatToast(e?.data?.message || 'Error al agregar')
  } finally {
    guardandoCategoria.value = false
  }
}

async function crearCategoriaPersonalizada() {
  if (!puedeCrearCategoria.value) return
  guardandoCategoria.value = true
  try {
    if (editandoCategoria.value) {
      await $fetch(`/api/categorias/${editandoCategoria.value.id}`, {
        method: 'PUT',
        body: { nombre: nuevaCategoria.nombre.trim(), icono: nuevaCategoria.icono, color: nuevaCategoria.color },
      })
      showCatToast('Categoria actualizada')
    } else {
      await $fetch('/api/categorias', {
        method: 'POST',
        body: { nombre: nuevaCategoria.nombre.trim(), icono: nuevaCategoria.icono, color: nuevaCategoria.color },
      })
      showCatToast(`${nuevaCategoria.icono} ${nuevaCategoria.nombre} creada`)
    }
    await fetchCategorias()
    cerrarSelectorCategorias()
  } catch (e) {
    showCatToast(e?.data?.message || 'Error al guardar')
  } finally {
    guardandoCategoria.value = false
  }
}

function editarCategoria(cat) {
  editandoCategoria.value = cat
  nuevaCategoria.nombre = cat.nombre
  nuevaCategoria.icono = cat.icono
  nuevaCategoria.color = cat.color
  tabCategoria.value = 'personalizada'
  mostrarSelectorCategorias.value = true
}

function eliminarCategoria(cat) {
  categoriaAEliminar.value = cat
}

async function confirmarEliminar() {
  if (!categoriaAEliminar.value) return
  eliminandoCategoria.value = true
  try {
    await $fetch(`/api/categorias/${categoriaAEliminar.value.id}`, { method: 'DELETE' })
    await fetchCategorias()
    showCatToast('Categoria eliminada')
  } catch (e) {
    showCatToast(e?.data?.message || 'Error al eliminar')
  } finally {
    eliminandoCategoria.value = false
    categoriaAEliminar.value = null
  }
}

function cerrarSelectorCategorias() {
  mostrarSelectorCategorias.value = false
  editandoCategoria.value = null
  nuevaCategoria.nombre = ''
  nuevaCategoria.icono = '📦'
  nuevaCategoria.color = '#6b7280'
  busquedaCategoria.value = ''
  tabCategoria.value = 'preseleccionadas'
}

function showCatToast(msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2500)
}

const form = reactive({
  nombre: '',
  presupuestoMensualDefault: 0,
  monedaPreferida: 'PEN',
  diaInicioCiclo: 1,
  zonaHoraria: 'America/Lima',
  locale: 'es-PE',
  diasPdfSaldadas: 7,
})

const originalValues = ref({})
const saving = ref(false)
const toastMsg = ref('')

const hasChanges = computed(() => {
  return form.nombre !== originalValues.value.nombre
    || form.presupuestoMensualDefault != originalValues.value.presupuestoMensualDefault
    || form.monedaPreferida !== originalValues.value.monedaPreferida
    || form.diaInicioCiclo != originalValues.value.diaInicioCiclo
    || form.zonaHoraria !== originalValues.value.zonaHoraria
    || form.locale !== originalValues.value.locale
    || form.diasPdfSaldadas != originalValues.value.diasPdfSaldadas
})

function loadFromConfig() {
  if (!config.value) return
  form.nombre = config.value.nombre || ''
  form.presupuestoMensualDefault = parseFloat(config.value.presupuestoMensualDefault) || 0
  form.monedaPreferida = config.value.monedaPreferida || 'PEN'
  form.diaInicioCiclo = config.value.diaInicioCiclo || 1
  form.zonaHoraria = config.value.zonaHoraria || 'America/Lima'
  form.locale = config.value.locale || 'es-PE'
  form.diasPdfSaldadas = config.value.diasPdfSaldadas || 7
  originalValues.value = { ...form }
}

async function guardar() {
  saving.value = true
  try {
    await updateConfig({
      nombre: form.nombre,
      presupuestoMensualDefault: parseFloat(form.presupuestoMensualDefault) || 0,
      monedaPreferida: form.monedaPreferida,
      diaInicioCiclo: form.diaInicioCiclo,
      zonaHoraria: form.zonaHoraria,
      locale: form.locale,
      diasPdfSaldadas: form.diasPdfSaldadas,
    })
    originalValues.value = { ...form }
    toastMsg.value = 'Configuracion guardada'
    setTimeout(() => { toastMsg.value = '' }, 2500)
  } catch (e) {
    useToast().error(handleApiError(e))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchConfig(), fetchCategorias()])
  loadFromConfig()
})
</script>

<style scoped>
.toast-enter-active { transition: all 0.3s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translate(-50%, 20px); }
.toast-leave-to { opacity: 0; transform: translate(-50%, -10px); }

.modal-enter-active { transition: all 0.3s ease-out; }
.modal-leave-active { transition: all 0.2s ease-in; }
.modal-enter-from { opacity: 0; }
.modal-leave-to { opacity: 0; }

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
</style>
