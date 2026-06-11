<template>
  <div>
    <LayoutAppHeader>
      <template #title>Configuraciones</template>
    </LayoutAppHeader>

    <div class="max-w-lg mx-auto lg:max-w-none lg:mx-0 px-4 lg:px-0 py-4 lg:py-6 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
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
          <p class="text-xs text-theme-text-sec mb-3">Tu nombre aparecerá en los reportes PDF generados.</p>
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
          <p class="text-xs text-theme-text-sec mb-3">Este monto se usará como presupuesto base al crear un nuevo mes en el planificador.</p>
          <div class="flex items-center gap-2">
            <span class="text-sm text-theme-text-muted">{{ currencySymbol }}</span>
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
          <p class="text-xs text-theme-text-sec mb-3">Afecta el cálculo de fechas en el registro por voz.</p>
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
          <p class="text-xs text-theme-text-sec mb-3">Formato de números y reconocimiento de voz.</p>
          <select
            v-model="form.locale"
            class="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-theme-text text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
          >
            <option value="es-PE">Español (Perú)</option>
            <option value="es-CO">Español (Colombia)</option>
            <option value="es-MX">Español (México)</option>
            <option value="es-AR">Español (Argentina)</option>
            <option value="es-ES">Español (España)</option>
            <option value="en-US">Inglés (EE.UU.)</option>
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

        <!-- Color de acento -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <div>
              <p class="text-sm font-medium text-theme-text">Color del tema</p>
              <p class="text-xs text-theme-text-sec">Elige el color de acento de la interfaz</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-3 mt-3">
            <button
              v-for="c in ACCENT_COLORS"
              :key="c.id"
              class="flex flex-col items-center gap-1.5 group"
              @click="setAccentColor(c.id)"
            >
              <span
                class="w-10 h-10 rounded-full border-2 transition-all duration-200 flex items-center justify-center"
                :style="{ backgroundColor: c.color }"
                :class="accentColor === c.id ? 'border-theme-text scale-110 shadow-lg' : 'border-transparent opacity-70 group-hover:opacity-100 group-hover:scale-105'"
              >
                <svg v-if="accentColor === c.id" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" :class="c.id === 'blanco' ? 'text-theme-text-muted' : 'text-theme-text'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span class="text-[10px] text-theme-text-sec">{{ c.label }}</span>
            </button>
          </div>
        </div>

        <!-- Tamaño de letra -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2" />
              <text x="7" y="16" font-size="12" font-weight="bold" fill="currentColor" stroke="none">A</text>
            </svg>
            <label class="text-sm font-medium text-theme-text">Tamano de letra</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">Ajusta el tamano del texto en toda la aplicacion. Ideal para mejorar la legibilidad.</p>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="size in FONT_SIZES"
              :key="size.id"
              class="flex items-center justify-center gap-2.5 py-3 px-3 rounded-xl border-2 transition-all duration-200"
              :class="fontSize === size.id ? 'border-blue-500 bg-blue-500/10' : 'border-theme-border hover:border-theme-border-md'"
              @click="cambiarTamanoLetra(size.id)"
            >
              <span
                class="font-semibold text-theme-text"
                :class="size.id === 'normal' ? 'text-sm' : 'text-[17px]'"
              >Aa</span>
              <span class="text-xs text-theme-text-sec">{{ size.label }}</span>
            </button>
          </div>
        </div>

        <!-- Modo daltónico -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <label class="flex items-center justify-between cursor-pointer">
            <div class="flex items-center gap-2.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-theme-text-sec shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <div>
                <span class="text-sm text-theme-text font-medium">Modo daltonico</span>
                <p class="text-[11px] text-theme-text-sec leading-tight">Reduce la variedad de colores y mejora el contraste</p>
              </div>
            </div>
            <button
              type="button"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 ml-3"
              :class="form.modoDaltonico ? 'bg-blue-500' : 'bg-theme-border-md'"
              @click="toggleModoDaltonico"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
                :class="form.modoDaltonico ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </label>
        </div>

        <!-- Vista del registro de gastos -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border">
          <div class="flex items-center gap-2 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <label class="text-sm font-medium text-theme-text">Vista del registro</label>
          </div>
          <p class="text-xs text-theme-text-sec mb-3">Elige que vistas mostrar en el historial de gastos. Puedes activar ambas a la vez.</p>
          <div class="space-y-3">
            <label class="flex items-center justify-between cursor-pointer">
              <div class="flex items-center gap-2.5">
                <span class="text-base">📅</span>
                <div>
                  <span class="text-sm text-theme-text font-medium">Por dia</span>
                  <p class="text-[11px] text-theme-text-sec leading-tight">Gastos agrupados por dia individual</p>
                </div>
              </div>
              <button
                type="button"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0"
                :class="form.vistaRegistroDia ? 'bg-blue-500' : 'bg-theme-border-md'"
                @click="toggleVistaDia"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
                  :class="form.vistaRegistroDia ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </label>
            <label class="flex items-center justify-between cursor-pointer">
              <div class="flex items-center gap-2.5">
                <span class="text-base">🗓️</span>
                <div>
                  <span class="text-sm text-theme-text font-medium">Por semana</span>
                  <p class="text-[11px] text-theme-text-sec leading-tight">Gastos agrupados por semana</p>
                </div>
              </div>
              <button
                type="button"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0"
                :class="form.vistaRegistroSemana ? 'bg-blue-500' : 'bg-theme-border-md'"
                @click="toggleVistaSemana"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
                  :class="form.vistaRegistroSemana ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </label>
          </div>
        </div>

        <!-- Administrar Categorías Link -->
        <button
          class="bg-theme-card rounded-2xl p-5 border border-theme-border w-full flex items-center justify-between group hover:border-theme-accent transition-colors"
          @click="navigateTo('/categorias')"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">🏷️</span>
            <div class="text-left">
              <label class="text-sm font-medium text-theme-text block group-hover:text-theme-accent transition-colors cursor-pointer">Mis categorias</label>
              <span class="text-xs text-theme-text-sec">Administra, crea o personaliza tus categorias</span>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-theme-text-muted group-hover:text-theme-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Vista previa (V3) — interfaces rediseñadas, momentáneo -->
        <div class="bg-theme-card rounded-2xl p-5 border border-theme-border lg:col-span-2">
          <label class="flex items-center justify-between cursor-pointer">
            <div class="flex items-center gap-2.5">
              <span class="text-xl">🧪</span>
              <div>
                <span class="text-sm text-theme-text font-medium">Vista previa de la nueva interfaz (Versión 5)</span>
                <p class="text-[11px] text-theme-text-sec leading-tight">Interfaces rediseñadas y funcionales: registra y edita con tus datos reales.</p>
              </div>
            </div>
            <button
              type="button"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 ml-3"
              :class="uiPreviewEnabled ? 'bg-violet-500' : 'bg-theme-border-md'"
              @click="toggleUiPreview"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
                :class="uiPreviewEnabled ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </label>
          <button
            v-if="uiPreviewEnabled"
            class="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 transition-colors flex items-center justify-center gap-2"
            @click="navigateTo('/preview')"
          >
            Abrir vista previa V5
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

        <!-- Save button -->
        <button
          class="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
          :class="hasChanges ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-theme-border-md text-theme-text-sec cursor-not-allowed'"
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

        <!-- Integraciones -->
        <div class="lg:col-span-2">
          <h2 class="text-sm font-semibold text-theme-text-sec uppercase tracking-wider mb-2 px-1 mt-4">
            Integraciones
          </h2>
        </div>
        <ConfiguracionesIntegracionGoogleCalendar />
      </template>

      <ConfiguracionesPerfilModoConfig class="mt-4" />
      <ConfiguracionesUsoLlm class="mt-4" />
      <ConfiguracionesFeatureFlagsConfig class="mt-4" />
      <ConfiguracionesSuperadminPanel />

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
const { accentColor, setAccentColor, ACCENT_COLORS, fontSize, setFontSize, FONT_SIZES, isColorblind, setColorblindMode } = useTheme()
const { logout } = useAuth()
const { enabled: uiPreviewEnabled, initUiPreview, setUiPreview } = useUiPreview()

function toggleUiPreview() {
  setUiPreview(!uiPreviewEnabled.value)
}

async function cerrarSesion() {
  await logout()
}

const form = reactive({
  nombre: '',
  presupuestoMensualDefault: 0,
  monedaPreferida: 'PEN',
  diaInicioCiclo: 1,
  zonaHoraria: 'America/Lima',
  locale: 'es-PE',
  diasPdfSaldadas: 7,
  vistaRegistroDia: true,
  vistaRegistroSemana: false,
  tamanoLetra: 'normal',
  modoDaltonico: false,
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
    || form.vistaRegistroDia !== originalValues.value.vistaRegistroDia
    || form.vistaRegistroSemana !== originalValues.value.vistaRegistroSemana
    || form.tamanoLetra !== originalValues.value.tamanoLetra
    || form.modoDaltonico !== originalValues.value.modoDaltonico
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
  form.vistaRegistroDia = config.value.vistaRegistroDia !== false
  form.vistaRegistroSemana = config.value.vistaRegistroSemana === true
  form.tamanoLetra = config.value.tamanoLetra || 'normal'
  form.modoDaltonico = config.value.modoDaltonico === true
  setFontSize(form.tamanoLetra)
  setColorblindMode(form.modoDaltonico)
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
      vistaRegistroDia: form.vistaRegistroDia,
      vistaRegistroSemana: form.vistaRegistroSemana,
      tamanoLetra: form.tamanoLetra,
      modoDaltonico: form.modoDaltonico,
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

function cambiarTamanoLetra(id) {
  form.tamanoLetra = id
  setFontSize(id)
}

function toggleModoDaltonico() {
  form.modoDaltonico = !form.modoDaltonico
  setColorblindMode(form.modoDaltonico)
}

function toggleVistaDia() {
  if (form.vistaRegistroDia && !form.vistaRegistroSemana) return
  form.vistaRegistroDia = !form.vistaRegistroDia
}

function toggleVistaSemana() {
  if (form.vistaRegistroSemana && !form.vistaRegistroDia) return
  form.vistaRegistroSemana = !form.vistaRegistroSemana
}

onMounted(async () => {
  initUiPreview()
  // fetchConfig usa SWR cache (5 min). loadFromConfig sí necesita el dato
  // listo, así que sí esperamos. En revisitas el cache responde instant.
  await fetchConfig()
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
