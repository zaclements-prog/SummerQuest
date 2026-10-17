import { useProgress } from '../store/progress'

let ctx: AudioContext | null = null
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  return ctx
}

function enabled(): boolean {
  return useProgress.getState().soundEnabled
}

function tone(
  freq: number,
  durationMs: number,
  type: OscillatorType = 'sine',
  gain = 0.15,
  delayMs = 0,
) {
  if (!enabled()) return
  const c = getCtx()
  if (!c) return
  const start = c.currentTime + delayMs / 1000
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(gain, start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000)
  osc.connect(g).connect(c.destination)
  osc.start(start)
  osc.stop(start + durationMs / 1000 + 0.02)
}

/** A short filtered-noise swoosh (throws, whooshes, pours). */
function noise(durationMs: number, from: number, to: number, gain = 0.12, delayMs = 0) {
  if (!enabled()) return
  const c = getCtx()
  if (!c) return
  const start = c.currentTime + delayMs / 1000
  const len = Math.max(1, Math.floor((c.sampleRate * durationMs) / 1000))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.2
  bp.frequency.setValueAtTime(from, start)
  bp.frequency.exponentialRampToValueAtTime(to, start + durationMs / 1000)
  const g = c.createGain()
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(gain, start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000)
  src.connect(bp).connect(g).connect(c.destination)
  src.start(start)
  src.stop(start + durationMs / 1000 + 0.02)
}

/** A quick pitch sweep (boings, pops, rising chimes). */
function sweep(from: number, to: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.12, delayMs = 0) {
  if (!enabled()) return
  const c = getCtx()
  if (!c) return
  const start = c.currentTime + delayMs / 1000
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  osc.frequency.exponentialRampToValueAtTime(to, start + durationMs / 1000)
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(gain, start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000)
  osc.connect(g).connect(c.destination)
  osc.start(start)
  osc.stop(start + durationMs / 1000 + 0.02)
}

function chord(freqs: number[], durationMs: number, type: OscillatorType = 'sine') {
  freqs.forEach((f) => tone(f, durationMs, type, 0.08))
}

export const sfx = {
  click: () => tone(440, 60, 'square', 0.05),
  correct: () => {
    tone(523.25, 80, 'sine', 0.15, 0) // C5
    tone(659.25, 80, 'sine', 0.15, 70) // E5
    tone(783.99, 140, 'sine', 0.15, 140) // G5
  },
  wrong: () => {
    tone(200, 180, 'triangle', 0.1)
  },
  coin: () => {
    tone(987.77, 50, 'sine', 0.1, 0)
    tone(1318.51, 100, 'sine', 0.1, 50)
  },
  victory: () => {
    tone(523.25, 120, 'triangle', 0.12, 0) // C
    tone(659.25, 120, 'triangle', 0.12, 110) // E
    tone(783.99, 120, 'triangle', 0.12, 220) // G
    tone(1046.5, 280, 'triangle', 0.15, 330) // C up
    chord([523.25, 659.25, 783.99, 1046.5], 400, 'sine')
  },
  defeat: () => {
    tone(330, 200, 'sawtooth', 0.08, 0)
    tone(220, 280, 'sawtooth', 0.08, 180)
  },
  enter: () => {
    tone(392, 80, 'triangle', 0.1, 0)
    tone(523, 120, 'triangle', 0.1, 80)
  },
  tick: () => tone(880, 30, 'square', 0.04),
  /** Bubble pop — picking things up, small hits. */
  pop: () => sweep(520, 1100, 90, 'sine', 0.14),
  /** Air swoosh — throws, launches, pours. */
  whoosh: () => noise(260, 600, 2400, 0.1),
  /** Soft heavy landing / bump (a wrong answer that bounces off). */
  thud: () => {
    sweep(180, 70, 160, 'sine', 0.2)
    noise(90, 300, 120, 0.06)
  },
  /** Bright twinkle — collectibles, sparkles. */
  sparkle: () => {
    tone(1568, 60, 'sine', 0.07, 0)
    tone(2093, 60, 'sine', 0.06, 50)
    tone(2637, 90, 'sine', 0.05, 100)
  },
  /** Rising chime for a streak; `n` (1, 2, 3…) climbs the scale. */
  combo: (n: number) => {
    const base = 523.25 * Math.pow(2, Math.min(n - 1, 8) / 12 * 2)
    tone(base, 70, 'triangle', 0.12, 0)
    tone(base * 1.5, 110, 'triangle', 0.1, 60)
  },
  /** Big finish — a short fanfare for a perfect run or a boss beaten. */
  fanfare: () => {
    tone(523.25, 110, 'triangle', 0.12, 0)
    tone(523.25, 110, 'triangle', 0.12, 120)
    tone(659.25, 110, 'triangle', 0.12, 240)
    tone(783.99, 360, 'triangle', 0.14, 360)
    chord([523.25, 659.25, 783.99, 1046.5], 600, 'sine')
  },
}

export function unlockAudio() {
  const c = getCtx()
  if (c && c.state === 'suspended') {
    void c.resume()
  }
}
