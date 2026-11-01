// Puddle Patrol's playtest: bots play every stage over many seeds through
// the real engine (src/games/tower-defense/bots.ts) and print, per stage, the
// pond-clean %, the stars (how many runs earned 1 / 2 / 3), the minutes a
// stage takes (waves plus thinking time), the average and longest wave (the
// watching between decisions), Super Soaks bought and drops left unspent.
//   node --import tsx scripts/puddle-balance.mjs [seeds=40]
//   BOTS=k,g1,g3strong,g3weak,g5 node --import tsx scripts/puddle-balance.mjs   (the playtest personas)
//   SETS=k-count,g24-skip …                                                      (some stages only)
// The balance test (src/games/tower-defense/__tests__/balance.test.ts) checks
// the same targets on fewer seeds.
import { PATROL_SETS, patrolSpec, planPatrol } from '../src/lib/puddle/index.ts'
import { playBot } from '../src/games/tower-defense/bots.ts'

const seeds = Number(process.argv[2] ?? 40)
const grades = { k1: [0], g1: [1], g24: [2, 3, 4], g5: [5] }
const bots = (process.env.BOTS ?? 'optimal,kid,naive,spread,spam').split(',')
const sets = process.env.SETS ? process.env.SETS.split(',') : PATROL_SETS
// the personas play their own band only (a kindergartner plays K's stages)
const personaBand = { k: 'k1', g1: 'g1', g3strong: 'g24', g3weak: 'g24', g5: 'g5' }
const personaGrade = { g3strong: 3, g3weak: 3 }
console.log('stage (grade)       | bot      | clean | ★1/★2/★3 | min | wave s (max) | supers | drops left')
for (const set of sets) {
  const band = patrolSpec(set).band
  for (const grade of grades[band]) {
    for (const kind of bots) {
      if (personaBand[kind] && (personaBand[kind] !== band || (personaGrade[kind] && personaGrade[kind] !== grade))) continue
      const n = kind === 'optimal' ? Math.ceil(seeds / 4) : seeds
      let clean = 0
      let secs = 0
      let waveS = 0
      let longest = 0
      let supers = 0
      let left = 0
      let waves = 0
      const stars = [0, 0, 0]
      for (let i = 0; i < n; i++) {
        const plan = planPatrol(set, `seed-${i}`, grade)
        const r = playBot(plan, kind, `bot-${i}`)
        clean += r.clean
        secs += r.seconds
        waveS += r.waveSeconds
        waves += plan.waves.length
        longest = Math.max(longest, r.longestWave)
        supers += r.supers
        left += r.dropsLeft
        stars[r.stars - 1]++
      }
      const row = [
        `${set} (${grade})`.padEnd(19),
        kind.padEnd(8),
        `${Math.round((100 * clean) / n)}%`.padStart(5),
        stars.join('/').padEnd(8),
        (secs / n / 60).toFixed(1),
        `${(waveS / waves).toFixed(0)} (${longest.toFixed(0)})`.padEnd(12),
        (supers / n).toFixed(1).padStart(6),
        (left / n).toFixed(0).padStart(4),
      ]
      console.log(row.join(' | '))
    }
  }
}
