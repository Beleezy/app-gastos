<template>
  <div class="px-4 py-3">
    <div class="bg-primary-800 rounded-2xl p-4">
      <h3 class="text-sm font-semibold text-white mb-4">Distribución por categoría</h3>

      <!-- Donut Chart (CSS only) -->
      <div class="flex items-center gap-6">
        <div class="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
            <!-- Vivienda - 42.1% (0 to 42.1) -->
            <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" stroke-width="4"
                    stroke-dasharray="42.1 57.9" stroke-dashoffset="0" class="transition-all duration-700" />
            <!-- Alimentación - 28.1% (42.1 to 70.2) -->
            <circle cx="18" cy="18" r="14" fill="none" stroke="#ef4444" stroke-width="4"
                    stroke-dasharray="28.1 71.9" stroke-dashoffset="-42.1" class="transition-all duration-700" />
            <!-- Transporte - 12.3% (70.2 to 82.5) -->
            <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" stroke-width="4"
                    stroke-dasharray="12.3 87.7" stroke-dashoffset="-70.2" class="transition-all duration-700" />
            <!-- Entretenimiento - 7% (82.5 to 89.5) -->
            <circle cx="18" cy="18" r="14" fill="none" stroke="#ec4899" stroke-width="4"
                    stroke-dasharray="7 93" stroke-dashoffset="-82.5" class="transition-all duration-700" />
            <!-- Salud - 5.3% (89.5 to 94.8) -->
            <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" stroke-width="4"
                    stroke-dasharray="5.3 94.7" stroke-dashoffset="-89.5" class="transition-all duration-700" />
            <!-- Ahorro - 5.2% (94.8 to 100) -->
            <circle cx="18" cy="18" r="14" fill="none" stroke="#22c55e" stroke-width="4"
                    stroke-dasharray="5.2 94.8" stroke-dashoffset="-94.8" class="transition-all duration-700" />
          </svg>
          <!-- Center text -->
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-xs text-gray-500">Total</span>
            <span class="text-sm font-bold text-white">S/ 2,850</span>
          </div>
        </div>

        <!-- Legend -->
        <div class="space-y-2 flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background-color: #f59e0b"></span>
              <span class="text-xs text-gray-400 truncate">Vivienda</span>
            </div>
            <span class="text-xs font-medium text-gray-300 shrink-0">42.1%</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background-color: #ef4444"></span>
              <span class="text-xs text-gray-400 truncate">Alimentación</span>
            </div>
            <span class="text-xs font-medium text-gray-300 shrink-0">28.1%</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background-color: #3b82f6"></span>
              <span class="text-xs text-gray-400 truncate">Transporte</span>
            </div>
            <span class="text-xs font-medium text-gray-300 shrink-0">12.3%</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background-color: #ec4899"></span>
              <span class="text-xs text-gray-400 truncate">Entretenimiento</span>
            </div>
            <span class="text-xs font-medium text-gray-300 shrink-0">7.0%</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background-color: #10b981"></span>
              <span class="text-xs text-gray-400 truncate">Salud</span>
            </div>
            <span class="text-xs font-medium text-gray-300 shrink-0">5.3%</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background-color: #22c55e"></span>
              <span class="text-xs text-gray-400 truncate">Ahorro</span>
            </div>
            <span class="text-xs font-medium text-gray-300 shrink-0">5.2%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
