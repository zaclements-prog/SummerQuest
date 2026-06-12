import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'

interface Config {
  maxPlace: 1000 | 10000 | 100000
}

const PLACE_NAMES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands']

export function makePlaceValueIdentifyProvider(cfg: Config): ProblemProvider {
  let serial = 0
  return {
    topic: 'place-value-identify',
    next(): Problem {
      // pick a digit count appropriate to maxPlace (1000 → 4 digits, 100000 → 6 digits)
      const digitCount = Math.log10(cfg.maxPlace)
      const n = randInt(10 ** (digitCount - 1), cfg.maxPlace - 1)
      const placeIndex = randInt(0, digitCount - 1)
      const placeName = PLACE_NAMES[placeIndex]
      const digit = Math.floor(n / 10 ** placeIndex) % 10
      const placeValue = digit * 10 ** placeIndex
      const set = new Set<number>()
      for (const c of [
        digit,
        placeValue + 10 ** placeIndex,
        placeValue * 10,
        Math.max(0, placeValue - 10 ** placeIndex),
      ]) {
        if (c !== placeValue && c >= 0) set.add(c)
        if (set.size >= 3) break
      }
      while (set.size < 3) set.add(placeValue + randInt(1, 9))
      const distractors = Array.from(set)
      return {
        id: `pv-id-${serial++}`,
        prompt: `In ${n.toLocaleString()}, what is the VALUE of the ${placeName} digit?`,
        options: shuffle([placeValue, ...distractors]),
        answer: placeValue,
        topic: 'place-value-identify',
        subtopic: placeName,
        difficulty: placeIndex + 1,
        skill: { id: 'pv-identify', label: 'place value of a digit' },
        hint: `The ${placeName} digit is ${digit}, so its value is ${digit} × ${10 ** placeIndex}.`,
      }
    },
  }
}
