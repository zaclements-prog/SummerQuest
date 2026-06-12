import type { Problem, ProblemProvider } from '../problem'
import { randInt, shuffle } from '../random'

interface Config {
  type: 'area' | 'perimeter' | 'time' | 'money' | 'mixed'
}

export function makeMeasurementProvider(cfg: Config): ProblemProvider {
  let serial = 0
  function pick(): 'area' | 'perimeter' | 'time' | 'money' {
    if (cfg.type === 'mixed') {
      return (['area', 'perimeter', 'time', 'money'] as const)[randInt(0, 3)]
    }
    return cfg.type
  }
  return {
    topic: 'measurement',
    next(): Problem {
      const which = pick()
      switch (which) {
        case 'area':
          return area(serial++)
        case 'perimeter':
          return perimeter(serial++)
        case 'time':
          return time(serial++)
        case 'money':
          return money(serial++)
      }
    },
  }
}

function area(idx: number): Problem {
  const w = randInt(2, 9)
  const h = randInt(2, 9)
  const ans = w * h
  return mcProblem({
    id: `meas-area-${idx}`,
    prompt: `A rectangle is ${w} units wide and ${h} units tall. What is its area?`,
    answer: ans,
    topic: 'measurement-area',
    hint: `Area = width × height = ${w} × ${h}`,
    visual: { kind: 'shape', type: 'rect', width: w, height: h, unit: 'units' },
    distractors: [w + h, 2 * (w + h), w * h + w, w * h - w],
  })
}

function perimeter(idx: number): Problem {
  const w = randInt(2, 12)
  const h = randInt(2, 12)
  const ans = 2 * (w + h)
  return mcProblem({
    id: `meas-perim-${idx}`,
    prompt: `A rectangle is ${w} units wide and ${h} units tall. What is its perimeter?`,
    answer: ans,
    topic: 'measurement-perimeter',
    hint: `Perimeter = 2 × (width + height) = 2 × (${w} + ${h})`,
    visual: { kind: 'shape', type: 'rect', width: w, height: h, unit: 'units' },
    distractors: [w + h, w * h, 4 * (w + h), 2 * w + h],
  })
}

function time(idx: number): Problem {
  // elapsed time problem
  const startH = randInt(1, 11)
  const startM = randInt(0, 5) * 5
  const elapsedH = randInt(0, 2)
  const elapsedM = randInt(1, 11) * 5
  const endTotal = startH * 60 + startM + elapsedH * 60 + elapsedM
  const endH = Math.floor(endTotal / 60) % 12 || 12
  const endM = endTotal % 60
  const elapsedStr =
    elapsedH > 0
      ? `${elapsedH} hour${elapsedH > 1 ? 's' : ''} and ${elapsedM} minutes`
      : `${elapsedM} minutes`
  const ans = `${endH}:${String(endM).padStart(2, '0')}`
  const distractors = [
    `${endH}:${String((endM + 5) % 60).padStart(2, '0')}`,
    `${(endH % 12) + 1}:${String(endM).padStart(2, '0')}`,
    `${endH}:${String(Math.max(0, endM - 10)).padStart(2, '0')}`,
  ]
  return {
    id: `meas-time-${idx}`,
    prompt: `It is ${startH}:${String(startM).padStart(2, '0')}. What time will it be in ${elapsedStr}?`,
    options: shuffle([ans, ...distractors]),
    answer: ans,
    topic: 'measurement-time',
    visual: { kind: 'clock', hour: startH, minute: startM },
    hint: `Add ${elapsedH} hours and ${elapsedM} minutes.`,
  }
}

function money(idx: number): Problem {
  // give amount, ask for change from $X
  const costCents = randInt(20, 480)
  const paidDollars = Math.ceil(costCents / 100 + 1)
  const change = paidDollars * 100 - costCents
  const ans = formatMoney(change)
  const distractors = [
    formatMoney(change + 10),
    formatMoney(Math.max(1, change - 25)),
    formatMoney(paidDollars * 100 - costCents + 100),
  ]
  return {
    id: `meas-money-${idx}`,
    prompt: `Something costs ${formatMoney(costCents)}. You pay with $${paidDollars}. How much change do you get?`,
    options: shuffle([ans, ...distractors]),
    answer: ans,
    topic: 'measurement-money',
    visual: { kind: 'money', cents: costCents },
    hint: `Subtract ${formatMoney(costCents)} from $${paidDollars}.00`,
  }
}

function formatMoney(cents: number): string {
  const d = Math.floor(cents / 100)
  const c = cents % 100
  return `$${d}.${String(c).padStart(2, '0')}`
}

function mcProblem(args: {
  id: string
  prompt: string
  answer: number
  topic: string
  hint?: string
  visual?: Problem['visual']
  distractors: number[]
}): Problem {
  const set = new Set<number>()
  for (const d of args.distractors) {
    if (d > 0 && d !== args.answer && set.size < 3) set.add(d)
  }
  while (set.size < 3) set.add(args.answer + randInt(1, 5))
  return {
    id: args.id,
    prompt: args.prompt,
    options: shuffle([args.answer, ...Array.from(set)]),
    answer: args.answer,
    topic: args.topic,
    visual: args.visual,
    hint: args.hint,
  }
}
