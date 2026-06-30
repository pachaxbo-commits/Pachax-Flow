export function playKitchenNotification() {
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextCtor) {
    return
  }

  const context = new AudioContextCtor()
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(880, context.currentTime)
  gainNode.gain.setValueAtTime(0.0001, context.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.03, context.currentTime + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32)

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.34)
  oscillator.onended = () => {
    void context.close()
  }
}
