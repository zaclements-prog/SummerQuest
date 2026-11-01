import type { Problem, ProblemProvider } from '../problem'
import { seededRng } from '../random'
import { canEat, cloudLadder, gobbleSkill, makeSnack, GOBBLE_TOPIC, type GobbleConfig } from '../gobble'

/**
 * Gobble Garden's snacks as problems: "Can a cloud of 0.7 eat ⅝?". The game
 * (src/games/GobbleGarden.tsx) lays the same snacks out in its park through
 * lib/gobble, reading the band's set and the grade's reach from this
 * provider's `gobble` config (lib/gradeTiers scales `maxPlace` and `maxDen`);
 * the problems serve any quiz shell, and the tests.
 *
 * Seeded: the same `seed` gives the same problems. Each walks the cloud's
 * ladder and ramps the difficulty, half edible and half too big.
 */
export interface GobbleProvider extends ProblemProvider {
  readonly gobble: GobbleConfig
}

export function isGobbleProvider(p: ProblemProvider): p is GobbleProvider {
  return typeof (p as Partial<GobbleProvider>).gobble === 'object'
}

export function makeGobbleProvider(config: GobbleConfig & { seed?: string }): GobbleProvider {
  const { seed, ...gobble } = config
  const ladder = cloudLadder(gobble)
  let rng = seededRng(seed ?? `gobble-${Math.random()}`)
  let serial = 0
  return {
    topic: GOBBLE_TOPIC,
    gobble,
    reset() {
      rng = seededRng(seed ?? `gobble-${Math.random()}`)
      serial = 0
    },
    next(): Problem {
      const i = serial++
      const cloud = ladder[Math.min(ladder.length - 1, Math.floor(i / 2) % ladder.length)]
      const edible = rng() < 0.5
      const snack = makeSnack(gobble, cloud, edible, Math.min(1, i / 12), rng)
      const yes = canEat(snack, cloud)
      return {
        id: `gobble-${i}`,
        prompt: `The cloud is ${cloud.text}. Can it eat ${snack.text}?`,
        options: ['Yes', 'No'],
        answer: yes ? 'Yes' : 'No',
        topic: GOBBLE_TOPIC,
        subtopic: snack.family,
        difficulty: i,
        skill: gobbleSkill(gobble.set, snack),
        hint: 'The cloud eats snacks smaller than its number.',
        explanation: `${snack.text} is ${yes ? 'smaller' : 'bigger'} than ${cloud.text}.`,
      }
    },
  }
}
