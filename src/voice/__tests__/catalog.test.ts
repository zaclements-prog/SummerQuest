import { describe, expect, it } from 'vitest'
import {
  GAP,
  WHOLE_MAX,
  buildVoiceCatalog,
  clipFile,
  comboCount,
  planTemplate,
  renderMode,
  slugWord,
  wholeKey,
} from '../catalog'
import { fillTemplate } from '../registry'
import { alignCaptionWords, numberWords, spokenView } from '../spoken'
import { defineVoicePack, type TemplateDef, type VoicePack } from '../types'

// any hash function will do here; the real SHA-1 is checked in voiceSync.test.ts
const sha1_10 = (s: string) => `h(${s})`
const V = 'test-voice'

const kMath = defineVoicePack({
  id: 'k-math',
  lines: { countThem: 'Count them with me!' },
  templates: {
    tapGroupWith: {
      text: 'Tap the group with {n} {thing}.',
      slots: { n: { numbers: [1, 3] }, thing: { words: ['apples', 'ice cream'] } },
    },
    howMany: {
      text: 'Count the {thing}. How many {thing} do you see?',
      slots: { thing: { words: ['fish', 'stars'] } },
      render: 'stitch',
    },
    bigCount: {
      text: 'Find {n}, then tap it!',
      slots: { n: { numbers: [0, 120] }, },
      render: 'stitch',
    },
  },
})
const kShapes = defineVoicePack({
  id: 'k-shapes',
  lines: {},
  templates: {
    sides: { text: 'This shape has {n} sides.', slots: { n: { numbers: [3, 8] } }, render: 'stitch' },
    pick: { text: 'Pick {n} {thing}', slots: { n: { numbers: [1, 20] }, thing: { words: ['red', 'blue'] } }, render: 'stitch' },
  },
})

describe('numbers spoken as words', () => {
  it('spells numbers the way textnorm reads them back', () => {
    expect([0, 7, 13, 20, 21, 99, 100, 105, 120, 1200, 20015].map(numberWords)).toEqual([
      'zero',
      'seven',
      'thirteen',
      'twenty',
      'twenty-one',
      'ninety-nine',
      'one hundred',
      'one hundred five',
      'one hundred twenty',
      'one thousand two hundred',
      'twenty thousand fifteen',
    ])
    expect(() => numberWords(-1)).toThrow()
    expect(() => numberWords(1.5)).toThrow()
  })

  it('maps a caption with digits to its spoken form and back', () => {
    const { spoken, map } = spokenView('Tap 21 fish.')
    expect(spoken).toBe('Tap twenty-one fish.')
    expect(map[spoken.indexOf('twenty')]).toBe(4)
    expect(map[spoken.indexOf('one fish')]).toBe(4)
    expect(map[spoken.indexOf('fish')]).toBe('Tap 21 '.length)
  })

  it('pins recorded word timings to caption characters', () => {
    const caption = 'Tap the group with 7 apples.'
    const words = [
      { w: 'Tap', s: 0, e: 0.2 },
      { w: 'the', s: 0.2, e: 0.3 },
      { w: 'group', s: 0.3, e: 0.6 },
      { w: 'with', s: 0.6, e: 0.8 },
      { w: 'seven', s: 0.8, e: 1.1 },
      { w: 'apples.', s: 1.1, e: 1.5 },
    ]
    const a = alignCaptionWords(caption, 0, caption.length, words)
    expect(a.map((x) => caption.slice(x.start, x.start + 2))).toEqual(['Ta', 'th', 'gr', 'wi', '7 ', 'ap'])
    expect(a[4].s).toBe(0.8)
    // a segment of the caption, offset in time
    const seg = alignCaptionWords(caption, 19, 20, [{ w: 'seven', s: 0.02, e: 0.4 }], 2)
    expect(seg).toEqual([{ start: 19, s: 2.02 }])
  })
})

describe('the clip catalog', () => {
  const cat = buildVoiceCatalog([kShapes, kMath], V, sha1_10)
  const keys = Object.keys(cat.clips)

  it('records each fixed line once, verbatim, with the lesson-style hash', () => {
    expect(cat.voice).toBe(V)
    expect(cat.clips['k-math/countThem']).toEqual({
      text: 'Count them with me!',
      hash: sha1_10(`${V}|Count them with me!`),
      kind: 'line',
      file: 'voice/k-math/countThem.mp3',
    })
  })

  it('expands a whole template into every combination, numbers as words', () => {
    const def = kMath.templates.tapGroupWith
    expect(renderMode(def)).toBe('whole')
    const whole = keys.filter((k) => k.startsWith('k-math/tapGroupWith/'))
    expect(whole).toHaveLength(comboCount(def))
    expect(whole).toContain('k-math/tapGroupWith/n=3,thing=ice-cream')
    expect(cat.clips['k-math/tapGroupWith/n=3,thing=ice-cream'].text).toBe('Tap the group with three ice cream.')
    expect(cat.clips['k-math/tapGroupWith/n=1,thing=apples'].kind).toBe('whole')
  })

  it('records a stitched template as carrier pieces plus shared slot values', () => {
    expect(cat.clips['k-math/howMany#0']).toMatchObject({ text: 'Count the', kind: 'piece', file: 'voice/k-math/howMany.part0.mp3' })
    expect(cat.clips['k-math/howMany#1'].text).toBe('How many') // the ". " belongs to the gap
    expect(cat.clips['k-math/howMany#2'].text).toBe('do you see?')
    expect(cat.clips['k-math/bigCount#0'].text).toBe('Find')
    expect(cat.clips['k-math/bigCount#1'].text).toBe('then tap it!')
    expect(cat.clips['k-shapes/pick#2']).toBeUndefined() // nothing after the last slot
    expect(cat.clips['slots/number/7']).toMatchObject({ text: 'seven', kind: 'slot' })
    expect(cat.clips['slots/number/120'].text).toBe('one hundred twenty')
    expect(cat.clips['slots/word/fish'].text).toBe('fish')
  })

  it('shares one clip per slot value across templates and packs', () => {
    // 0–120 (k-math) ∪ 3–8 and 1–20 (k-shapes): one "seven"
    const numbers = keys.filter((k) => k.startsWith('slots/number/'))
    expect(numbers).toHaveLength(121)
    expect(numbers.slice(0, 3)).toEqual(['slots/number/0', 'slots/number/1', 'slots/number/2'])
    expect(keys.filter((k) => k.startsWith('slots/word/'))).toEqual(['slots/word/blue', 'slots/word/fish', 'slots/word/red', 'slots/word/stars'])
  })

  it('is stable: packs in id order, the same output whatever order they come in', () => {
    expect(buildVoiceCatalog([kMath, kShapes], V, sha1_10)).toEqual(cat)
    expect(keys[0]).toBe('k-math/countThem')
  })

  it('names every clip with filesystem- and URL-safe paths', () => {
    for (const k of keys) {
      const f = clipFile(k)
      expect(f, k).toMatch(/^voice\/[a-z0-9-]+\/[A-Za-z0-9_.=,/-]+\.mp3$/)
      for (const part of f.split('/')) expect(part, k).not.toMatch(/^[._]/) // Android drops dot / underscore assets
    }
  })

  it('changes every hash when the voice changes', () => {
    const other = buildVoiceCatalog([kMath], 'another-voice', sha1_10)
    expect(other.clips['k-math/countThem'].hash).not.toBe(cat.clips['k-math/countThem'].hash)
  })
})

describe('catalog rules', () => {
  const pack = (templates: Record<string, TemplateDef>, lines: Record<string, string> = {}, id = 'p'): VoicePack => ({ id, lines, templates })
  const build = (...packs: VoicePack[]) => buildVoiceCatalog(packs, V, sha1_10)

  it('stitches a big template by default and refuses a too-big whole one', () => {
    const big: TemplateDef = { text: 'Show {a} and {b}.', slots: { a: { numbers: [0, 20] }, b: { numbers: [0, 20] } } }
    expect(comboCount(big)).toBe(441)
    expect(renderMode(big)).toBe('stitch')
    expect(() => build(pack({ t: { ...big, render: 'whole' } }))).toThrow(new RegExp(`441 combinations.*max ${WHOLE_MAX}.*stitch`))
    const mid: TemplateDef = { text: 'Show {a} and {b}.', slots: { a: { numbers: [0, 14] }, b: { numbers: [0, 14] } } }
    expect(renderMode(mid)).toBe('stitch') // 225 > 200: stitched unless asked
    expect(Object.keys(build(pack({ t: { ...mid, render: 'whole' } })).clips)).toHaveLength(225)
  })

  it('rejects templates that cannot be recorded or named', () => {
    expect(() => build(pack({ t: { text: 'No slots here.', slots: {} } }))).toThrow(/no \{slot\}/)
    expect(() => build(pack({ t: { text: 'Tap {n}.', slots: {} } }))).toThrow(/no such slot/)
    expect(() => build(pack({ t: { text: 'Tap {n}.', slots: { n: { numbers: [1, 3] }, m: { numbers: [1, 2] } } } }))).toThrow(/never used/)
    expect(() => build(pack({ t: { text: 'Tap {w}.', slots: { w: { words: ['ice cream', 'ice-cream'] } } } }))).toThrow(/share a clip name/)
    expect(() => build(pack({ t: { text: 'Tap {n}.', slots: { n: { numbers: [-1, 3] } } } }))).toThrow(/whole numbers/)
    expect(() => build(pack({ t: { text: 'Tap {w}.', slots: { w: { words: [] } } } }))).toThrow(/no words/)
    expect(() => build(pack({}, { 'bad id': 'Hi.' }))).toThrow(/bad voice line id/)
    expect(() => build(pack({}, { _x: 'Hi.' }))).toThrow(/bad voice line id/)
    expect(() => build(pack({}, { a: 'Hi.' }, 'slots'))).toThrow(/bad voice pack id/)
    expect(() => build(pack({}, { a: 'Hi.' }, 'K-Math'))).toThrow(/bad voice pack id/)
    expect(() => build(pack({}, { hello: 'Hi.', Hello: 'Hey.' }))).toThrow(/letter case/)
    expect(() => build(pack({ t: { text: 'Tap {n}.', slots: { n: { numbers: [1, 2] } } } }, { t: 'Hi.' }))).toThrow(/both a line and a template/)
  })

  it('refuses one slot clip that would say two different things', () => {
    const a = pack({ t: { text: 'Tap {w}.', slots: { w: { words: ['A'] } }, render: 'stitch' } }, {}, 'a')
    const b = pack({ t: { text: 'Find {w}.', slots: { w: { words: ['a'] } }, render: 'stitch' } }, {}, 'b')
    expect(() => build(a, b)).toThrow(/would say both/)
  })

  it('slugs slot words into file-name parts', () => {
    expect(slugWord('Ice Cream')).toBe('ice-cream')
    expect(slugWord("o'clock")).toBe('o-clock')
    expect(slugWord('jalapeño')).toBe('jalapeno')
    expect(() => slugWord('!!')).toThrow()
  })
})

describe('playing a template (planTemplate)', () => {
  it('plays a whole template as its one combination clip', () => {
    const def = kMath.templates.tapGroupWith
    const slots = { n: 2, thing: 'apples' }
    const caption = fillTemplate(def.text, slots)
    expect(planTemplate('k-math/tapGroupWith', def, slots, caption)).toEqual([
      { key: wholeKey('k-math/tapGroupWith', def, slots), text: 'Tap the group with two apples.', capStart: 0, capEnd: caption.length, gap: 0 },
    ])
    expect(wholeKey('k-math/tapGroupWith', def, { thing: 'apples', n: 2 })).toBe('k-math/tapGroupWith/n=2,thing=apples')
  })

  it('plays a stitched template as pieces and slot words pinned to the caption, with pauses', () => {
    const def = kMath.templates.howMany
    const slots = { thing: 'fish' }
    const caption = fillTemplate(def.text, slots) // "Count the fish. How many fish do you see?"
    const plan = planTemplate('k-math/howMany', def, slots, caption)
    expect(plan.map((s) => s.key)).toEqual(['k-math/howMany#0', 'slots/word/fish', 'k-math/howMany#1', 'slots/word/fish', 'k-math/howMany#2'])
    expect(plan.map((s) => caption.slice(s.capStart, s.capEnd))).toEqual(['Count the', 'fish', 'How many', 'fish', 'do you see?'])
    expect(plan.map((s) => s.gap)).toEqual([0, GAP.tight, GAP.sentence, GAP.tight, GAP.tight])
  })

  it('says numbers as words but pins them to their digits, with a comma pause', () => {
    const def = kMath.templates.bigCount
    const caption = fillTemplate(def.text, { n: 17 }) // "Find 17, then tap it!"
    const plan = planTemplate('k-math/bigCount', def, { n: 17 }, caption)
    expect(plan).toEqual([
      { key: 'k-math/bigCount#0', text: 'Find', capStart: 0, capEnd: 4, gap: 0 },
      { key: 'slots/number/17', text: 'seventeen', capStart: 5, capEnd: 7, gap: GAP.tight },
      { key: 'k-math/bigCount#1', text: 'then tap it!', capStart: 9, capEnd: caption.length, gap: GAP.comma },
    ])
  })

  it('starts with a slot when the template does', () => {
    const def: TemplateDef = { text: '{n} fish!', slots: { n: { numbers: [1, 9] } }, render: 'stitch' }
    const plan = planTemplate('p/t', def, { n: 4 }, '4 fish!')
    expect(plan.map((s) => [s.key, s.gap])).toEqual([
      ['slots/number/4', 0],
      ['p/t#1', GAP.tight],
    ])
  })
})
