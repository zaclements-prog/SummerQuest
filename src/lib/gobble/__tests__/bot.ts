import { seededRng } from '../../random'
import { PARK, canEat, makePark, nextRound, stepPark, type GobbleConfig, type ParkEvent, type ParkRun } from '..'

/**
 * A headless player for the tests: it steers the cloud (through the same
 * `input.target` a finger sets) at the nearest edible snack, and with chance
 * `miss` at the nearest too-big one instead. Plays a whole session at 30 fps.
 */
export interface BotReport {
  run: ParkRun
  events: ParkEvent[]
  roundSeconds: number[]
  /** At every fairness check: edible and too-big snacks near the cloud. */
  nearCounts: { e: number; b: number }[]
  shares: number[]
}

export function playBot(cfg: GobbleConfig, opts: { seed: string; listen: boolean; miss: number; maxSeconds?: number; think?: number }): BotReport {
  const run = makePark(cfg, { seed: opts.seed, listen: opts.listen })
  const r = seededRng(`${opts.seed}|bot`)
  const events: ParkEvent[] = []
  const roundSeconds: number[] = []
  const nearCounts: { e: number; b: number }[] = []
  const shares: number[] = []
  let aim: number | null = null
  let rethink = 0
  let thinkUntil = 0
  const dt = 1 / 30
  const cap = opts.maxSeconds ?? 900
  for (let t = 0; t < cap; t += dt) {
    const { cloud } = run
    const cur = aim === null ? null : run.snacks[aim]
    if (t < thinkUntil) aim = null
    else if (!cur || !cur.alive || t >= rethink) {
      const wrong = r() < opts.miss
      let best: number | null = null
      let bd = Infinity
      for (const s of run.snacks) {
        if (!s.alive || canEat(s.snack, cloud.value) === wrong) continue
        const d = Math.hypot(s.x - cloud.x, s.z - cloud.z)
        if (d < bd) {
          bd = d
          best = s.slot
        }
      }
      aim = best
      rethink = t + 1.6
    }
    run.input.target = aim === null ? null : { x: run.snacks[aim].x, z: run.snacks[aim].z }
    const checkAt = run.nextCheck
    const evs = stepPark(run, dt)
    events.push(...evs)
    // (a reading or a pause to compare, after each bite or bump)
    if (opts.think && evs.some((e) => e.kind === 'eat' || e.kind === 'burp')) thinkUntil = t + opts.think * (0.6 + 0.8 * r())
    if (run.nextCheck !== checkAt && !run.over) {
      let e = 0
      let b = 0
      let all = 0
      let alle = 0
      for (const s of run.snacks) {
        if (!s.alive) continue
        all++
        if (canEat(s.snack, cloud.value)) alle++
        if (Math.hypot(s.x - cloud.x, s.z - cloud.z) > PARK.near) continue
        if (canEat(s.snack, cloud.value)) e++
        else b++
      }
      nearCounts.push({ e, b })
      shares.push(all ? alle / all : 0)
    }
    if (evs.some((e) => e.kind === 'burp')) aim = null
    if (run.over) {
      roundSeconds.push(run.roundT)
      if (run.round >= run.plans.length - 1) break
      nextRound(run)
      aim = null
    }
  }
  return { run, events, roundSeconds, nearCounts, shares }
}

/**
 * A child who doesn't read the numbers at all: the cloud sweeps the park
 * back and forth in rows (a lawnmower), into whatever is in the way. The
 * playtests' "can you win by steering into everything?" player.
 */
export function playSweeper(cfg: GobbleConfig, opts: { seed: string; listen: boolean }): ParkRun {
  const run = makePark(cfg, { seed: opts.seed, listen: opts.listen })
  const edge = PARK.half - 1
  let dir = 1
  let row = -PARK.half + 2
  const dt = 1 / 30
  for (let t = 0; t < 900; t += dt) {
    if (Math.abs(run.cloud.x - dir * edge) < 0.6) {
      dir = -dir
      row = row + 3 > edge ? -PARK.half + 2 : row + 3
    }
    run.input.target = { x: dir * edge, z: row }
    stepPark(run, dt)
    if (run.over) {
      if (run.round >= run.plans.length - 1) break
      nextRound(run)
    }
  }
  return run
}
