import type { Picture, PictureOption, ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { G1_BABIES } from '../../voice/packs/g1-science'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { randInt, shuffle } from '../random'
import { makeDeck, makeKindPicker, makePositionGuard, makeRecent, pickOne } from './kShared'

/**
 * Sky Summit (Science Summit for 1st grade; 1-PS4, 1-ESS1, 1-LS1/LS3), picture
 * cards in the Listen & Play shell. A wrong pick hears a line about the card
 * it picked (why it isn't the one), then tries again.
 *
 * - `lightSound` (g1-science-1, 1-PS4): "The room is dark. What helps you
 *   see?" (a flashlight, a lamp or a candle beside things that make no light);
 *   "Which one is making a sound?" (one bell, drum or guitar shaking, the others
 *   still); "The bell is ringing. How can you stop the sound?" (hold it still,
 *   or hit it again); "Which picture shows its shadow?" (the shadow on the side
 *   away from the sun, toward it, or none); glass, wax paper and wood: which
 *   one you can see through, which lets only some light through, which blocks it.
 * - `sky` (g1-science-2, 1-ESS1): the day sky and the night sky; what we see in
 *   the sky by day (the sun, never the stars) and by night (the moon or the
 *   stars, never the sun); when we see the stars or the sun; the sun coming
 *   up, high at lunch time and going down; summer days are long, winter ones short;
 *   who is up by day or by night (an owl, a bat, a rooster, going to school);
 *   the moon's changing shape (full, half, thin); what comes next in a
 *   sun-moon pattern; what each season brings (flowers, the beach, falling
 *   leaves, a snowman) and which season comes next.
 * - `families` (g1-science-3, 1-LS1/LS3): a baby and the parent it grows up
 *   to look like; how parents help (feeding, keeping eggs warm, carrying);
 *   body parts that help living things (a turtle's shell, a cactus's spines,
 *   wings, fins, a trunk, big ears).
 *
 * The pictures are drawings (`art`: src/games/listenPlay/drawingsSky.tsx) or
 * emoji every Android tablet draws (Unicode 9 or older). No question has two
 * right cards: the moon is never a wrong card for the day (it can be up then),
 * a turtle is never a wrong card for fins, an elephant never for big ears.
 */

export type G1ScienceMode = 'lightSound' | 'sky' | 'families'
export type G1ScienceKind =
  | 'dark'
  | 'sound'
  | 'stopSound'
  | 'shadow'
  | 'material'
  | 'dayNight'
  | 'seeSky'
  | 'whenSee'
  | 'sunMove'
  | 'skyNext'
  | 'season'
  | 'nightThing'
  | 'moonShape'
  | 'skyPattern'
  | 'seasonSee'
  | 'seasonNext'
  | 'baby'
  | 'helps'
  | 'parts'

export interface G1ScienceConfig {
  mode: G1ScienceMode
}

// ── light and sound ──────────────────────────────────────────────────────────

export const G1_INSTRUMENTS = ['bell', 'drum', 'guitar'] as const
export type Instrument = (typeof G1_INSTRUMENTS)[number]
/** The drawing of an instrument making a sound (shaking), and still. */
export const soundArt = (x: Instrument, ringing: boolean) => `${x}${ringing ? 'Ring' : 'Still'}`
/** How to stop it (a hand holding it still), or what makes more sound (hit it, pluck it). */
export const stopArt = (x: Instrument, hold: boolean) => (hold ? `${x}Hold` : x === 'guitar' ? 'guitarPluck' : `${x}Hit`)

/** Things that make light, and things that don't (the dark room's cards): emoji every tablet draws. */
export const G1_LIGHTS = { flashlight: '🔦', lightBulb: '💡', candle: '🕯️' } as const
export const G1_NO_LIGHTS = { shoe: '👟', ball: '⚽', balloon: '🎈', drum: '🥁' } as const

export const G1_SHADOW_THINGS = ['tree', 'kid'] as const
export type ShadowThing = (typeof G1_SHADOW_THINGS)[number]
export type ShadowHow = 'away' | 'toward' | 'none'
/** A shadow drawing: the thing in the sun (sun on the left or right), its shadow away from the sun, toward it, or none. */
export const shadowArt = (thing: ShadowThing, sun: 'L' | 'R', how: ShadowHow) => `shadow-${thing}-${sun}-${how}`

export const G1_MATERIALS = ['glass', 'waxPaper', 'wood'] as const
export type Material = (typeof G1_MATERIALS)[number]
/** Which material each question wants. */
export const MATERIAL_ASK = { seeThrough: 'glass', someLight: 'waxPaper', blocksLight: 'wood' } as const satisfies Record<string, Material>

// ── the sky ──────────────────────────────────────────────────────────────────

export const SKY = { sun: '☀️', moon: '🌙', stars: '⭐' } as const
export const G1_SUN_PLACES = ['sunRise', 'sunHigh', 'sunSet'] as const
export type SunPlace = (typeof G1_SUN_PLACES)[number]
/** The day's pattern, and what comes after each part of it (night comes round to morning again). */
export const G1_SKY_NEXT = { sunRise: 'sunHigh', sunHigh: 'sunSet', sunSet: 'nightSky', nightSky: 'sunRise' } as const
export type SkyTime = keyof typeof G1_SKY_NEXT

/** Who is up (or what happens) by day or by night: the question's picture, and when. */
export const G1_DAY_NIGHT_THINGS = { owl: { emoji: '🦉', when: 'night' }, bat: { emoji: '🦇', when: 'night' }, rooster: { emoji: '🐓', when: 'day' }, school: { emoji: '🏫', when: 'day' } } as const
export type DayNightThing = keyof typeof G1_DAY_NIGHT_THINGS
/** The moon's shapes (drawings on the night sky). */
export const G1_MOON_SHAPES = ['moonFull', 'moonHalf', 'moonThin'] as const
export type MoonShape = (typeof G1_MOON_SHAPES)[number]
/** A sun-moon pattern strip (sun, moon, sun, ? or moon, sun, moon, ?) and what comes next. */
export const G1_SKY_PATTERNS = { patternSunMoon: 'night', patternMoonSun: 'day' } as const
export type SkyPattern = keyof typeof G1_SKY_PATTERNS
/** The seasons in their order through the year, each with a picture of what it brings. */
export const G1_SEASONS = ['spring', 'summer', 'fall', 'winter'] as const
export type Season = (typeof G1_SEASONS)[number]
export const SEASON_PICS: Record<Season, string> = { spring: '🌷', summer: '🏖️', fall: '🍂', winter: '⛄' }
/** The season across the year from each (the "what might you see?" wrong card: never arguably right). */
export const SEASON_OPPOSITE: Record<Season, Season> = { spring: 'fall', summer: 'winter', fall: 'spring', winter: 'summer' }
export const nextSeason = (x: Season): Season => G1_SEASONS[(G1_SEASONS.indexOf(x) + 1) % G1_SEASONS.length]

// ── animal families ──────────────────────────────────────────────────────────

/** Each baby's picture, and the parent it grows up to look like. */
export const G1_FAMILIES: Record<(typeof G1_BABIES)[number], { baby: string; parent: G1Parent }> = {
  chick: { baby: '🐤', parent: 'hen' },
  puppy: { baby: '🐶', parent: 'dog' },
  kitten: { baby: '🐱', parent: 'cat' },
  calf: { baby: '🐮', parent: 'cow' },
  piglet: { baby: '🐷', parent: 'pig' },
  foal: { baby: '🐴', parent: 'horse' },
  bunny: { baby: '🐰', parent: 'rabbit' },
  'baby monkey': { baby: '🐵', parent: 'monkey' },
}
export const G1_PARENTS = { hen: '🐔', dog: '🐕', cat: '🐈', cow: '🐄', pig: '🐖', horse: '🐎', rabbit: '🐇', monkey: '🐒' } as const
export type G1Parent = keyof typeof G1_PARENTS

export const G1_HELPS = { helpFeed: 'birdFeeds', helpWarm: 'henWarms', helpCarry: 'monkeyCarries' } as const

/** Living things and their pictures (the body-part cards). */
export const G1_LIVING = { turtle: '🐢', fish: '🐟', bird: '🐦', rabbit: '🐇', elephant: '🐘', cactus: '🌵', sunflower: '🌻', tulip: '🌷' } as const
export type Living = keyof typeof G1_LIVING
/** Each body part: the one living thing that answers it, and the wrong cards that never could. */
export const G1_PARTS: Record<'shell' | 'spines' | 'wings' | 'fins' | 'trunk' | 'ears', { right: Living; wrong: readonly Living[] }> = {
  shell: { right: 'turtle', wrong: ['fish', 'bird', 'rabbit', 'elephant'] },
  spines: { right: 'cactus', wrong: ['sunflower', 'tulip'] },
  wings: { right: 'bird', wrong: ['turtle', 'fish', 'rabbit', 'elephant'] },
  // (a turtle swims with flippers: never a wrong card here)
  fins: { right: 'fish', wrong: ['bird', 'rabbit', 'elephant'] },
  trunk: { right: 'elephant', wrong: ['rabbit', 'bird', 'turtle', 'fish'] },
  // (an elephant has big ears too: never a wrong card here)
  ears: { right: 'rabbit', wrong: ['turtle', 'fish', 'bird'] },
}
export type BodyPart = keyof typeof G1_PARTS

const line = (id: string): VoiceRef => ({ line: `g1-science/${id}` })
/** A question before its prompt (the prompt is what `speech` says). */
type Q = Omit<ListenProblem, 'prompt' | 'speech'> & { speech: VoiceRef }
const art = (name: string): Picture => ({ kind: 'art', name })
const emoji = (e: string): Picture => ({ kind: 'emoji', emoji: e })

const PRAISE: Record<G1ScienceMode, VoiceRef[]> = {
  lightSound: [line('greatLooking'), { line: 'k-science/scientist' }],
  sky: [line('skyScientist'), line('greatLooking')],
  families: [line('greatLooking'), { line: 'k-science/scientist' }],
}

const MODE_KINDS: Record<G1ScienceMode, G1ScienceKind[]> = {
  lightSound: ['dark', 'sound', 'stopSound', 'shadow', 'material'],
  sky: ['dayNight', 'seeSky', 'whenSee', 'sunMove', 'skyNext', 'season', 'nightThing', 'moonShape', 'skyPattern', 'seasonSee', 'seasonNext'],
  families: ['baby', 'helps', 'parts'],
}

/** The sky's kinds by how hard they are (a round takes two of each, easiest first). */
export const SKY_TIERS: readonly (readonly G1ScienceKind[])[] = [
  ['dayNight', 'seeSky', 'nightThing', 'moonShape'],
  ['whenSee', 'sunMove', 'seasonSee', 'skyPattern'],
  ['skyNext', 'season', 'seasonNext'],
]

/**
 * The stage's first questions, easiest first (then any of its kinds). A list
 * in a slot is a choice: one of those kinds not yet asked this round, so the
 * sky's eleven kinds share its rounds.
 */
const RAMP: Record<G1ScienceMode, (G1ScienceKind | readonly G1ScienceKind[])[]> = {
  lightSound: ['dark', 'sound', 'stopSound', 'shadow', 'material', 'material'],
  sky: [SKY_TIERS[0], SKY_TIERS[0], SKY_TIERS[1], SKY_TIERS[1], SKY_TIERS[2], SKY_TIERS[2]],
  families: ['baby', 'baby', 'helps', 'parts', 'helps', 'parts'],
}

const SKILL: Record<G1ScienceMode, { id: string; label: string }> = {
  lightSound: { id: 'g1-science-light-sound', label: 'light, shadows and sound' },
  sky: { id: 'g1-science-sky', label: 'the sun, the moon and the stars' },
  families: { id: 'g1-science-families', label: 'animal parents and babies' },
}

/** What makes a question the same question: what is said and shown, and its answer (not the cards' order). */
export const questionKey = (q: ListenProblem) => `${q.prompt}|${JSON.stringify(q.picture ?? null)}|${String(q.answer)}`

export function makeG1ScienceProvider(cfg: G1ScienceConfig): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode: G1ScienceMode = cfg.mode in MODE_KINDS ? cfg.mode : 'lightSound'
  const picker = makeKindPicker(MODE_KINDS[mode])
  const places = makePositionGuard()
  const instruments = makeDeck(G1_INSTRUMENTS)
  const lights = makeDeck(Object.keys(G1_LIGHTS) as (keyof typeof G1_LIGHTS)[])
  const shadowThings = makeDeck(G1_SHADOW_THINGS)
  const materialAsks = makeDeck(Object.keys(MATERIAL_ASK) as (keyof typeof MATERIAL_ASK)[])
  const sunAsks = makeDeck(G1_SUN_PLACES)
  const skyNow = makeDeck(Object.keys(G1_SKY_NEXT) as SkyTime[])
  const babies = makeDeck(G1_BABIES)
  const helpAsks = makeDeck(Object.keys(G1_HELPS) as (keyof typeof G1_HELPS)[])
  const parts = makeDeck(Object.keys(G1_PARTS) as BodyPart[])
  const dayNightThings = makeDeck(Object.keys(G1_DAY_NIGHT_THINGS) as DayNightThing[])
  const moons = makeDeck(G1_MOON_SHAPES)
  const seenSeasons = makeDeck(G1_SEASONS)
  const nowSeasons = makeDeck(G1_SEASONS)
  const flip = { dayNight: '', seeSky: '', whenSee: '', season: '', stop: '', pattern: '' }
  // this round's questions (what is said, shown and answered): none comes up twice
  const recent = makeRecent<string>()
  const kindsAsked: G1ScienceKind[] = []
  let asked = 0
  let serial = 0
  let lastSig = ''

  /** Take turns between two choices (a random first). */
  function turn<T extends string>(key: keyof typeof flip, a: T, b: T): T {
    const v = flip[key] === a ? b : flip[key] === b ? a : randInt(0, 1) ? a : b
    flip[key] = v
    return v
  }

  const skill = SKILL[mode]
  const base = (kind: G1ScienceKind, difficulty: number) => ({ id: `g1science-${serial++}`, topic: 'g1Science', subtopic: kind, difficulty, skill, praise: PRAISE[mode] })

  /** Cards in a fresh order (the answer never in one place three times running), with a note for each wrong one. */
  function cards<V extends string>(answer: V, wrong: readonly V[], card: (v: V) => PictureOption, note: (v: V) => VoiceRef | null) {
    const options = places.arrange([answer, ...wrong], answer)
    const at = options.indexOf(answer)
    if (places.wouldRepeat(at)) {
      const j = (at + 1) % options.length
      ;[options[at], options[j]] = [options[j], options[at]]
    }
    return { options, answer, pictureOptions: options.map(card), notes: options.map((v) => (v === answer ? null : note(v))) }
  }

  // ── light and sound ──

  function dark(): Q {
    const right = lights.next()
    const wrong = shuffle(Object.keys(G1_NO_LIGHTS) as (keyof typeof G1_NO_LIGHTS)[]).slice(0, 2)
    const pic = (v: string) => (v in G1_LIGHTS ? G1_LIGHTS[v as keyof typeof G1_LIGHTS] : G1_NO_LIGHTS[v as keyof typeof G1_NO_LIGHTS])
    const c = cards<string>(right, wrong, (v) => ({ value: v, picture: emoji(pic(v)), speech: line(v) }), () => line('noLight'))
    return { ...base('dark', 1), ...c, speech: line('darkHelp'), picture: art('roomDark'), nameCards: true, cues: [{ target: 'picture' }, { target: 'cards', cue: 'What' }], walkthrough: 'none' }
  }

  function sound(): Q {
    const right = instruments.next()
    const wrong = G1_INSTRUMENTS.filter((x) => x !== right)
    const name = (v: string) => line(`name-${G1_INSTRUMENTS.find((x) => v.startsWith(x))}`)
    const c = cards<string>(soundArt(right, true), wrong.map((x) => soundArt(x, false)), (v) => ({ value: v, picture: art(v), speech: name(v) }), () => line('stillNote'))
    return { ...base('sound', 1), ...c, speech: line('whichSound'), cues: [{ target: 'cards' }], walkthrough: 'none' }
  }

  function stopSound(): Q {
    const x = instruments.next()
    const how = (v: string) => line(v.endsWith('Hold') ? 'holdIt' : v.endsWith('Pluck') ? 'pluckIt' : 'hitIt')
    const c = cards<string>(stopArt(x, true), [stopArt(x, false)], (v) => ({ value: v, picture: art(v), speech: how(v) }), () => line(x === 'guitar' ? 'pluckNote' : 'hitNote'))
    return { ...base('stopSound', 2), ...c, speech: line(`stop-${x}`), picture: art(soundArt(x, true)), cues: [{ target: 'picture' }, { target: 'cards', cue: 'How' }], walkthrough: 'none' }
  }

  function shadow(): Q {
    const thing = shadowThings.next()
    const sun = randInt(0, 1) ? 'L' : 'R'
    const c = cards<string>(shadowArt(thing, sun, 'away'), [shadowArt(thing, sun, 'toward'), shadowArt(thing, sun, 'none')], (v) => ({ value: v, picture: art(v), speech: line('thisOne') }), (v) => line(v.endsWith('none') ? 'shadowBlock' : 'shadowSide'))
    return { ...base('shadow', 2), ...c, speech: line(`shadow-${thing}`), cues: [{ target: 'cards' }], walkthrough: 'none' }
  }

  function material(): Q {
    const ask = materialAsks.next()
    const right = MATERIAL_ASK[ask]
    const c = cards<Material>(right, G1_MATERIALS.filter((m) => m !== right), (v) => ({ value: v, picture: art(v), speech: line(v) }), (v) => line(`note-${v}`))
    return { ...base('material', 3), ...c, speech: line(ask), nameCards: true, cues: [{ target: 'cards' }], walkthrough: 'none' }
  }

  // ── the sky ──

  function dayNight(): Q {
    const want = turn('dayNight', 'night', 'day')
    const c = cards<string>(want, [want === 'day' ? 'night' : 'day'], (v) => ({ value: v, picture: art(`${v}Sky`), speech: line(v) }), (v) => line(`note-${v}`))
    return { ...base('dayNight', 1), ...c, speech: line(want === 'night' ? 'tapNight' : 'tapDay'), cues: [{ target: 'cards' }], walkthrough: 'none' }
  }

  function seeSky(): Q {
    const when = turn('seeSky', 'night', 'day')
    // by night the moon or the stars (never the sun); by day the sun (never the stars; never the moon as a wrong card: it can be up)
    const right = when === 'night' ? pickOne(['moon', 'stars'] as const) : 'sun'
    const wrong = when === 'night' ? 'sun' : 'stars'
    const c = cards<string>(right, [wrong], (v) => ({ value: v, picture: emoji(SKY[v as keyof typeof SKY]), speech: line(v) }), (v) => line(`note-${v}`))
    return { ...base('seeSky', 1), ...c, speech: line(when === 'night' ? 'seeNight' : 'seeDay'), picture: art(`${when}Sky`), nameCards: true, cues: [{ target: 'picture' }, { target: 'cards', cue: 'What' }], walkthrough: 'none' }
  }

  function whenSee(): Q {
    const what = turn('whenSee', 'stars', 'sun')
    const right = what === 'stars' ? 'night' : 'day'
    const c = cards<string>(right, [right === 'day' ? 'night' : 'day'], (v) => ({ value: v, picture: art(`${v}Sky`), speech: line(v) }), () => line(`note-${what}`))
    return { ...base('whenSee', 2), ...c, speech: line(what === 'stars' ? 'whenStars' : 'whenSun'), picture: emoji(SKY[what]), cues: [{ target: 'picture' }, { target: 'cards', cue: 'When' }], walkthrough: 'none' }
  }

  function sunMove(): Q {
    const want = sunAsks.next()
    const c = cards<SunPlace>(want, G1_SUN_PLACES.filter((s) => s !== want), (v) => ({ value: v, picture: art(v), speech: line(`say-${v}`) }), (v) => line(`note-${v}`))
    return { ...base('sunMove', 2), ...c, speech: line(want), cues: [{ target: 'cards', cue: 'Tap' }], walkthrough: 'none' }
  }

  function skyNext(): Q {
    const now = skyNow.next()
    const right = G1_SKY_NEXT[now]
    const wrong = (Object.keys(G1_SKY_NEXT) as SkyTime[]).filter((v) => v !== now && v !== right)
    const say = (v: SkyTime) => line(v === 'nightSky' ? 'night' : `say-${v}`)
    const c = cards<SkyTime>(right, wrong, (v) => ({ value: v, picture: art(v), speech: say(v) }), () => line('dayPattern'))
    return { ...base('skyNext', 3), ...c, speech: line(`next-${now}`), picture: art(now), cues: [{ target: 'picture' }, { target: 'cards', cue: 'What' }], walkthrough: 'none' }
  }

  function season(): Q {
    const ask = turn('season', 'moreLight', 'darkEarly')
    const right = ask === 'moreLight' ? 'summer' : 'winter'
    const c = cards<string>(right, [right === 'summer' ? 'winter' : 'summer'], (v) => ({ value: v, picture: art(v), speech: line(v) }), (v) => line(`note-${v}`))
    return { ...base('season', 3), ...c, speech: line(ask), nameCards: true, cues: [{ target: 'cards' }], walkthrough: 'none' }
  }

  function nightThing(): Q {
    const thing = dayNightThings.next()
    const right = G1_DAY_NIGHT_THINGS[thing].when
    const c = cards<string>(right, [right === 'day' ? 'night' : 'day'], (v) => ({ value: v, picture: art(`${v}Sky`), speech: line(v) }), () => line(`when-${thing}`))
    return { ...base('nightThing', 1), ...c, speech: line(`up-${thing}`), picture: emoji(G1_DAY_NIGHT_THINGS[thing].emoji), cues: [{ target: 'picture' }, { target: 'cards', cue: 'Is it' }], walkthrough: 'none' }
  }

  function moonShape(): Q {
    const want = moons.next()
    const c = cards<MoonShape>(want, G1_MOON_SHAPES.filter((m) => m !== want), (v) => ({ value: v, picture: art(v), speech: line(`say-${v}`) }), (v) => line(`note-${v}`))
    return { ...base('moonShape', 1), ...c, speech: line(want), cues: [{ target: 'cards', cue: 'Tap' }], walkthrough: 'none' }
  }

  function skyPattern(): Q {
    const strip = turn('pattern', 'patternSunMoon', 'patternMoonSun')
    const right = G1_SKY_PATTERNS[strip]
    const c = cards<string>(right, [right === 'day' ? 'night' : 'day'], (v) => ({ value: v, picture: art(`${v}Sky`), speech: line(v) }), () => line('note-pattern'))
    return { ...base('skyPattern', 2), ...c, speech: line(strip), picture: art(strip), cues: [{ target: 'picture' }, { target: 'cards', cue: 'What' }], walkthrough: 'none' }
  }

  function seasonSee(): Q {
    const now = seenSeasons.next()
    const c = cards<Season>(now, [SEASON_OPPOSITE[now]], (v) => ({ value: v, picture: emoji(SEASON_PICS[v]), speech: line(`thing-${v}`) }), (v) => line(`seen-${v}`))
    return { ...base('seasonSee', 2), ...c, speech: line(`see-${now}`), nameCards: true, cues: [{ target: 'cards' }], walkthrough: 'none' }
  }

  function seasonNext(): Q {
    const now = nowSeasons.next()
    const right = nextSeason(now)
    const c = cards<Season>(right, G1_SEASONS.filter((x) => x !== now && x !== right), (v) => ({ value: v, picture: emoji(SEASON_PICS[v]), speech: line(v) }), () => line('seasonPattern'))
    return { ...base('seasonNext', 3), ...c, speech: line(`afterSeason-${now}`), picture: emoji(SEASON_PICS[now]), nameCards: true, cues: [{ target: 'picture' }, { target: 'cards', cue: 'Which' }], walkthrough: 'none' }
  }

  // ── animal families ──

  function baby(): Q {
    const b = babies.next()
    const f = G1_FAMILIES[b]
    const wrong = shuffle((Object.keys(G1_PARENTS) as G1Parent[]).filter((p) => p !== f.parent)).slice(0, 2)
    const c = cards<G1Parent>(f.parent, wrong, (v) => ({ value: v, picture: emoji(G1_PARENTS[v]), speech: line(v) }), () => line(`grows-${b.replace(/ /g, '-')}`))
    return { ...base('baby', 1), ...c, speech: { template: 'g1-science/baby', slots: { baby: b } }, picture: emoji(f.baby), nameCards: true, cues: [{ target: 'picture' }, { target: 'cards', cue: 'Tap' }], walkthrough: 'none' }
  }

  function helps(): Q {
    const ask = helpAsks.next()
    const right = G1_HELPS[ask]
    const all = Object.values(G1_HELPS)
    const c = cards<string>(right, all.filter((h) => h !== right), (v) => ({ value: v, picture: art(v), speech: line(`say-${v}`) }), (v) => line(`does-${v}`))
    return { ...base('helps', 2), ...c, speech: line(ask), cues: [{ target: 'cards' }], walkthrough: 'none' }
  }

  function bodyPart(): Q {
    const part = parts.next()
    const p = G1_PARTS[part]
    const c = cards<Living>(p.right, shuffle(p.wrong).slice(0, 2), (v) => ({ value: v, picture: emoji(G1_LIVING[v]), speech: line(v) }), (v) => line(`has-${v}`))
    return { ...base('parts', 3), ...c, speech: line(`part-${part}`), nameCards: true, cues: [{ target: 'cards' }], walkthrough: 'none' }
  }

  function make(kind: G1ScienceKind): Q {
    switch (kind) {
      case 'dark':
        return dark()
      case 'sound':
        return sound()
      case 'stopSound':
        return stopSound()
      case 'shadow':
        return shadow()
      case 'material':
        return material()
      case 'dayNight':
        return dayNight()
      case 'seeSky':
        return seeSky()
      case 'whenSee':
        return whenSee()
      case 'sunMove':
        return sunMove()
      case 'skyNext':
        return skyNext()
      case 'season':
        return season()
      case 'nightThing':
        return nightThing()
      case 'moonShape':
        return moonShape()
      case 'skyPattern':
        return skyPattern()
      case 'seasonSee':
        return seasonSee()
      case 'seasonNext':
        return seasonNext()
      case 'baby':
        return baby()
      case 'helps':
        return helps()
      case 'parts':
        return bodyPart()
    }
  }

  return {
    topic: 'g1Science',
    reset() {
      asked = 0
      serial = 0
      lastSig = ''
      for (const k of Object.keys(flip) as (keyof typeof flip)[]) flip[k] = ''
      recent.clear()
      kindsAsked.length = 0
      picker.reset()
      places.reset()
      for (const d of [instruments, lights, shadowThings, materialAsks, sunAsks, skyNow, babies, helpAsks, parts, dayNightThings, moons, seenSeasons, nowSeasons]) d.reset()
    },
    next(): ListenProblem {
      const ramp = RAMP[mode]
      const slot = asked < ramp.length ? ramp[asked] : null
      // (a choice of kinds: one this round hasn't asked yet)
      const planned = slot === null ? null : typeof slot === 'string' ? slot : pickOne(slot, kindsAsked)
      asked++
      // never the same question twice in a row, nor twice in a round
      for (let tries = 0; ; tries++) {
        const kind = planned ?? picker.next()
        const q = make(kind)
        // (the prompt is what is said: the two never drift apart)
        const p: ListenProblem = { ...q, prompt: voiceText(q.speech) }
        const sig = `${p.prompt}|${JSON.stringify(p.picture ?? null)}|${JSON.stringify(p.options)}`
        const key = questionKey(p)
        if ((sig !== lastSig && !recent.has(key)) || tries >= 12) {
          lastSig = sig
          recent.add(key)
          kindsAsked.push(kind)
          places.note(p.options.indexOf(p.answer))
          return p
        }
      }
    },
  }
}
