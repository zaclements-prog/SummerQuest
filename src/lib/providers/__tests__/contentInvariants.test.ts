import { describe, it, expect } from 'vitest'
import { curriculum } from '../../../curriculum'
import { createProvider } from '..'
import { SKILLS, skillOf } from '../../../tutoring/skills'
import type { Problem } from '../../problem'

/**
 * Fuzzes every multiple-choice stage in the curriculum and checks the problems a
 * child would actually see: the right answer is exactly one of the buttons, no
 * button is duplicated, nothing renders as NaN/undefined, and every problem
 * routes to a real coach skill.
 */
const SAMPLES = 300
const BAD_TEXT = /NaN|undefined|\[object Object\]|Infinity/

const stages = curriculum.zones.flatMap((zone) =>
  zone.stages
    .filter((s) => s.providerConfig.kind !== 'writingPrompt')
    .map((stage) => ({ zone, stage })),
)

async function sample(config: Parameters<typeof createProvider>[0], n = SAMPLES): Promise<Problem[]> {
  const provider = createProvider(config)
  const out: Problem[] = []
  for (let i = 0; i < n; i++) out.push(await provider.next())
  return out
}

describe.each(stages)('$zone.id / $stage.id', ({ stage }) => {
  it('produces well-formed multiple-choice problems', async () => {
    for (const p of await sample(stage.providerConfig)) {
      const where = `${p.prompt} | options ${JSON.stringify(p.options)} | answer ${JSON.stringify(p.answer)}`
      expect(p.options.length, where).toBeGreaterThanOrEqual(2)
      expect(p.options.filter((o) => o === p.answer).length, where).toBe(1)
      expect(new Set(p.options.map(String)).size, where).toBe(p.options.length)
      expect(BAD_TEXT.test(`${p.prompt} ${p.options.join(' ')} ${p.answer}`), where).toBe(false)
      expect(p.prompt.includes('\n'), where).toBe(false)
      expect(SKILLS[skillOf(p).id], `unregistered skill for ${where}`).toBeDefined()
    }
  })
})

describe('specific generators', () => {
  it('multiplication and division answers are arithmetically correct', async () => {
    const mult = curriculum.zones.find((z) => z.id === 'multiplication-mesa')!.stages[1]
    for (const p of await sample(mult.providerConfig)) {
      const m = p.prompt.match(/(\d+)\s*×\s*(\d+)/)
      if (m) expect(p.answer).toBe(Number(m[1]) * Number(m[2]))
    }
    const div = curriculum.zones.find((z) => z.id === 'division-dunes')!.stages[1]
    for (const p of await sample(div.providerConfig)) {
      const m = p.prompt.match(/(\d+)\s*÷\s*(\d+)/)!
      expect(p.answer).toBe(Number(m[1]) / Number(m[2]))
    }
  })

  it('division arrays never print the quotient in their caption', async () => {
    for (const p of await sample({ kind: 'division', divisorMin: 2, divisorMax: 9, quotientMin: 2, quotientMax: 9 })) {
      if (p.visual?.kind !== 'array') throw new Error('expected an array visual')
      expect(p.visual.label ?? `${p.visual.rows} × ${p.visual.cols}`).not.toContain('×')
    }
  })

  it('fraction comparisons are correct and "=" is sometimes the answer', async () => {
    const answers = new Set<string>()
    for (const p of await sample({ kind: 'fractionCompare', maxDenominator: 10 }, 500)) {
      const [a, b] = p.prompt.split('?').map((t) => t.trim().split('/').map(Number))
      const cmp = a[0] * b[1] - b[0] * a[1]
      expect(p.answer).toBe(cmp < 0 ? '<' : cmp > 0 ? '>' : '=')
      expect(a[0]).toBeLessThan(a[1]) // proper fractions only
      answers.add(String(p.answer))
    }
    expect([...answers].sort()).toEqual(['<', '=', '>'])
  })

  it('elapsed-time answers add up', async () => {
    for (const p of await sample({ kind: 'measurement', type: 'time' })) {
      const m = p.prompt.match(/It is (\d+):(\d+)\. What time will it be in (?:(\d+) hours? and )?(\d+) minutes\?/)!
      const total = Number(m[1]) * 60 + Number(m[2]) + Number(m[3] ?? 0) * 60 + Number(m[4])
      const t = total % 720
      expect(p.answer).toBe(`${Math.floor(t / 60) || 12}:${String(t % 60).padStart(2, '0')}`)
    }
  })

  it('making change is correct and not always $1.xx', async () => {
    const dollars = new Set<number>()
    for (const p of await sample({ kind: 'measurement', type: 'money' })) {
      const m = p.prompt.match(/costs \$(\d+)\.(\d+)\. You pay with \$(\d+)\./)!
      const change = Number(m[3]) * 100 - (Number(m[1]) * 100 + Number(m[2]))
      expect(change).toBeGreaterThan(0)
      expect(p.answer).toBe(`$${Math.floor(change / 100)}.${String(change % 100).padStart(2, '0')}`)
      dollars.add(Math.floor(change / 100))
    }
    expect(dollars.size).toBeGreaterThan(2)
  })

  it('rounding hints name the deciding place', async () => {
    const want = { 10: 'ones', 100: 'tens', 1000: 'hundreds' } as const
    for (const roundTo of [10, 100, 1000] as const) {
      const [p] = await sample({ kind: 'placeValueRounding', maxPlace: 10000, roundTo }, 1)
      expect(p.hint).toContain(`${want[roundTo]} digit`)
    }
  })
})
