import { defineVoicePack } from '../types'

/*
 * ⚠ PHONICS LINES: OWNER'S LISTENING PASS (K–5 plan §3, "Phonics is the hard case").
 *
 * Every line in this pack built from `K_DRUM_PARTS` or `K_BLEND_SOUNDS` is a
 * RECORDING SCRIPT: it is spelled the way a teacher-voice TTS should read it,
 * not the way the word is written ("Tie… gur" for ti-ger, "Kuh… at" for
 * c-at). Before these clips ship, listen to each one (`parts-*`, `blend-*`,
 * `that-*`) and re-spell or re-record any that come out wrong:
 *
 * - stretchy first sounds (m, s, f, l, n, r, sh) are written long ("Mmmm",
 *   "Ssss", "Shhhh") and should sound held, with no vowel after them;
 * - stop sounds (c/k, d, p, b, g, t) can't be held: they are written with a
 *   short "uh" ("Kuh", "Duh") that should be as short as the voice allows;
 *   these are the likeliest to need the owner's own recording;
 * - word parts are respelled so each part reads one way ("Peet… zuh" for
 *   pizza, "Tuh… may… toe" for tomato).
 */

/**
 * "Clap the parts" (RF.K.2b): words of one to three parts, each a picture
 * every Android tablet draws (emoji with the provider). The parts are the
 * recording script for the help line ("Tie… gur."), said as the drum is
 * tapped once per part; a one-part word is just the word.
 */
export const K_DRUM_PARTS = {
  // one part
  cat: ['Cat'],
  dog: ['Dog'],
  sun: ['Sun'],
  fish: ['Fish'],
  frog: ['Frog'],
  bee: ['Bee'],
  tree: ['Tree'],
  car: ['Car'],
  star: ['Star'],
  moon: ['Moon'],
  house: ['House'],
  cake: ['Cake'],
  snake: ['Snake'],
  goat: ['Goat'],
  boat: ['Boat'],
  fox: ['Fox'],
  ring: ['Ring'],
  bell: ['Bell'],
  duck: ['Duck'],
  bus: ['Bus'],
  hat: ['Hat'],
  ball: ['Ball'],
  pig: ['Pig'],
  train: ['Train'],
  shoe: ['Shoe'],
  clock: ['Clock'],
  bed: ['Bed'],
  nose: ['Nose'],
  bear: ['Bear'],
  key: ['Key'],
  // two parts
  tiger: ['Tie', 'gur'],
  monkey: ['Mun', 'kee'],
  rabbit: ['Rab', 'bit'],
  pizza: ['Peet', 'zuh'],
  apple: ['Ap', 'pull'],
  lemon: ['Lem', 'un'],
  rocket: ['Rock', 'it'],
  robot: ['Roe', 'bot'],
  rainbow: ['Rain', 'boe'],
  penguin: ['Pen', 'gwin'],
  turtle: ['Tur', 'tull'],
  spider: ['Spy', 'der'],
  carrot: ['Care', 'ut'],
  cookie: ['Cook', 'ee'],
  donut: ['Doe', 'nut'],
  pumpkin: ['Pump', 'kin'],
  candy: ['Can', 'dee'],
  lion: ['Lie', 'un'],
  panda: ['Pan', 'duh'],
  balloon: ['Buh', 'loon'],
  popcorn: ['Pop', 'corn'],
  snowman: ['Snow', 'man'],
  honey: ['Hun', 'ee'],
  // three parts
  banana: ['Buh', 'nan', 'uh'],
  octopus: ['Ock', 'tuh', 'puss'],
  elephant: ['El', 'uh', 'fint'],
  butterfly: ['But', 'ter', 'fly'],
  tomato: ['Tuh', 'may', 'toe'],
  pineapple: ['Pine', 'ap', 'pull'],
  potato: ['Puh', 'tay', 'toe'],
  strawberry: ['Straw', 'bair', 'ee'],
  gorilla: ['Guh', 'rill', 'uh'],
  umbrella: ['Um', 'brell', 'uh'],
  ladybug: ['Lay', 'dee', 'bug'],
  bicycle: ['Buy', 'sick', 'ull'],
  lollipop: ['Lol', 'ee', 'pop'],
  volcano: ['Vol', 'kay', 'no'],
  violin: ['Vie', 'oh', 'lin'],
} as const satisfies Record<string, readonly string[]>

export type KDrumWord = keyof typeof K_DRUM_PARTS
export const K_DRUM_WORDS = Object.keys(K_DRUM_PARTS) as KDrumWord[]

/** How the help line says a word's parts: "Tie… gur." (one part: "Cat."). */
export const partsText = (parts: readonly string[]) => `${parts.join('… ')}.`

/**
 * "Sound it out" (RF.K.2c, onset and rime): a word said as its first sound,
 * held, then the rest ("Mmmm… oon"). `onset` is the sound's key (the
 * provider orders by it); `say` and `rest` are the recording script. Sounds
 * you can stretch come first in the stage; stop sounds, later.
 */
export const K_BLEND_SOUNDS = {
  // stretchy first sounds
  moon: { onset: 'm', say: 'Mmmm', rest: 'oon' },
  mouse: { onset: 'm', say: 'Mmmm', rest: 'owss' },
  map: { onset: 'm', say: 'Mmmm', rest: 'ap' },
  milk: { onset: 'm', say: 'Mmmm', rest: 'ilk' },
  sun: { onset: 's', say: 'Ssss', rest: 'un' },
  fish: { onset: 'f', say: 'Ffff', rest: 'ish' },
  fox: { onset: 'f', say: 'Ffff', rest: 'ox' },
  fire: { onset: 'f', say: 'Ffff', rest: 'ire' },
  leaf: { onset: 'l', say: 'Llll', rest: 'eef' },
  lock: { onset: 'l', say: 'Llll', rest: 'ock' },
  nose: { onset: 'n', say: 'Nnnn', rest: 'oze' },
  ring: { onset: 'r', say: 'Rrrr', rest: 'ing' },
  rose: { onset: 'r', say: 'Rrrr', rest: 'oze' },
  shoe: { onset: 'sh', say: 'Shhhh', rest: 'oo' },
  sheep: { onset: 'sh', say: 'Shhhh', rest: 'eep' },
  shell: { onset: 'sh', say: 'Shhhh', rest: 'ell' },
  ship: { onset: 'sh', say: 'Shhhh', rest: 'ip' },
  // stop sounds (and h): later in the stage
  cat: { onset: 'k', say: 'Kuh', rest: 'at' },
  cake: { onset: 'k', say: 'Kuh', rest: 'ache' },
  car: { onset: 'k', say: 'Kuh', rest: 'ar' },
  king: { onset: 'k', say: 'Kuh', rest: 'ing' },
  key: { onset: 'k', say: 'Kuh', rest: 'ee' },
  dog: { onset: 'd', say: 'Duh', rest: 'og' },
  duck: { onset: 'd', say: 'Duh', rest: 'uck' },
  door: { onset: 'd', say: 'Duh', rest: 'or' },
  pig: { onset: 'p', say: 'Puh', rest: 'ig' },
  pen: { onset: 'p', say: 'Puh', rest: 'en' },
  pear: { onset: 'p', say: 'Puh', rest: 'air' },
  bee: { onset: 'b', say: 'Buh', rest: 'ee' },
  bed: { onset: 'b', say: 'Buh', rest: 'ed' },
  bus: { onset: 'b', say: 'Buh', rest: 'us' },
  bat: { onset: 'b', say: 'Buh', rest: 'at' },
  box: { onset: 'b', say: 'Buh', rest: 'ox' },
  boat: { onset: 'b', say: 'Buh', rest: 'oat' },
  bell: { onset: 'b', say: 'Buh', rest: 'ell' },
  goat: { onset: 'g', say: 'Guh', rest: 'oat' },
  tub: { onset: 't', say: 'Tuh', rest: 'ub' },
  hat: { onset: 'h', say: 'Hhhh', rest: 'at' },
  hen: { onset: 'h', say: 'Hhhh', rest: 'en' },
} as const satisfies Record<string, { onset: string; say: string; rest: string }>

export type KBlendWord = keyof typeof K_BLEND_SOUNDS
export const K_BLEND_WORDS = Object.keys(K_BLEND_SOUNDS) as KBlendWord[]

/** First sounds a voice can hold ("mmmm"), taught before the stop sounds (RF.K.2c). */
export const STRETCHY_ONSETS: readonly string[] = ['m', 's', 'f', 'l', 'n', 'r', 'sh']

const sounds = (w: KBlendWord) => `${K_BLEND_SOUNDS[w].say.toLowerCase()}… ${K_BLEND_SOUNDS[w].rest}`
/** "Listen: mmmm… oon. What word?" */
export const blendText = (w: KBlendWord) => `Listen: ${sounds(w)}. What word?`
/** After a wrong pick: "That's fish: ffff… ish." */
export const blendNoteText = (w: KBlendWord) => `That's ${w}: ${sounds(w)}.`

const cap = (w: string) => w[0].toUpperCase() + w.slice(1)

/**
 * Kindergarten phonological awareness (RF.K.2b–c): Letter Reef's "Clap the
 * parts" (the drum) and "Sound it out" (onset and rime). See the listening
 * note at the top of this file.
 */
export default defineVoicePack({
  id: 'k-sounds',
  lines: {
    // praise (taking turns with the kit's own)
    youHeardParts: 'You heard every part!',
    soundsTogether: 'You put the sounds together!',
    // the drum's help after a miss: "Let's tap it together." then the parts, the drum tapped on each
    tapTogether: "Let's tap it together.",
    ...Object.fromEntries(K_DRUM_WORDS.map((w) => [`parts-${w}`, partsText(K_DRUM_PARTS[w])])),
    // "Listen: mmmm… oon. What word?" (one clip per word)
    ...Object.fromEntries(K_BLEND_WORDS.map((w) => [`blend-${w}`, blendText(w)])),
    // about a picture tapped by mistake: "That's fish: ffff… ish."
    ...Object.fromEntries(K_BLEND_WORDS.map((w) => [`that-${w}`, blendNoteText(w)])),
  },
  templates: {
    /** One clip per word: its picture shown, the drum and then the ✓ lit on their words. */
    drumWord: { text: '{word}! Tap the drum for each part, then tap the check.', slots: { word: { words: K_DRUM_WORDS.map(cap) } }, render: 'whole' },
  },
})
