<template>
  <div class="flex flex-col items-center gap-3">
    <!-- Camera button (hidden when headless: trigger is external via ref) -->
    <button
      v-if="!headless"
      class="relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 bg-gradient-to-br from-amber-500/50 to-orange-600/50 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 backdrop-blur-md"
      @click="openCamera"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    </button>
    <span v-if="!headless" class="text-xs text-theme-text-sec font-medium">Voucher</span>

    <!-- Hidden file input (fallback for desktop) -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onFileSelected"
    />

    <!-- Inline camera view (mobile) -->
    <ClientOnly>
      <Teleport to="body">
        <div v-if="showCamera" class="fixed inset-0 z-[60] bg-black flex flex-col">
          <video
            ref="videoEl"
            autoplay
            playsinline
            muted
            class="flex-1 w-full object-cover"
          />

          <!-- Top bar -->
          <div class="absolute top-0 inset-x-0 pt-12 pb-4 px-5 bg-gradient-to-b from-black/70 to-transparent">
            <div class="flex items-center justify-between">
              <button
                class="w-10 h-10 rounded-full bg-theme-card/15 backdrop-blur-sm flex items-center justify-center text-theme-text active:scale-90 transition-transform"
                @click="closeCamera"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span class="text-theme-text/80 text-sm font-medium">Escanear voucher</span>
              <div class="w-10"></div>
            </div>
          </div>

          <!-- Bottom controls -->
          <div class="absolute bottom-0 inset-x-0 pb-10 pt-8 bg-gradient-to-t from-black/80 to-transparent">
            <div class="flex items-center justify-center">
              <!-- Shutter button -->
              <button
                class="w-[72px] h-[72px] rounded-full border-[4px] border-white p-[3px] active:scale-90 transition-transform"
                @click="captureFrame"
              >
                <div class="w-full h-full rounded-full bg-theme-card"></div>
              </button>
            </div>
            <p class="text-center text-theme-text/50 text-xs mt-3">Apunta al voucher o recibo</p>
          </div>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- Photo preview modal -->
    <ClientOnly>
      <Teleport to="body">
        <div v-if="showPreview" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" @click="$emit('cancel')"></div>

          <div class="relative w-full max-w-lg mx-4 animate-scale-in">
            <!-- Preview image -->
            <div class="bg-theme-input rounded-2xl overflow-hidden border border-theme-border shadow-2xl">
              <div class="relative">
                <img
                  :src="photoPreview"
                  alt="Vista previa del voucher"
                  class="w-full max-h-[60vh] object-contain bg-black"
                />
                <!-- Overlay badge -->
                <div class="absolute top-3 left-3 flex items-center gap-1.5 bg-theme-bg/80 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <div class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                  <span class="text-xs text-theme-text font-medium">Vista previa</span>
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
                  class="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-theme-accent-bg text-theme-accent text-xs font-medium hover:bg-theme-accent-bg active:scale-95 transition-all"
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
    </ClientOnly>
  </div>
</template>

<script setup>
const props = defineProps({
  showPreview: { type: Boolean, default: false },
  photoPreview: { type: String, default: null },
  headless: { type: Boolean, default: false },
})

const emit = defineEmits(['capture', 'send', 'cancel', 'retake'])

const fileInput = ref(null)
const videoEl = ref(null)
const showCamera = ref(false)
let stream = null

// useOverlayBack handles the preview overlay (prop-based)
const showPreviewRef = computed(() => props.showPreview)
useOverlayBack(showPreviewRef, () => emit('cancel'))

// Camera overlay uses manual history management because closing also stops the media stream
const cameraHistoryId = ref(null)

function onCameraPopState(event) {
  if (showCamera.value && event.state?.__overlayId !== cameraHistoryId.value) {
    cameraHistoryId.value = null
    stopStream()
    showCamera.value = false
  }
}

onMounted(() => {
  if (process.client) window.addEventListener('popstate', onCameraPopState)
})

onUnmounted(() => {
  if (process.client) window.removeEventListener('popstate', onCameraPopState)
  stopStream()
})

function stopStream() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
}

function openCamera() {
  // On mobile (touch devices), use inline camera to avoid the OS killing the PWA
  const isMobile = navigator.maxTouchPoints > 0
  if (isMobile && navigator.mediaDevices?.getUserMedia) {
    startInlineCamera()
  } else {
    fileInput.value?.click()
  }
}

async function startInlineCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    })
    showCamera.value = true
    const id = `camera-${Math.random().toString(36).slice(2, 9)}`
    const current = window.history.state && typeof window.history.state === 'object' ? window.history.state : {}
    window.history.pushState({ ...current, __overlayId: id }, '', window.location.href)
    cameraHistoryId.value = id
    await nextTick()
    if (videoEl.value) {
      videoEl.value.srcObject = stream
    }
  } catch (e) {
    console.warn('getUserMedia failed, falling back to file input:', e)
    fileInput.value?.click()
  }
}

function captureFrame() {
  const video = videoEl.value
  if (!video || !video.videoWidth) return

  try {
    const canvas = document.createElement('canvas')
    const MAX_SIZE = 1024
    let width = video.videoWidth
    let height = video.videoHeight

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
    ctx.drawImage(video, 0, 0, width, height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    canvas.width = 0
    canvas.height = 0

    closeCameraForCapture()
    emit('capture', dataUrl)
  } catch (e) {
    console.error('Error capturing frame:', e)
    closeCamera()
  }
}

function closeCamera() {
  if (showCamera.value) {
    showCamera.value = false
    if (cameraHistoryId.value) {
      if (window.history.state?.__overlayId === cameraHistoryId.value) {
        window.history.back()
      }
      cameraHistoryId.value = null
    }
  }
  stopStream()
}

// Cierra la cámara sin disparar history.back(): el preview que se abre a
// continuación gestiona su propio estado de historial. Si llamáramos a
// history.back() aquí, el popstate diferido se solaparía con el pushState
// del preview y lo cerraría inmediatamente.
function closeCameraForCapture() {
  if (showCamera.value) {
    showCamera.value = false
    if (cameraHistoryId.value) {
      if (window.history.state?.__overlayId === cameraHistoryId.value) {
        const current = { ...window.history.state }
        delete current.__overlayId
        window.history.replaceState(current, '', window.location.href)
      }
      cameraHistoryId.value = null
    }
  }
  stopStream()
}

function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const objectUrl = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    try {
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

      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      URL.revokeObjectURL(objectUrl)
      canvas.width = 0
      canvas.height = 0

      emit('capture', dataUrl)
    } catch (e) {
      URL.revokeObjectURL(objectUrl)
      console.error('Error processing image:', e)
    }
  }
  img.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    console.error('Error loading image')
  }
  img.src = objectUrl
  event.target.value = ''
}

function retake() {
  emit('retake')
  nextTick(() => {
    openCamera()
  })
}

defineExpose({ openCamera })
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
