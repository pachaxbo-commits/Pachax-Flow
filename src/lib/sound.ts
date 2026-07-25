let alertInterval: number | null = null

export function playLoudOrderAlert() {
  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextCtor) {
    return
  }

  try {
    const context = new AudioContextCtor()

    // Tono fuerte, claro y llamativo tipo Yango / PedidosYa
    // Frecuencias: 587.33Hz (D5) -> 880Hz (A5) -> 1174.66Hz (D6)
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

    setTimeout(() => {
      context.close().catch(() => {})
    }, 1000)
  } catch (e) {
    console.error('Error al reproducir alerta de sonido:', e)
  }
}

export function playKitchenNotification() {
  playLoudOrderAlert()
}

export function startContinuousOrderAlert() {
  if (alertInterval !== null) return
  playLoudOrderAlert()
  alertInterval = window.setInterval(() => {
    playLoudOrderAlert()
  }, 2200)
}

export function stopContinuousOrderAlert() {
  if (alertInterval !== null) {
    clearInterval(alertInterval)
    alertInterval = null
  }
}
