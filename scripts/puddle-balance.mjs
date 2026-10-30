// Puddle Patrol's playtest: three bots play every stage over many seeds through
// the real engine (src/games/tower-defense/bots.ts) and print, per stage, the
// pond-clean %, the stars (how many runs earned 1 / 2 / 3) and the minutes a
// stage takes (waves plus thinking time).
//   node --import tsx scripts/puddle-balance.mjs [seeds=40]
// The balance test (src/games/tower-defense/__tests__/balance.test.ts) checks
// the same targets on fewer seeds.
import { PATROL_SETS, patrolSpec, planPatrol } from '../src/lib/puddle/index.ts'
import { playBot } from '../src/games/tower-defense/bots.ts'

const seeds = Number(process.argv[2] ?? 40)
const grades = { k1: [0], g1: [1], g24: [2, 3, 4], g5: [5] }
console.log('stage (grade)       | bot      | clean | ★1/★2/★3 | minutes')
for (const set of PATROL_SETS) {
  for (const grade of grades[patrolSpec(set).band]) {
    for (const kind of ['optimal', 'kid', 'naive']) {
      const n = kind === 'optimal' ? Math.ceil(seeds / 4) : seeds
      let clean = 0
      let secs = 0
      const stars = [0, 0, 0]
      for (let i = 0; i < n; i++) {
        const r = playBot(planPatrol(set, `seed-${i}`, grade), kind, `bot-${i}`)
        clean += r.clean
        secs += r.seconds
        stars[r.stars - 1]++
      }
      const row = [`${set} (${grade})`.padEnd(19), kind.padEnd(8), `${Math.round((100 * clean) / n)}%`.padStart(5), stars.join('/').padEnd(8), (secs / n / 60).toFixed(1)]
      console.log(row.join(' | '))
    }
  }
}
