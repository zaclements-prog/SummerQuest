import { useProgress } from '../store/progress'

const DAY = 86_400_000

/** Dev-only: fabricate a believable week so the Focus loop is visible without real play. */
export function seedSampleWeek() {
  const rec = useProgress.getState().recordAttempt
  const now = Date.now()
  const plan: Array<[string, string, string, string, number, number]> = [
    // zoneId, topic, skillId, skillLabel, attempts, correctRate%
    ['multiplication-mesa', 'multiplication', 'mult-f6_9', '6–9× facts', 10, 30],
    ['division-dunes', 'division', 'div-basic', 'basic division facts', 8, 45],
    ['fraction-falls', 'fractionCompare', 'frac-cmp-unlikeden', 'comparing (different bottoms)', 8, 40],
    ['multiplication-mesa', 'multiplication', 'mult-f2_5', '2–5× facts', 10, 90],
    ['place-value-plateau', 'placeValueRounding', 'pv-round', 'rounding numbers', 6, 60],
  ]
  for (const [zoneId, topic, skillId, skillLabel, n, rate] of plan) {
    for (let i = 0; i < n; i++) {
      rec({ zoneId, topic, skillId, skillLabel, correct: Math.random() * 100 < rate, at: now - (i % 6) * DAY })
    }
  }
}
