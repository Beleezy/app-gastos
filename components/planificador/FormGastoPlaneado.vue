<template>
  <!-- Modal Overlay -->
  <div class="fixed inset-0 z-50 flex items-end justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

    <!-- Modal Content -->
    <div class="relative w-full max-w-lg bg-primary-800 rounded-t-3xl border-t border-primary-700/50 max-h-[90vh] overflow-y-auto animate-slide-up">
      <!-- Handle -->
      <div class="flex justify-center pt-3 pb-1">
        <div class="w-10 h-1 rounded-full bg-primary-700"></div>
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between px-5 pb-4">
        <h2 class="text-lg font-semibold text-white">Nuevo gasto planificado</h2>
        <button class="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <div class="px-5 pb-8 space-y-4">
        <!-- Concepto -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Concepto</label>
          <input
            type="text"
            placeholder="Ej: Recibo de luz, Cuota gimnasio..."
            class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <!-- Categoría -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Categoría</label>
          <div class="relative">
            <select class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white text-sm appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors">
              <option value="" disabled selected class="text-gray-600">Seleccionar categoría</option>
              <option value="alimentacion">🍽️ Alimentación</option>
              <option value="transporte">🚗 Transporte</option>
              <option value="vivienda">🏠 Vivienda</option>
              <option value="salud">🏥 Salud</option>
              <option value="educacion">📚 Educación</option>
              <option value="entretenimiento">🎭 Entretenimiento</option>
              <option value="vestimenta">👕 Vestimenta</option>
              <option value="servicios">📡 Servicios</option>
              <option value="ahorro">🐷 Ahorro</option>
              <option value="deudas">💳 Deudas / Préstamos</option>
              <option value="otros">📦 Otros</option>
            </select>
            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Monto y Fecha in row -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Monto -->
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1.5">Monto estimado</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">S/</span>
              <input
                type="number"
                placeholder="0.00"
                class="w-full pl-9 pr-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <!-- Fecha -->
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1.5">Fecha de pago</label>
            <input
              type="date"
              class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>

        <!-- Recurrente toggle -->
        <div class="flex items-center justify-between py-2">
          <div>
            <p class="text-sm font-medium text-white">Gasto recurrente</p>
            <p class="text-xs text-gray-500">Se repetirá cada mes automáticamente</p>
          </div>
          <!-- Toggle visual (static, off state) -->
          <div class="w-11 h-6 rounded-full bg-primary-700 relative cursor-pointer transition-colors">
            <div class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-gray-400 transition-transform"></div>
          </div>
        </div>

        <!-- Notas -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1.5">Notas <span class="text-gray-600">(opcional)</span></label>
          <textarea
            rows="2"
            placeholder="Agregar notas o detalles..."
            class="w-full px-4 py-3 rounded-xl bg-primary-900/80 border border-primary-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
          ></textarea>
        </div>

        <!-- Submit Button -->
        <button class="w-full py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-semibold text-sm transition-colors mt-2">
          Agregar gasto planificado
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
</style>
