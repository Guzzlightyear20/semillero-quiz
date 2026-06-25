let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3) {
  try {
    const c = getCtx()
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.connect(g)
    g.connect(c.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, c.currentTime)
    g.gain.setValueAtTime(gain, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + duration)
  } catch {}
}

export function soundCorrect() {
  playTone(523, 0.1)
  setTimeout(() => playTone(659, 0.1), 100)
  setTimeout(() => playTone(784, 0.2), 200)
}

export function soundWrong() {
  playTone(300, 0.1, 'sawtooth', 0.2)
  setTimeout(() => playTone(250, 0.15, 'sawtooth', 0.15), 120)
}

export function soundTick() {
  playTone(880, 0.05, 'square', 0.1)
}

export function soundCountdownEnd() {
  playTone(220, 0.3, 'sawtooth', 0.2)
}

export function soundStart() {
  playTone(392, 0.08)
  setTimeout(() => playTone(523, 0.08), 100)
  setTimeout(() => playTone(659, 0.08), 200)
  setTimeout(() => playTone(784, 0.3), 300)
}

export function soundFinish() {
  const notes = [523, 659, 784, 1047]
  notes.forEach((n, i) => setTimeout(() => playTone(n, 0.15), i * 120))
}
