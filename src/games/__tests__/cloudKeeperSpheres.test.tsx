// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
// the 2–4 water cycle's sources, as text (Vite's ?raw)
import cloudKeeperSrc from '../CloudKeeper.tsx?raw'
import cloudKeeperPartsSrc from '../CloudKeeper.parts.tsx?raw'
import cycleCoreSrc from '../../lib/cycle/cycleCore.ts?raw'
import scienceCycleSrc from '../../lib/providers/scienceCycle.ts?raw'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { curriculum, getZone, zoneStages } from '../../curriculum'
import { GRADE_LEVELS } from '../../lib/gradeTiers'
import { seededRng } from '../../lib/random'
import { PROCESSES, cycleRunPlan, legScore, routeStep, DROP_FORMS } from '../../lib/cycle/cycleCore'
import { makeScienceCycleProvider } from '../../lib/providers/scienceCycle'
import { cloudKeeperMode, spheresLegCount, spheresRunPlan } from '../../lib/cycle/spheresCore'
import type { GameProps } from '../../screens/GameRunner'
import type { Problem } from '../../lib/problem'

/**
 * Cloud Keeper's grade-5 tier (Earth's spheres) is isolated from the 2–4 water
 * cycle, which must stay byte-for-byte the same:
 *  - the water-cycle modules are the very files of 09471c6 (content hashes);
 *  - the run picker sends every stage but the grade-5 one to the water cycle;
 *  - the water cycle's facts and plans come out exactly as before (fingerprints
 *    recorded before the spheres tier was added).
 */

vi.mock('../CloudKeeper', () => ({ default: () => <div>water-cycle</div> }))
vi.mock('../CloudKeeperSpheres', () => ({ default: () => <div>spheres</div> }))

/** cyrb53: a 53-bit string hash (pure JS, the same everywhere). */
function hash(str: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}
const fp = (x: unknown) => hash(JSON.stringify(x))

afterEach(() => vi.restoreAllMocks())

describe('Cloud Keeper: the 2–4 water cycle is untouched', () => {
  it('its modules are byte-for-byte the files before the grade-5 tier', () => {
    // (recorded from commit 09471c6, before the grade-5 tier)
    expect([cloudKeeperSrc, cloudKeeperPartsSrc, cycleCoreSrc, scienceCycleSrc].map(hash)).toEqual(SOURCE_HASHES)
  })

  it('the 2–4 stage is configured as before and plays the water cycle at grades 2–4', () => {
    const zone = getZone('science-summit')!
    const st = zone.stages.find((s) => s.id === 'science-cycle')!
    expect(st).toMatchObject({ gameId: 'cloudKeeper', providerConfig: { kind: 'scienceCycle' }, params: { rounds: 5 } })
    for (const g of [2, 3, 4] as const) expect(zoneStages(zone, g)).toContain(st)
    expect(cloudKeeperMode(st.params)).toBe('cycle')
    expect(cloudKeeperMode(undefined)).toBe('cycle')
  })

  it('only the grade-5 stage picks the spheres run', () => {
    const keepers = curriculum.zones.flatMap((z) => [...new Set(GRADE_LEVELS.flatMap((g) => zoneStages(z, g)))]).filter((s) => s.gameId === 'cloudKeeper')
    for (const s of keepers) expect(cloudKeeperMode(s.params), s.id).toBe(s.id === 'g5-sci-cycle' ? 'spheres' : 'cycle')
    expect(keepers.map((s) => s.id).sort()).toEqual(['g5-sci-cycle', 'science-cycle'])
  })

  it('the water cycle’s facts, plan and scoring are the same as before (recorded fingerprints)', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('cloud-keeper-isolation'))
    const p = makeScienceCycleProvider()
    const facts = [
      ...Array.from({ length: 30 }, () => p.next() as Problem),
      ...Array.from({ length: 30 }, (_, i) => p.nextFor(PROCESSES[i % 3])),
    ].map((x) => [x.prompt, x.options, x.answer, x.hint, x.skill])
    expect(fp(facts)).toBe(WATER_FACTS_FP)
    const plans = [3, 5, 7, 9].map((r) => cycleRunPlan(r, seededRng(`plan-${r}`)))
    const routes = DROP_FORMS.flatMap((f) => PROCESSES.map((s) => routeStep(f, s)))
    const scores = [true, false].flatMap((firstTry) => [1, 3, 6].flatMap((streak) => [2, 8, 20].map((seconds) => legScore({ firstTry, streak, seconds }))))
    expect(fp([plans, routes, scores])).toBe(WATER_CORE_FP)
  })
})

describe('Cloud Keeper: the stage’s params pick the run', () => {
  it('renders the water cycle for 2–4 params and the spheres run for the grade-5 stage', async () => {
    const { CloudKeeper } = await import('../lazyGames')
    const el = document.createElement('div')
    document.body.appendChild(el)
    const root = createRoot(el)
    const props = (params: Record<string, unknown>): GameProps => ({ provider: { topic: 't', next: () => ({ id: '', prompt: '', options: [], answer: 0, topic: '' }) }, params, onComplete: () => {}, onExit: () => {} })
    const g5 = zoneStages(getZone('science-summit')!, 5).find((s) => s.id === 'g5-sci-cycle')!
    for (const [params, want] of [[{ rounds: 5 }, 'water-cycle'], [g5.params!, 'spheres']] as const) {
      await act(async () => root.render(<CloudKeeper {...props(params)} />))
      for (let i = 0; i < 50 && !el.textContent; i++) await act(async () => new Promise((r) => setTimeout(r, 20)))
      expect(el.textContent).toBe(want)
    }
    act(() => root.unmount())
  })

  it('the spheres run: three journeys (water guided first), 10 legs at 5 rounds', () => {
    const plan = spheresRunPlan(5)
    expect(plan.map((s) => s.traveler)).toEqual(['water', 'carbon', 'mineral'])
    expect(plan.map((s) => s.guide)).toEqual([true, false, false])
    expect(spheresLegCount(plan)).toBe(10)
    expect(spheresLegCount(spheresRunPlan(9))).toBeGreaterThan(10)
  })
})

const WATER_FACTS_FP = 'ab4139d790f4f'
const WATER_CORE_FP = '1a573c5c0fd5d2'
const SOURCE_HASHES = ['216e7986c17b0', 'b42aaed0758eb', '1d8c585273eaac', '961e29e29c1c7']
