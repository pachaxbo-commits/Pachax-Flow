let alertInterval: number | null = null
let audioInstance: HTMLAudioElement | null = null
let activeAudioContext: AudioContext | null = null

export function playLoudOrderAlert() {
  try {
    if (!audioInstance) {
      audioInstance = new Audio('/notificacion.mp3')
    }
    audioInstance.currentTime = 0
    audioInstance.volume = 1.0
    audioInstance.play().catch(() => {
      playWebAudioTone()
    })
  } catch {
    playWebAudioTone()
  }
}

function playWebAudioTone() {
  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextCtor) return

  try {
    if (activeAudioContext) {
      try {
        activeAudioContext.close()
      } catch {}
    }
    activeAudioContext = new AudioContextCtor()
    const context = activeAudioContext

    const playTone = (freq: number, startTime: number, duration: number, volume = 0.45) => {
      const osc = context.createOscillator()
      const gain = context.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, startTime)
      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration - 0.01)

      osc.connect(gain)
      gain.connect(context.destination)
      osc.start(startTime)
      osc.stop(startTime + duration)
    }

    const t = context.currentTime
    playTone(587.33, t, 0.16, 0.45)
    playTone(880, t + 0.12, 0.2, 0.5)
    playTone(1174.66, t + 0.28, 0.32, 0.55)
  } catch {}
}

export function playKitchenNotification() {
  playLoudOrderAlert()
}

export function startContinuousOrderAlert() {
  if (alertInterval !== null) return
  playLoudOrderAlert()
  alertInterval = window.setInterval(() => {
    playLoudOrderAlert()
  }, 2500)
}

export function stopContinuousOrderAlert() {
  if (alertInterval !== null) {
    clearInterval(alertInterval)
    alertInterval = null
  }

  if (audioInstance) {
    try {
      audioInstance.pause()
      audioInstance.currentTime = 0
      audioInstance.volume = 0
    } catch {}
  }

  if (activeAudioContext) {
    try {
      activeAudioContext.close()
    } catch {}
    activeAudioContext = null
  }
}
