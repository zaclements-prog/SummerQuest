import type { Problem, ProblemProvider } from '../problem'
import { add, compare, rat } from '../numbers'
import { randInt, shuffle } from '../random'
import { decOptions, decText, fracOptions, fracText, lcm, pick, properOf, weighted } from './fracDecKit'
import { G5_FRAC_SKILLS, compareItem as fractionCompare } from './g5Fractions'
import { G5_DEC_SKILLS, roundItem } from './g5Decimals'

/**
 * Tower Battlefront, 5th grade: the quick fraction and decimal questions that
 * buy a tower (the classic game's math gate; the game itself is unchanged).
 * Short enough to answer between waves:
 *
 *  - fractions: compare (unlike denominators, sometimes equal), the missing
 *    number of an equivalence, add with like or unlike denominators;
 *  - decimals: a digit's value, compare (the longer decimal is not the bigger
 *    one), round, a fraction as a decimal (3/4 = 0.75);
 *  - the parade gates' ideas (lib/gates/opSets `fracDec`): × 0.5 shrinks while
 *    × 1.5 grows; 1/3 of a group is less than 1/2 of it.
 */

const TOPIC = 'g5-gates'

type Item = Omit<Problem, 'id' | 'topic'>

/** "2/3 = ?/12" (the blank on top). */
function equivalent(): Item {
  const d = randInt(2, 6)
  const f = properOf(d)
  const k = randInt(2, Math.floor(12 / d) + 1)
  const answer = f.n * k
  const wrong = [...new Set([answer + 1, answer - 1, f.n + k, d * k - f.n, answer + k].filter((x) => x > 0 && x !== answer))].slice(0, 3)
  return {
    prompt: `${f.n}/${d} = ?/${d * k}`,
    options: shuffle([answer, ...wrong]),
    answer,
    subtopic: 'equivalent',
    skill: G5_FRAC_SKILLS.compare,
    hint: `${d} × ${k} = ${d * k}, so multiply the top by ${k} too.`,
  }
}

/** "3/8 + 4/8 = ?" (like) or "1/2 + 1/3 = ?" (unlike): sums under 1. */
function addFractions(): Item {
  if (Math.random() < 0.4) {
    const d = pick([4, 5, 6, 8, 10, 12])
    const x = randInt(1, d - 2)
    const y = randInt(1, d - 1 - x)
    const sum = rat(x + y, d)
    const { options, answer } = fracOptions(sum, [rat(x + y, 2 * d), rat(x * y, d), rat(x + y + 1, d)], (k) => add(sum, rat(k, d)))
    return {
      prompt: `${x}/${d} + ${y}/${d} = ?`,
      options,
      answer,
      subtopic: 'add-like',
      skill: G5_FRAC_SKILLS.addSub,
      hint: 'Same denominator: add the tops, keep the bottom.',
    }
  }
  let a = rat(1, 2)
  let b = rat(1, 3)
  do {
    const [p, q] = shuffle(pick([[2, 3], [2, 4], [2, 5], [2, 6], [3, 4], [3, 6], [4, 6], [4, 8], [2, 8]] as const))
    a = properOf(p)
    b = properOf(q)
  } while (compare(add(a, b), rat(1)) >= 0)
  const sum = add(a, b)
  const L = lcm(a.d, b.d)
  const { options, answer } = fracOptions(sum, [rat(a.n + b.n, a.d + b.d), rat(a.n + b.n, L), rat((a.n * L) / a.d + b.n, L)], (k) => add(sum, rat(k, L)))
  return {
    prompt: `${fracText(a)} + ${fracText(b)} = ?`,
    options,
    answer,
    subtopic: 'add-unlike',
    skill: G5_FRAC_SKILLS.addSub,
    hint: `Rename both with ${L} as the denominator, then add the tops.`,
  }
}

/** "What is the value of the 7 in 3.472?" */
function digitValue(): Item {
  const units = [100, 10, 1]
  for (;;) {
    const m = randInt(1, 9) * 1000 + randInt(1, 999)
    const text = decText(m, 3)
    const place = randInt(0, 2)
    const d = Math.floor((m % 1000) / units[place]) % 10
    if (d === 0 || text.split('').filter((c) => c === String(d)).length !== 1) continue
    const value = d * units[place]
    const { options, answer } = decOptions(value, undefined, [[d * 1000], [value * 10], place < 2 ? [value / 10] : [d * 10000]], (k) => [value + k * units[place]])
    return {
      prompt: `What is the value of the ${d} in ${text}?`,
      options,
      answer,
      subtopic: 'digit-value',
      skill: G5_DEC_SKILLS.place,
      hint: 'Tenths, then hundredths, then thousandths: count the places after the point.',
    }
  }
}

/** "0.5 ? 0.45": the longer decimal tempts. */
function compareDecimals(): Item {
  const w = randInt(0, 9)
  const t = randInt(2, 9)
  let a = w * 1000 + t * 100
  let b = w * 1000 + (t - 1) * 100 + randInt(1, 9) * 10 + (Math.random() < 0.5 ? randInt(1, 9) : 0)
  if (Math.random() < 0.15) b = a
  if (Math.random() < 0.5) [a, b] = [b, a]
  const answer = a < b ? '<' : a > b ? '>' : '='
  const pb = a === b ? 3 : undefined
  return {
    prompt: `${decText(a)} ? ${decText(b, pb)}`,
    options: shuffle(['<', '>', '=']),
    answer,
    subtopic: 'compare-decimals',
    skill: G5_DEC_SKILLS.compare,
    hint: 'Compare the tenths first. A longer decimal is not always bigger.',
  }
}

const AS_DECIMAL: [number, number][] = [
  [1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 8], [3, 8], [3, 100], [7, 100], [21, 100],
]

/** "Which decimal equals 3/4?" → 0.75. */
function fractionAsDecimal(): Item {
  const [n, d] = pick(AS_DECIMAL)
  const value = (n * 1000) / d
  const small = n < 10 && d < 10
  const { options, answer } = decOptions(
    value,
    undefined,
    [
      small ? [n * 100 + d * 10] : null, // the digits glued: 3/4 → 0.34
      small ? [d * 100 + n * 10] : null, // 0.43
      [value * 10],
      value % 10 === 0 ? [value / 10] : null,
      [n * 100],
    ],
    (k) => [value + k * 10],
  )
  return {
    prompt: `Which decimal equals ${n}/${d}?`,
    options,
    answer,
    subtopic: 'fraction-to-decimal',
    skill: G5_DEC_SKILLS.place,
    hint: d === 10 || d === 100 ? `${n}/${d} is ${n} ${d === 10 ? 'tenths' : 'hundredths'}.` : 'Find an equal fraction with 10, 100 or 1,000 on the bottom.',
  }
}

/** opSets' "×½ shrinks" idea: "Which makes 12 bigger: × 1.5 or × 0.5?" */
function scaleGrowShrink(): Item {
  const n = randInt(2, 12) * 2
  const up = pick(['1.5', '2.5', '1.25'])
  const down = pick(['0.5', '0.25', '0.75'])
  const answer = `× ${up}`
  return {
    prompt: `Which makes ${n} bigger: × ${up} or × ${down}?`,
    options: shuffle([answer, `× ${down}`, 'they are equal']),
    answer,
    subtopic: 'scale',
    skill: G5_FRAC_SKILLS.mult,
    hint: 'Times a number less than 1 makes it smaller. Times more than 1 makes it bigger.',
  }
}

/** opSets' "bigger denominator, smaller piece" idea: "Which is more: 1/3 of 12 or 1/4 of 12?" */
function unitOfGroup(): Item {
  const [p, q] = shuffle(pick([[2, 3], [3, 4], [2, 4], [4, 6], [3, 6], [2, 6]] as const))
  const n = lcm(p, q) * randInt(1, 3)
  const bigger = p < q ? p : q
  const answer = `1/${bigger} of ${n}`
  return {
    prompt: `Which is more: 1/${p} of ${n} or 1/${q} of ${n}?`,
    options: shuffle([answer, `1/${p === bigger ? q : p} of ${n}`, 'they are equal']),
    answer,
    subtopic: 'unit-of-group',
    skill: G5_FRAC_SKILLS.mult,
    hint: 'Cutting into more pieces makes each piece smaller.',
  }
}

function itemFor(): Item {
  return weighted<() => Item>([
    [3, fractionCompare],
    [2, equivalent],
    [3, addFractions],
    [2, digitValue],
    [3, compareDecimals],
    [1, roundItem],
    [2, fractionAsDecimal],
    [1, scaleGrowShrink],
    [1, unitOfGroup],
  ])()
}

export function makeG5GatesProvider(): ProblemProvider {
  let serial = 0
  return {
    topic: TOPIC,
    next(): Problem {
      return { id: `g5-gate-${serial++}`, topic: TOPIC, ...itemFor() }
    },
  }
}
