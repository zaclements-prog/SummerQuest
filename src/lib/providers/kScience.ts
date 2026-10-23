import type { Picture, PictureOption, ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { K_HOME_ANIMALS, K_HUNGRY_ANIMALS, K_THIRSTY_ANIMALS } from '../../voice/packs/k-science'
import type { VoiceRef } from '../../voice/types'
import { randInt, shuffle } from '../random'
import { makeDeck, makeKindPicker, makePositionGuard, pickOne } from './kShared'

/**
 * Nature Summit (Science Summit for K–1), voice-first, for the Listen & Play
 * shell. Every card is a picture, named as it lights up (`nameCards`); a
 * wrong pick hears a line about the card it picked, then tries again.
 *
 * - `weather` (k-science-1, K-ESS2): "Tap the rainy day." (weather pictures),
 *   then "It is raining. What do you need?" (an umbrella; sunglasses, a kite…).
 *   The wrong cards are only ever gear for another weather, and never gear
 *   that could be argued for this one (no umbrella on a hot sunny day: it
 *   could be a sunshade; no mittens on a cold rainy one).
 * - `needs` (k-science-2, K-LS1): "What does a plant need to grow?" (the sun
 *   or water, beside things no living thing needs: a ball, a shoe…), then an
 *   animal that is hungry (its food), thirsty (water), or needs a home (the
 *   ocean, a tree, the desert or a house: one right, the others never its home).
 * - `pushPull` (k-science-3, K-PS2): a child at a swing, a door, a wagon…
 *   "Push or pull?" (the push and pull icons, always in that order); "Tap the
 *   push!" (two of the actions); "Which push makes the ball go far?" (a big
 *   push or a little push).
 *
 * Every stage starts easy: the weather names before what to wear; plants
 * before animals; push or pull before choosing between two actions and the
 * big / little push. The pictures are drawings (`art`, src/games/listenPlay/
 * drawings.tsx) or emoji every Android tablet draws (Unicode 9 or older).
 */

export type KScienceMode = 'weather' | 'needs' | 'pushPull'
export type KScienceKind = 'whichWeather' | 'wear' | 'plant' | 'food' | 'drink' | 'home' | 'pushOrPull' | 'tapAction' | 'strength'

export interface KScienceConfig {
  mode: KScienceMode
}

// ── the weather ──────────────────────────────────────────────────────────────

export const K_WEATHERS = ['sunny', 'rainy', 'snowy', 'windy'] as const
export type KWeather = (typeof K_WEATHERS)[number]

/** What to wear or bring, and the one weather each is for. */
export const K_GEAR = {
  sunglasses: 'sunny',
  sunHat: 'sunny',
  umbrella: 'rainy',
  mittens: 'snowy',
  warmHat: 'snowy',
  scarf: 'snowy',
  kite: 'windy',
} as const satisfies Record<string, KWeather>
export type KGear = keyof typeof K_GEAR

/** Gear that could be argued for a weather it isn't for: never a wrong card on that weather's question. */
export const K_GEAR_ARGUABLE: Record<KWeather, readonly KGear[]> = {
  sunny: ['umbrella', 'kite'], // a sunshade; a kite flies on a sunny day too
  rainy: ['mittens', 'warmHat', 'scarf'], // a rainy day can be cold
  snowy: ['umbrella', 'kite'],
  windy: ['umbrella', 'sunHat'], // "What can you fly?": both can blow away
}

// ── what living things need ──────────────────────────────────────────────────

/** Things no plant or animal needs (the wrong cards beside food, water, the sun). */
export const K_NOT_NEEDED = { ball: '⚽', shoe: '👟', guitar: '🎸', car: '🚗', balloon: '🎈' } as const
export type KNotNeeded = keyof typeof K_NOT_NEEDED

export const K_PLANT_EMOJI = '🌱'
export const K_SUN_EMOJI = '☀️'
export const K_WATER_EMOJI = '💧'

/** Each hungry animal, its picture, and its food (with the food's name line). */
export const K_FOOD: Record<(typeof K_HUNGRY_ANIMALS)[number], { animal: string; food: string; name: string }> = {
  rabbit: { animal: '🐰', food: '🥕', name: 'carrot' },
  monkey: { animal: '🐵', food: '🍌', name: 'banana' },
  mouse: { animal: '🐭', food: '🧀', name: 'cheese' },
  bear: { animal: '🐻', food: '🍯', name: 'honey' },
  horse: { animal: '🐴', food: '🍎', name: 'apple' },
  squirrel: { animal: '🐿️', food: '🌰', name: 'nut' },
}

export const K_THIRSTY_EMOJI: Record<(typeof K_THIRSTY_ANIMALS)[number], string> = {
  dog: '🐶',
  cat: '🐱',
  cow: '🐮',
  elephant: '🐘',
  lion: '🦁',
  pig: '🐷',
}

export const K_HOMES = { ocean: '🌊', tree: '🌳', desert: '🏜️', house: '🏠' } as const
export type KHome = keyof typeof K_HOMES

/** Each animal's one home, and homes it could be argued to have (never a wrong card for it). */
export const K_HOME_OF: Record<(typeof K_HOME_ANIMALS)[number], { animal: string; home: KHome; arguable: readonly KHome[] }> = {
  fish: { animal: '🐠', home: 'ocean', arguable: ['house'] }, // a goldfish bowl
  octopus: { animal: '🐙', home: 'ocean', arguable: [] },
  bird: { animal: '🐦', home: 'tree', arguable: ['house'] }, // a birdhouse, a pet bird
  monkey: { animal: '🐵', home: 'tree', arguable: [] },
  camel: { animal: '🐫', home: 'desert', arguable: [] },
  dog: { animal: '🐶', home: 'house', arguable: [] },
}

// ── push and pull ────────────────────────────────────────────────────────────

/** The actions (each a drawing of the same name) and whether each is a push or a pull. */
export const K_ACTIONS = {
  swing: 'push',
  door: 'push',
  kick: 'push',
  cart: 'push',
  wagon: 'pull',
  drawer: 'pull',
  kiteString: 'pull',
  carrot: 'pull',
} as const satisfies Record<string, 'push' | 'pull'>
export type KAction = keyof typeof K_ACTIONS

const line = (id: string): VoiceRef => ({ line: `k-science/${id}` })
const art = (name: string): Picture => ({ kind: 'art', name })
const emoji = (e: string): Picture => ({ kind: 'emoji', emoji: e })

const PRAISE: VoiceRef[] = [line('greatThinking'), line('scientist')]

const MODE_KINDS: Record<KScienceMode, KScienceKind[]> = {
  weather: ['whichWeather', 'wear'],
  needs: ['plant', 'food', 'drink', 'home'],
  pushPull: ['pushOrPull', 'tapAction', 'strength'],
}

/** The stage's first questions, easiest first (then any of its kinds). */
const RAMP: Record<KScienceMode, KScienceKind[]> = {
  weather: ['whichWeather', 'whichWeather', 'wear', 'wear', 'wear'],
  needs: ['plant', 'plant', 'food', 'drink', 'home'],
  pushPull: ['pushOrPull', 'pushOrPull', 'pushOrPull', 'tapAction', 'tapAction', 'strength'],
}

const SKILL: Record<KScienceMode, { id: string; label: string }> = {
  weather: { id: 'k-science-weather', label: 'weather and what to wear' },
  needs: { id: 'k-science-needs', label: 'what plants and animals need' },
  pushPull: { id: 'k-science-push', label: 'pushes and pulls' },
}

export function makeKScienceProvider(cfg: KScienceConfig): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode: KScienceMode = cfg.mode in MODE_KINDS ? cfg.mode : 'weather'
  const picker = makeKindPicker(MODE_KINDS[mode])
  const places = makePositionGuard()
  const weathers = makeDeck(K_WEATHERS)
  // ("what will you wear?" deals its own weathers: a round never asks it twice about one weather while others are left)
  const wearWeathers = makeDeck(K_WEATHERS)
  const hungry = makeDeck(K_HUNGRY_ANIMALS)
  const thirsty = makeDeck(K_THIRSTY_ANIMALS)
  const homes = makeDeck(K_HOME_ANIMALS)
  const actions = makeDeck(Object.keys(K_ACTIONS) as KAction[])
  let asked = 0
  let serial = 0
  let lastSig = ''
  let lastPlant: 'sun' | 'water' | '' = ''
  let lastStrength: 'far' | 'near' | '' = ''
  let lastTap: 'push' | 'pull' | '' = ''

  /** The next action from the deck that is a push (or a pull): the deck's pick when it has one, else any such action. */
  function nextAction(kind: 'push' | 'pull' | null, avoid?: KAction): KAction {
    const x = actions.next((a) => (!kind || K_ACTIONS[a] === kind) && a !== avoid)
    if ((!kind || K_ACTIONS[x] === kind) && x !== avoid) return x
    return pickOne((Object.keys(K_ACTIONS) as KAction[]).filter((a) => K_ACTIONS[a] === kind && a !== avoid))
  }

  const skill = SKILL[mode]
  const base = (kind: KScienceKind, difficulty: number) => ({ id: `kscience-${serial++}`, topic: 'kScience', subtopic: kind, difficulty, skill, praise: PRAISE })

  /** Cards in a fresh order (the answer never in one place three times running), with the notes for each wrong one. */
  function cards<V extends string>(answer: V, wrong: readonly V[], card: (v: V) => PictureOption, note: (v: V) => VoiceRef | null) {
    const options = places.arrange([answer, ...wrong], answer)
    // (when the reshuffles keep landing the answer in the same place, it moves along one)
    const at = options.indexOf(answer)
    if (places.wouldRepeat(at)) {
      const j = (at + 1) % options.length
      ;[options[at], options[j]] = [options[j], options[at]]
    }
    return {
      options,
      answer,
      pictureOptions: options.map(card),
      notes: options.map((v) => (v === answer ? null : note(v))),
    }
  }

  function whichWeather(): ListenProblem {
    const w = weathers.next()
    const others = shuffle(K_WEATHERS.filter((x) => x !== w)).slice(0, 2)
    const c = cards<KWeather>(w, others, (v) => ({ value: v, picture: art(v), speech: line(v) }), (v) => line(`is-${v}`))
    return {
      ...base('whichWeather', 1),
      prompt: `Tap the ${w} day.`,
      ...c,
      speech: line(`tap-${w}`),
      nameCards: true,
      cues: [{ target: 'cards' }],
      walkthrough: 'none',
    }
  }

  function wear(): ListenProblem {
    const w = wearWeathers.next()
    const right = (Object.keys(K_GEAR) as KGear[]).filter((g) => K_GEAR[g] === w)
    const answer = pickOne(right)
    const wrongPool = (Object.keys(K_GEAR) as KGear[]).filter((g) => K_GEAR[g] !== w && !K_GEAR_ARGUABLE[w].includes(g))
    // two wrong cards, for two different weathers where there are two
    const first = pickOne(wrongPool)
    const second = pickOne(wrongPool.filter((g) => g !== first && K_GEAR[g] !== K_GEAR[first]).length ? wrongPool.filter((g) => g !== first && K_GEAR[g] !== K_GEAR[first]) : wrongPool.filter((g) => g !== first))
    const c = cards<KGear>(answer, [first, second], (v) => ({ value: v, picture: art(v), speech: line(v) }), (v) => line(`for-${v}`))
    const said = line(`wear-${w}`)
    return {
      ...base('wear', 2),
      prompt: WEAR_PROMPT[w],
      ...c,
      speech: said,
      picture: art(w),
      nameCards: true,
      cues: [{ target: 'picture' }, { target: 'cards', cue: 'What' }],
      walkthrough: 'none',
    }
  }

  const notNeeded = (n: number) => shuffle(Object.keys(K_NOT_NEEDED) as KNotNeeded[]).slice(0, n)
  const notNeededCard = (v: string): PictureOption => ({ value: v, picture: emoji(K_NOT_NEEDED[v as KNotNeeded]), speech: line(v) })

  function plant(): ListenProblem {
    const need: 'sun' | 'water' = lastPlant === 'sun' ? 'water' : lastPlant === 'water' ? 'sun' : randInt(0, 1) ? 'sun' : 'water'
    lastPlant = need
    const c = cards<string>(
      need,
      notNeeded(2),
      (v) => (v === 'sun' ? { value: v, picture: emoji(K_SUN_EMOJI), speech: line('sun') } : v === 'water' ? { value: v, picture: emoji(K_WATER_EMOJI), speech: line('water') } : notNeededCard(v)),
      () => line('plantNote'),
    )
    return {
      ...base('plant', 1),
      prompt: 'What does a plant need to grow?',
      ...c,
      speech: line('plantNeeds'),
      picture: emoji(K_PLANT_EMOJI),
      nameCards: true,
      cues: [{ target: 'picture' }, { target: 'cards', cue: 'need' }],
      walkthrough: 'none',
    }
  }

  function food(): ListenProblem {
    const a = hungry.next()
    const f = K_FOOD[a]
    const c = cards<string>(f.name, notNeeded(2), (v) => (v === f.name ? { value: v, picture: emoji(f.food), speech: line(f.name) } : notNeededCard(v)), () => line(`eats-${a}`))
    return {
      ...base('food', 2),
      prompt: `The ${a} is hungry. What does it need?`,
      ...c,
      speech: { template: 'k-science/hungry', slots: { animal: a } },
      picture: emoji(f.animal),
      nameCards: true,
      cues: [{ target: 'picture' }, { target: 'cards', cue: 'What' }],
      walkthrough: 'none',
    }
  }

  function drink(): ListenProblem {
    const a = thirsty.next()
    const c = cards<string>('water', notNeeded(2), (v) => (v === 'water' ? { value: v, picture: emoji(K_WATER_EMOJI), speech: line('water') } : notNeededCard(v)), () => line('drinkNote'))
    return {
      ...base('drink', 2),
      prompt: `The ${a} is thirsty. What does it need?`,
      ...c,
      speech: { template: 'k-science/thirsty', slots: { animal: a } },
      picture: emoji(K_THIRSTY_EMOJI[a]),
      nameCards: true,
      cues: [{ target: 'picture' }, { target: 'cards', cue: 'What' }],
      walkthrough: 'none',
    }
  }

  function home(): ListenProblem {
    const a = homes.next()
    const h = K_HOME_OF[a]
    const wrong = shuffle((Object.keys(K_HOMES) as KHome[]).filter((x) => x !== h.home && !h.arguable.includes(x))).slice(0, 2)
    const c = cards<KHome>(h.home, wrong, (v) => ({ value: v, picture: emoji(K_HOMES[v]), speech: line(v) }), () => line(`lives-${a}`))
    return {
      ...base('home', 3),
      prompt: `The ${a} needs a home. Where does it live?`,
      ...c,
      speech: { template: 'k-science/home', slots: { animal: a } },
      picture: emoji(h.animal),
      nameCards: true,
      cues: [{ target: 'picture' }, { target: 'cards', cue: 'Where' }],
      walkthrough: 'none',
    }
  }

  /** "Look at the swing. Push or pull?" — the push and pull icons, always in that order (as they're said). */
  function pushOrPull(): ListenProblem {
    // the answer is the push card (0) or the pull card (1): never in one place three times running
    const want: 'push' | 'pull' | null = places.wouldRepeat(0) ? 'pull' : places.wouldRepeat(1) ? 'push' : null
    const act = nextAction(want)
    const answer = K_ACTIONS[act]
    const options = ['push', 'pull']
    return {
      ...base('pushOrPull', 1),
      prompt: `Look at the ${ACTION_WORD[act]}. Push or pull?`,
      options,
      answer,
      pictureOptions: [
        { value: 'push', picture: art('pushIcon'), speech: line('push') },
        { value: 'pull', picture: art('pullIcon'), speech: line('pull') },
      ],
      notes: options.map((v) => (v === answer ? null : line(`why-${act}`))),
      speech: line(`pp-${act}`),
      picture: art(act),
      nameCards: true,
      cues: [{ target: 'picture' }, { target: 'cards', cue: 'Push' }],
      walkthrough: 'none',
    }
  }

  /** "Tap the push!" — two actions, one a push and one a pull. */
  function tapAction(): ListenProblem {
    const want: 'push' | 'pull' = lastTap === 'push' ? 'pull' : lastTap === 'pull' ? 'push' : randInt(0, 1) ? 'push' : 'pull'
    lastTap = want
    const right = nextAction(want)
    const other = nextAction(want === 'push' ? 'pull' : 'push', right)
    const c = cards<KAction>(right, [other], (v) => ({ value: v, picture: art(v), speech: line(`name-${v}`) }), (v) => line(`why-${v}`))
    return {
      ...base('tapAction', 2),
      prompt: want === 'push' ? 'Tap the push!' : 'Tap the pull!',
      ...c,
      speech: line(want === 'push' ? 'tapPush' : 'tapPull'),
      nameCards: true,
      cues: [{ target: 'cards' }],
      walkthrough: 'none',
    }
  }

  /** "Which push makes the ball go far?" — a big push or a little push. */
  function strength(): ListenProblem {
    const ask: 'far' | 'near' = lastStrength === 'far' ? 'near' : lastStrength === 'near' ? 'far' : randInt(0, 1) ? 'far' : 'near'
    lastStrength = ask
    const answer = ask === 'far' ? 'bigPush' : 'littlePush'
    const c = cards<string>(answer, [answer === 'bigPush' ? 'littlePush' : 'bigPush'], (v) => ({ value: v, picture: art(v), speech: line(v) }), (v) => line(v === 'bigPush' ? 'bigNote' : 'littleNote'))
    return {
      ...base('strength', 3),
      prompt: ask === 'far' ? 'Which push makes the ball go far?' : 'Which push makes the ball go a little way?',
      ...c,
      speech: line(ask),
      nameCards: true,
      cues: [{ target: 'cards' }],
      walkthrough: 'none',
    }
  }

  function make(kind: KScienceKind): ListenProblem {
    switch (kind) {
      case 'whichWeather':
        return whichWeather()
      case 'wear':
        return wear()
      case 'plant':
        return plant()
      case 'food':
        return food()
      case 'drink':
        return drink()
      case 'home':
        return home()
      case 'pushOrPull':
        return pushOrPull()
      case 'tapAction':
        return tapAction()
      case 'strength':
        return strength()
    }
  }

  return {
    topic: 'kScience',
    reset() {
      asked = 0
      serial = 0
      lastSig = ''
      lastPlant = ''
      lastStrength = ''
      lastTap = ''
      picker.reset()
      places.reset()
      for (const d of [weathers, wearWeathers, hungry, thirsty, homes, actions]) d.reset()
    },
    next(): ListenProblem {
      const ramp = RAMP[mode]
      const planned = asked < ramp.length ? ramp[asked] : null
      asked++
      // never the same question twice in a row
      for (let tries = 0; ; tries++) {
        const p = make(planned ?? picker.next())
        const sig = `${p.prompt}|${JSON.stringify(p.picture ?? null)}|${JSON.stringify(p.options)}`
        if (sig !== lastSig || tries >= 8) {
          lastSig = sig
          places.note(p.options.indexOf(p.answer))
          return p
        }
      }
    },
  }
}

const WEAR_PROMPT: Record<KWeather, string> = {
  sunny: 'It is sunny and hot. What will you wear?',
  rainy: 'It is raining. What do you need?',
  snowy: 'It is snowing. What will you wear?',
  windy: 'It is windy. What can you fly?',
}

/** The word each action's question looks at ("Look at the kite."). */
const ACTION_WORD: Record<KAction, string> = {
  swing: 'swing',
  door: 'door',
  kick: 'ball',
  cart: 'cart',
  wagon: 'wagon',
  drawer: 'drawer',
  kiteString: 'kite',
  carrot: 'carrot',
}
