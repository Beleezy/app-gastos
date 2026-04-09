<template>
  <div class="flex flex-col items-center gap-3">
    <!-- Camera button -->
    <button
      class="relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 bg-gradient-to-br from-amber-500/50 to-orange-600/50 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 backdrop-blur-md"
      @click="openCamera"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    </button>
    <span class="text-[10px] text-gray-500 font-medium">Voucher</span>

    <!-- Hidden file input for camera -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="onFileSelected"
    />

    <!-- Photo preview modal -->
    <Teleport to="body">
      <div v-if="showPreview" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="$emit('cancel')"></div>

        <div class="relative w-full max-w-lg mx-4 animate-scale-in">
          <!-- Preview image -->
          <div class="bg-primary-900 rounded-2xl overflow-hidden border border-primary-700/40 shadow-2xl">
            <div class="relative">
              <img
                :src="photoPreview"
                alt="Vista previa del voucher"
                class="w-full max-h-[60vh] object-contain bg-black"
              />
              <!-- Overlay badge -->
              <div class="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
                <div class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                <span class="text-xs text-white font-medium">Vista previa</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="grid grid-cols-3 gap-3 p-4">
              <!-- Cancel -->
              <button
                class="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 active:scale-95 transition-all"
                @click="$emit('cancel')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
              <!-- Retake -->
              <button
                class="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 active:scale-95 transition-all"
                @click="retake"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Tomar otra
              </button>
              <!-- Send -->
              <button
                class="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 active:scale-95 transition-all"
                @click="$emit('send')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Escanear
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const props = defineProps({
  showPreview: { type: Boolean, default: false },
  photoPreview: { type: String, default: null },
})

const emit = defineEmits(['capture', 'send', 'cancel', 'retake'])

const fileInput = ref(null)

function openCamera() {
  fileInput.value?.click()
}

function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return

  // Resize image to reduce payload size for the API
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX_SIZE = 1024
      let { width, height } = img

      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width)
          width = MAX_SIZE
        } else {
          width = Math.round((width * MAX_SIZE) / height)
          height = MAX_SIZE
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      emit('capture', dataUrl)
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)

  // Reset input so the same file can be selected again
  event.target.value = ''
}

function retake() {
  emit('retake')
  nextTick(() => {
    fileInput.value?.click()
  })
}
</script>

<style scoped>
.animate-scale-in {
  animation: scaleIn 0.25s ease-out;
}
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
