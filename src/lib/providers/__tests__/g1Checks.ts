import type { Picture } from '../../problem'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { DRAWINGS } from '../../../games/listenPlay/drawings'
import { isTensSpec, onesOf, tensOf } from '../../../games/listenPlay/activities/tensSpecs'
import { isShareTapSpec } from '../../../games/listenPlay/activities/shareTapSpec'
import { CUT_INFO, area, parseShareArt, shares, THING_BASE } from '../../../games/listenPlay/shareGeometry'
import { FLAT_NAME, flatSides, parseShapeArt } from '../../../games/listenPlay/g1ShapesArt'
import { RECIPE, decoyPiece, isSnapSpec } from '../../../games/listenPlay/activities/snapSpec'
import { G1_SOLID_THINGS } from '../../../voice/packs/g1-shapes'
import { ROLLS, STACKS, type RollSolid } from '../g1Shapes'

/**
 * 1st grade (phase 2b) content checks, shared by the content fuzz suite and
 * the providers' own tests: each question's answer worked out again from what
 * is SHOWN (the blocks, the drawings' names, the pieces) and SAID (the
 * prompt), never from the provider's own bookkeeping, and every wrong card a
 * fair, sensible one.
 */

/** Unicode 9 or older, one symbol (a text-default symbol may carry U+FE0F). */
export function oldEmoji(e: string): boolean {
  const cps = [...e].map((c) => c.codePointAt(0)!).filter((cp) => cp !== 0xfe0f)
  if (cps.length !== 1) return false
  const cp = cps[0]
  return (
    cp < 0x1f6d3 ||
    (cp >= 0x1f6e0 && cp <= 0x1f6f6) ||
    (cp >= 0x1f910 && cp <= 0x1f91e) ||
    (cp >= 0x1f920 && cp <= 0x1f927) ||
    (cp >= 0x1f930 && cp <= 0x1f93e) ||
    (cp >= 0x1f940 && cp <= 0x1f94b) ||
    (cp >= 0x1f950 && cp <= 0x1f95e) ||
    (cp >= 0x1f980 && cp <= 0x1f991) ||
    cp === 0x1f9c0
  )
}

const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number)

/** Tens Plateau: the answer from the numbers said or shown. */
export function g1TensProblems(p: ListenProblem): string[] {
  const a = p.activity
  if (!isTensSpec(a)) return [`not a Tens Plateau activity: ${JSON.stringify(a)}`]
  const errs: string[] = []
  const want = (v: unknown) => {
    if (p.answer !== v) errs.push(`answer ${JSON.stringify(p.answer)}, should be ${JSON.stringify(v)}`)
  }
  const twoDigit = (n: number, what: string) => {
    if (!(Number.isInteger(n) && n >= 11 && n <= 99)) errs.push(`${what} ${n} isn't a two-digit number`)
  }
  if (a.kind === 'buildTens') {
    twoDigit(a.n, 'build')
    if (!p.prompt.startsWith('Make ')) errs.push(`"${p.prompt}" doesn't ask to make`)
    if (p.options.length) errs.push('a build question with cards')
    if (onesOf(a.n) < 2) errs.push('a build with fewer than two ones')
    want(a.n)
    return errs
  }
  const cards = a.cards
  if (cards.length < 2 || cards.length > 3) errs.push(`${cards.length} cards`)
  if (new Set(cards).size !== cards.length) errs.push(`cards repeat ${JSON.stringify(cards)}`)
  if (JSON.stringify(cards) !== JSON.stringify(p.options)) errs.push('the cards are not the options')
  if (cards.filter((c) => c === p.answer).length !== 1) errs.push(`the answer ${p.answer} is not on exactly one card`)
  for (const c of cards) if (typeof c === 'number' && !(Number.isInteger(c) && c >= 0 && c <= 120)) errs.push(`card ${c} outside 0–120`)
  const said = nums(p.prompt)
  const m = a.m ?? a.n
  switch (a.ask) {
    case 'howMany': {
      twoDigit(a.n, 'blocks')
      want(a.n)
      // the misses: the digits swapped, a ten off, or one off
      for (const c of cards) if (c !== a.n && ![onesOf(a.n) * 10 + tensOf(a.n), a.n + 10, a.n - 10, a.n + 1, a.n - 1].includes(c as number)) errs.push(`card ${c} isn't a sensible miss for ${a.n}`)
      break
    }
    case 'shows':
      twoDigit(a.n, 'shown')
      if (said[0] !== a.n) errs.push(`asks for ${said[0]}, shows ${a.n}`)
      want(a.n)
      for (const c of cards) if (typeof c !== 'number' || tensOf(c) < 1) errs.push(`card ${c} has no rods`)
      break
    case 'tensIn':
      twoDigit(a.n, 'number')
      if (said[0] !== a.n) errs.push(`asks about ${said[0]}, the activity ${a.n}`)
      want(tensOf(a.n))
      if (JSON.stringify([...cards].sort()) !== JSON.stringify([tensOf(a.n), onesOf(a.n), tensOf(a.n) * 10].sort())) errs.push(`cards ${cards} aren't the tens, the ones and the tens' worth`)
      if (onesOf(a.n) === tensOf(a.n)) errs.push('the tens and ones digits are the same: the ones card is the answer too')
      break
    case 'tenMore':
    case 'tenLess': {
      if (said[0] !== a.n) errs.push(`says ${said[0]}, starts at ${a.n}`)
      const v = a.ask === 'tenMore' ? a.n + 10 : a.n - 10
      want(v)
      twoDigit(v, 'result')
      if (!new RegExp(a.ask === 'tenMore' ? 'Ten more' : 'Ten goes away').test(p.prompt)) errs.push(`"${p.prompt}" doesn't say ${a.ask}`)
      break
    }
    case 'bigger':
    case 'smaller':
      twoDigit(a.n, 'left')
      twoDigit(m, 'right')
      if (a.n === m) errs.push('comparing a number with itself')
      if (JSON.stringify(cards) !== JSON.stringify([a.n, m])) errs.push('the cards are not the two numbers')
      want(a.ask === 'bigger' ? Math.max(a.n, m) : Math.min(a.n, m))
      if (!p.prompt.includes(a.ask)) errs.push(`"${p.prompt}" doesn't ask for the ${a.ask} one`)
      break
    case 'sign':
      twoDigit(a.n, 'left')
      twoDigit(m, 'right')
      if (JSON.stringify(cards) !== JSON.stringify(['>', '<', '='])) errs.push(`sign cards ${cards}`)
      want(a.n > m ? '>' : a.n < m ? '<' : '=')
      break
    case 'next': {
      if (!(a.n >= 20 && a.n <= 120)) errs.push(`counts to ${a.n}`)
      const words = p.prompt.split('.')[0]
      if (!/What comes next\?$/.test(p.prompt)) errs.push(`"${p.prompt}" doesn't ask what comes next`)
      if (!words) errs.push('no numbers said')
      want(a.n)
      for (const c of cards) if (typeof c === 'number' && c !== a.n && ![a.n - 1, a.n + 1, a.n - 10, a.n + 10, 102, 110].includes(c)) errs.push(`card ${c} isn't a sensible miss after ${a.n - 1}`)
      break
    }
  }
  return errs
}

/** A share card's drawing (null: not a share drawing). */
const shareOf = (pic: Picture | undefined) => (pic?.kind === 'art' ? parseShareArt(pic.name) : null)

/** Fair Share Falls: the answer from the drawings' cuts. */
export function g1SharesProblems(p: ListenProblem): string[] {
  const errs: string[] = []
  if (isShareTapSpec(p.activity)) {
    const s = p.activity
    if (p.answer !== s.ask) errs.push(`answer ${p.answer}, asks for a ${s.ask}`)
    if (!p.prompt.startsWith(s.ask === 'half' ? 'Tap the half of the ' : 'Tap a fourth of the ')) errs.push(`"${p.prompt}" asks for something else`)
    if (!p.prompt.includes(s.thing)) errs.push(`"${p.prompt}" names another thing than ${s.thing}`)
    const parts = shares(THING_BASE[s.thing], 'mix', s.turn)
    const [h, f1, f2] = parts.map(area)
    if (Math.abs(h - (f1 + f2)) / h > 0.01 || Math.abs(f1 - f2) / f1 > 0.01) errs.push(`the half and its two fourths don't match: ${h} ${f1} ${f2}`)
    return errs
  }
  const cards = p.pictureOptions ?? []
  if (cards.length !== p.options.length || cards.some((c, i) => c.value !== p.options[i])) return ['picture cards don\'t match the options']
  if (p.options.filter((o) => o === p.answer).length !== 1) errs.push('the answer is not exactly one card')
  for (const pic of [p.picture, ...cards.map((c) => c.picture)]) if (pic?.kind === 'art' && !DRAWINGS[pic.name]) errs.push(`no drawing "${pic.name}"`)
  const thing = /Which (\w+) is/.exec(p.prompt)?.[1]
  const fits = (pred: (parts: number, equal: boolean) => boolean) =>
    cards.filter((c) => {
      const a = shareOf(c.picture)
      return !!a && pred(CUT_INFO[a.cut].parts, CUT_INFO[a.cut].equal)
    })
  const only = (hits: typeof cards, what: string) => {
    if (hits.length !== 1) errs.push(`${hits.length} cards are ${what}`)
    else if (hits[0].value !== p.answer) errs.push(`answer ${p.answer}, the drawings say ${hits[0].value}`)
  }
  switch (p.subtopic) {
    case 'equal':
      only(fits((_, eq) => eq), 'cut into equal shares')
      break
    case 'halves':
      only(fits((n, eq) => eq && n === 2), 'cut in half')
      break
    case 'fourths':
      only(fits((n, eq) => eq && n === 4), 'cut into fourths')
      break
    case 'howMany': {
      const a = shareOf(p.picture)
      if (!a || !CUT_INFO[a.cut].equal) errs.push('the picture is not cut into equal shares')
      else if (p.answer !== CUT_INFO[a.cut].parts) errs.push(`answer ${p.answer}, the picture has ${CUT_INFO[a.cut].parts} shares`)
      if (JSON.stringify([...p.options].sort()) !== '[2,3,4]') errs.push(`cards ${p.options}`)
      break
    }
    case 'nameShare': {
      const a = shareOf(p.picture)
      if (!a || !CUT_INFO[a.cut].equal || a.colored === undefined) errs.push('the picture has no coloured equal share')
      else if (p.answer !== (CUT_INFO[a.cut].parts === 2 ? 'half' : 'fourth')) errs.push(`answer ${p.answer} for ${a.cut}`)
      if (JSON.stringify(p.options) !== '["half","fourth"]') errs.push('the word cards are not "half", "fourth" in that order')
      if (cards.some((c) => c.picture.kind !== 'word')) errs.push('half / fourth are not word cards')
      break
    }
    case 'bigger':
    case 'smaller': {
      const by = cards.map((c) => shareOf(c.picture))
      if (by.some((a) => !a || a.colored === undefined || !CUT_INFO[a.cut].equal)) errs.push('a card without a coloured equal share')
      else {
        if (new Set(by.map((a) => a!.thing)).size !== 1) errs.push('two different things compared')
        const share = (i: number) => 1 / CUT_INFO[by[i]!.cut].parts
        const pick = p.subtopic === 'bigger' ? (share(0) > share(1) ? 0 : 1) : share(0) < share(1) ? 0 : 1
        if (share(0) === share(1)) errs.push('both shares the same size')
        if (cards[pick].value !== p.answer) errs.push(`answer ${p.answer}, the drawings say ${cards[pick].value}`)
      }
      break
    }
    default:
      errs.push(`unknown share question ${p.subtopic}`)
  }
  if (thing && cards.some((c) => shareOf(c.picture) && shareOf(c.picture)!.thing !== thing)) errs.push(`a card isn't a ${thing}`)
  // a word about each wrong card, never the answer
  p.notes?.forEach((n, i) => {
    if ((p.options[i] === p.answer) !== (n === null)) errs.push(`card ${i}: a note on the answer, or none on a wrong card`)
  })
  return errs
}

/** Shape Grove (1st grade): the answer from the drawings and the pieces. */
export function g1ShapesProblems(p: ListenProblem): string[] {
  const errs: string[] = []
  if (isSnapSpec(p.activity)) {
    const s = p.activity
    const def = RECIPE[s.recipe]
    const want = s.ask === 'fill' ? def.gapShape : def.makes
    if (p.answer !== want) errs.push(`answer ${p.answer}, should be ${want}`)
    if (s.cards.filter((c) => c === want).length !== 1) errs.push(`the answer is not exactly one card: ${s.cards}`)
    if (new Set(s.cards).size !== s.cards.length) errs.push(`cards repeat ${s.cards}`)
    if (s.ask === 'fill') {
      // only the gap's own piece fits: the others are other shapes, drawn
      for (const c of s.cards) if (c !== def.gapShape && c !== 'circle' && !decoyPiece(c)) errs.push(`no piece for ${c}`)
      if (!p.prompt.includes(def.makes)) errs.push(`"${p.prompt}" names another shape than ${def.makes}`)
    } else if (!/What shape do they make\?$/.test(p.prompt)) errs.push(`"${p.prompt}" doesn't ask what they make`)
    return errs
  }
  const cards = p.pictureOptions ?? []
  if (cards.length !== p.options.length || cards.some((c, i) => c.value !== p.options[i])) return ['picture cards don\'t match the options']
  if (p.options.filter((o) => o === p.answer).length !== 1) errs.push('the answer is not exactly one card')
  for (const c of cards) {
    if (c.picture.kind === 'art' && !DRAWINGS[c.picture.name]) errs.push(`no drawing "${c.picture.name}"`)
    if (c.picture.kind === 'emoji' && !oldEmoji(c.picture.emoji)) errs.push(`emoji ${c.picture.emoji} is newer than Unicode 9`)
  }
  const pick = (ok: (i: number) => boolean, what: string) => {
    const hits = cards.map((_, i) => i).filter(ok)
    if (hits.length !== 1) errs.push(`${hits.length} cards are ${what}`)
    else if (cards[hits[0]].value !== p.answer) errs.push(`answer ${p.answer}, the pictures say ${cards[hits[0]].value}`)
  }
  const flat = (i: number) => (cards[i].picture.kind === 'art' ? parseShapeArt((cards[i].picture as { name: string }).name) : null)
  const solid = (i: number): RollSolid | null => {
    const pic = cards[i].picture
    if (pic.kind === 'shape' && (pic.shape === 'cube' || pic.shape === 'sphere' || pic.shape === 'cylinder')) return pic.shape
    if (pic.kind === 'art' && pic.name.startsWith('g1solid-box-')) return 'box'
    return null
  }
  switch (p.subtopic) {
    case 'still': {
      const name = /still a (\w+)\?$/.exec(p.prompt)?.[1]
      pick((i) => {
        const a = flat(i)
        return !!a && !a.flaw && FLAT_NAME[a.shape] === name
      }, `still a ${name}`)
      break
    }
    case 'sides': {
      const n = { three: 3, four: 4, five: 5, six: 6 }[/with (\w+) sides/.exec(p.prompt)?.[1] ?? ''] ?? NaN
      pick((i) => {
        const a = flat(i)
        return !!a && !a.flaw && flatSides(a.shape) === n
      }, `${n}-sided`)
      break
    }
    case 'noCorners':
      pick((i) => {
        const a = flat(i)
        return !!a && !a.flaw && flatSides(a.shape) === 0
      }, 'round')
      break
    case 'roll':
    case 'cantRoll':
    case 'stack':
    case 'rollStack':
    case 'stackNoRoll': {
      const ok: Record<string, (s: RollSolid) => boolean> = {
        roll: (s) => ROLLS[s],
        cantRoll: (s) => !ROLLS[s],
        stack: (s) => STACKS[s],
        rollStack: (s) => ROLLS[s] && STACKS[s],
        stackNoRoll: (s) => STACKS[s] && !ROLLS[s],
      }
      pick((i) => {
        const s = solid(i)
        return !!s && ok[p.subtopic!](s)
      }, p.subtopic!)
      if (cards.some((_, i) => !solid(i))) errs.push('a roll / stack card that is not a sphere, cube, cylinder or box')
      break
    }
    case 'likeShape': {
      const which = /shaped like a (\w+)\?$/.exec(p.prompt)?.[1] as keyof typeof G1_SOLID_THINGS
      const emojis: string[] = (G1_SOLID_THINGS[which] ?? []).map((t) => t.emoji)
      pick((i) => cards[i].picture.kind === 'emoji' && emojis.includes((cards[i].picture as { emoji: string }).emoji), `shaped like a ${which}`)
      break
    }
    default:
      errs.push(`unknown shape question ${p.subtopic}`)
  }
  p.notes?.forEach((n, i) => {
    if ((p.options[i] === p.answer) !== (n === null)) errs.push(`card ${i}: a note on the answer, or none on a wrong card`)
  })
  return errs
}
