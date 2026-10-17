/**
 * Game-feel ("juice") API shared by the 3D mini-games. Fire-and-forget calls
 * from game logic; `<JuiceLayer/>` (mounted once inside the Canvas) renders them.
 *
 *   juice.burst({ pos: [x, 1, z], color: TOON.gold })   // particle pop
 *   juice.confetti([x, 1, z])                          // big celebration
 *   juice.text({ pos: [x, 2, z], text: '+3!' })         // floating label
 *   juice.shake(0.6)                                   // camera trauma (0–1)
 *
 * Pair with `sfx.pop / whoosh / thud / sparkle / combo(n) / fanfare` from
 * src/lib/sound.ts and the DOM pieces in JuiceHud.tsx (streak meter, banner,
 * confetti overlay). See docs/superpowers/specs/2026-10-17-mini-games-fun-pass.md.
 */

export type Vec3 = [number, number, number]

type Listener<T> = (e: T) => void
function bus<T>() {
  const ls = new Set<Listener<T>>()
  return {
    emit(e: T) {
      ls.forEach((l) => l(e))
    },
    on(l: Listener<T>) {
      ls.add(l)
      return () => {
        ls.delete(l)
      }
    },
  }
}

export interface BurstEvent {
  pos: Vec3
  /** One color or a palette to pick from per particle. */
  color?: string | string[]
  count?: number
  /** Outward speed (units/s). */
  speed?: number
  /** Particle radius. */
  size?: number
  /** Extra upward kick (units/s). */
  up?: number
  gravity?: number
  /** Seconds each particle lives. */
  life?: number
}
export interface FloatTextEvent {
  pos: Vec3
  text: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
}

export const burstBus = bus<BurstEvent>()
export const textBus = bus<FloatTextEvent>()
export const shakeBus = bus<number>()

const CONFETTI = ['#ffcf4d', '#f2766b', '#8ab8ff', '#9fe6c8', '#f7a1c4', '#b79af0', '#ffffff']

export const juice = {
  burst: (e: BurstEvent) => burstBus.emit(e),
  /** A big, colorful upward celebration burst. */
  confetti: (pos: Vec3, count = 70) =>
    burstBus.emit({ pos, color: CONFETTI, count, speed: 4.2, up: 6, size: 0.09, gravity: 9, life: 1.6 }),
  /** Small puff of dust (landings, wrong bounces). */
  dust: (pos: Vec3) =>
    burstBus.emit({ pos, color: ['#e9cf98', '#f6e3b4', '#ffffff'], count: 14, speed: 1.8, up: 1.2, size: 0.12, gravity: 3, life: 0.7 }),
  text: (e: FloatTextEvent) => textBus.emit(e),
  /** Add camera trauma (0–1); it decays on its own. */
  shake: (amount = 0.5) => shakeBus.emit(amount),
}
