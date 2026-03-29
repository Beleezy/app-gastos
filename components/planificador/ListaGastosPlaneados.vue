<template>
  <div class="px-4 py-3">
    <!-- Filters -->
    <div class="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
      <button class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-500 text-white">
        Todos
      </button>
      <button class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-primary-800 text-gray-400">
        Pendientes
      </button>
      <button class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-primary-800 text-gray-400">
        Pagados
      </button>
    </div>

    <!-- Category Group: Vivienda -->
    <div class="mb-5">
      <div class="flex items-center gap-2 mb-2.5">
        <span class="w-1.5 h-1.5 rounded-full" style="background-color: #f59e0b"></span>
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vivienda</h3>
        <span class="text-xs text-gray-500 ml-auto">S/ 1,200.00</span>
      </div>

      <!-- Item: Alquiler -->
      <div class="bg-primary-800 rounded-xl p-3.5 mb-2 border border-primary-700/30">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                 style="background-color: rgba(245, 158, 11, 0.15)">
              <span class="text-base">🏠</span>
            </div>
            <div>
              <p class="text-sm font-medium text-white">Alquiler departamento</p>
              <p class="text-xs text-gray-500 mt-0.5">1 de marzo, 2026</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-white">S/ 950.00</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 mt-1">
              Pagado
            </span>
          </div>
        </div>
      </div>

      <!-- Item: Servicios de agua -->
      <div class="bg-primary-800 rounded-xl p-3.5 mb-2 border border-primary-700/30">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                 style="background-color: rgba(245, 158, 11, 0.15)">
              <span class="text-base">💧</span>
            </div>
            <div>
              <p class="text-sm font-medium text-white">Recibo de agua</p>
              <p class="text-xs text-gray-500 mt-0.5">15 de marzo, 2026</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-white">S/ 45.00</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/15 text-orange-400 mt-1">
              Pendiente
            </span>
          </div>
        </div>
      </div>

      <!-- Item: Electricidad -->
      <div class="bg-primary-800 rounded-xl p-3.5 mb-2 border border-primary-700/30">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                 style="background-color: rgba(245, 158, 11, 0.15)">
              <span class="text-base">⚡</span>
            </div>
            <div>
              <p class="text-sm font-medium text-white">Recibo de luz</p>
              <p class="text-xs text-gray-500 mt-0.5">18 de marzo, 2026</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-white">S/ 85.00</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 mt-1">
              Pagado
            </span>
          </div>
        </div>
      </div>

      <!-- Item: Internet -->
      <div class="bg-primary-800 rounded-xl p-3.5 border border-primary-700/30">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                 style="background-color: rgba(245, 158, 11, 0.15)">
              <span class="text-base">🌐</span>
            </div>
            <div>
              <p class="text-sm font-medium text-white">Internet fibra óptica</p>
              <p class="text-xs text-gray-500 mt-0.5">20 de marzo, 2026</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-white">S/ 120.00</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/15 text-orange-400 mt-1">
              Pendiente
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Group: Alimentación -->
    <div class="mb-5">
      <div class="flex items-center gap-2 mb-2.5">
        <span class="w-1.5 h-1.5 rounded-full" style="background-color: #ef4444"></span>
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Alimentación</h3>
        <span class="text-xs text-gray-500 ml-auto">S/ 800.00</span>
      </div>

      <!-- Item: Mercado semanal -->
      <div class="bg-primary-800 rounded-xl p-3.5 mb-2 border border-primary-700/30">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                 style="background-color: rgba(239, 68, 68, 0.15)">
              <span class="text-base">🛒</span>
            </div>
            <div>
              <p class="text-sm font-medium text-white">Mercado semanal</p>
              <p class="text-xs text-gray-500 mt-0.5">Cada lunes</p>
              <div class="flex items-center gap-1 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="text-[10px] text-indigo-400">Recurrente</span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-white">S/ 600.00</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/15 text-orange-400 mt-1">
              Pendiente
            </span>
          </div>
        </div>
      </div>

      <!-- Item: Delivery -->
      <div class="bg-primary-800 rounded-xl p-3.5 border border-primary-700/30">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                 style="background-color: rgba(239, 68, 68, 0.15)">
              <span class="text-base">🍕</span>
            </div>
            <div>
              <p class="text-sm font-medium text-white">Delivery y restaurantes</p>
              <p class="text-xs text-gray-500 mt-0.5">Estimado mensual</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-white">S/ 200.00</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/15 text-orange-400 mt-1">
              Pendiente
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Group: Transporte -->
    <div class="mb-5">
      <div class="flex items-center gap-2 mb-2.5">
        <span class="w-1.5 h-1.5 rounded-full" style="background-color: #3b82f6"></span>
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Transporte</h3>
        <span class="text-xs text-gray-500 ml-auto">S/ 350.00</span>
      </div>

      <!-- Item: Gasolina -->
      <div class="bg-primary-800 rounded-xl p-3.5 mb-2 border border-primary-700/30">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                 style="background-color: rgba(59, 130, 246, 0.15)">
              <span class="text-base">⛽</span>
            </div>
            <div>
              <p class="text-sm font-medium text-white">Gasolina</p>
              <p class="text-xs text-gray-500 mt-0.5">15 de marzo, 2026</p>
              <div class="flex items-center gap-1 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="text-[10px] text-indigo-400">Recurrente</span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-white">S/ 200.00</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 mt-1">
              Pagado
            </span>
          </div>
        </div>
      </div>

      <!-- Item: Pasajes -->
      <div class="bg-primary-800 rounded-xl p-3.5 border border-primary-700/30">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                 style="background-color: rgba(59, 130, 246, 0.15)">
              <span class="text-base">🚌</span>
            </div>
            <div>
              <p class="text-sm font-medium text-white">Pasajes y taxi</p>
              <p class="text-xs text-gray-500 mt-0.5">Estimado mensual</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-white">S/ 150.00</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/15 text-orange-400 mt-1">
              Pendiente
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Group: Salud -->
    <div class="mb-5">
      <div class="flex items-center gap-2 mb-2.5">
        <span class="w-1.5 h-1.5 rounded-full" style="background-color: #10b981"></span>
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Salud</h3>
        <span class="text-xs text-gray-500 ml-auto">S/ 150.00</span>
      </div>

      <!-- Item: Seguro -->
      <div class="bg-primary-800 rounded-xl p-3.5 border border-primary-700/30">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                 style="background-color: rgba(16, 185, 129, 0.15)">
              <span class="text-base">🏥</span>
            </div>
            <div>
              <p class="text-sm font-medium text-white">Seguro de salud</p>
              <p class="text-xs text-gray-500 mt-0.5">5 de marzo, 2026</p>
              <div class="flex items-center gap-1 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="text-[10px] text-indigo-400">Recurrente</span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-white">S/ 150.00</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 mt-1">
              Pagado
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Group: Entretenimiento -->
    <div class="mb-5">
      <div class="flex items-center gap-2 mb-2.5">
        <span class="w-1.5 h-1.5 rounded-full" style="background-color: #ec4899"></span>
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Entretenimiento</h3>
        <span class="text-xs text-gray-500 ml-auto">S/ 200.00</span>
      </div>

      <!-- Item: Streaming -->
      <div class="bg-primary-800 rounded-xl p-3.5 mb-2 border border-primary-700/30">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                 style="background-color: rgba(236, 72, 153, 0.15)">
              <span class="text-base">📺</span>
            </div>
            <div>
              <p class="text-sm font-medium text-white">Netflix + Spotify</p>
              <p class="text-xs text-gray-500 mt-0.5">1 de marzo, 2026</p>
              <div class="flex items-center gap-1 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="text-[10px] text-indigo-400">Recurrente</span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-white">S/ 50.00</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 mt-1">
              Pagado
            </span>
          </div>
        </div>
      </div>

      <!-- Item: Salidas -->
      <div class="bg-primary-800 rounded-xl p-3.5 border border-primary-700/30">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                 style="background-color: rgba(236, 72, 153, 0.15)">
              <span class="text-base">🎬</span>
            </div>
            <div>
              <p class="text-sm font-medium text-white">Salidas y ocio</p>
              <p class="text-xs text-gray-500 mt-0.5">Estimado mensual</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-white">S/ 150.00</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/15 text-orange-400 mt-1">
              Pendiente
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Group: Ahorro -->
    <div class="mb-20">
      <div class="flex items-center gap-2 mb-2.5">
        <span class="w-1.5 h-1.5 rounded-full" style="background-color: #22c55e"></span>
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ahorro</h3>
        <span class="text-xs text-gray-500 ml-auto">S/ 150.00</span>
      </div>

      <!-- Item: Fondo de emergencia -->
      <div class="bg-primary-800 rounded-xl p-3.5 border border-primary-700/30">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                 style="background-color: rgba(34, 197, 94, 0.15)">
              <span class="text-base">🐷</span>
            </div>
            <div>
              <p class="text-sm font-medium text-white">Fondo de emergencia</p>
              <p class="text-xs text-gray-500 mt-0.5">30 de marzo, 2026</p>
              <div class="flex items-center gap-1 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="text-[10px] text-indigo-400">Recurrente</span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-white">S/ 150.00</p>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/15 text-orange-400 mt-1">
              Pendiente
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
