import { defineVoicePack } from '../types'
import { STROKE_PHRASES } from '../../lib/trace/glyphs'
import { UPPER_LETTERS } from './k-letters'

/** Numbers as the narrator says them in a fixed line ("Let's trace an eight!"). */
const DIGIT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] as const
// by sound, not spelling: "a one" (it starts with a "w" sound), "an eight"
const article = (word: string) => (/^[aeiou]/.test(word) && word !== 'one' ? 'an' : 'a')

/**
 * Tracing (Writing Workshop, K; and Counting Mesa's last question): what the
 * narrator says while a child traces warm-up strokes, the numerals 0–9 and the
 * capital letters with a finger.
 *
 * - Each glyph is introduced ("Let's trace the letter B!", "Let's trace a
 *   seven!", "Let's trace a circle!").
 * - Each stroke has its phrase from a small vocabulary reused across glyphs
 *   (`say-<phrase>`, the phrases in src/lib/trace/glyphs.ts): said as the
 *   stroke's green dot appears, and while the hand shows the stroke.
 * - A stroke that went wrong gets one gentle word, by what went wrong.
 * - The numerals are written out in the fixed lines ("an eight"), so a
 *   recording never reads "a 8".
 */
export default defineVoicePack({
  id: 'k-trace',
  lines: {
    // ── the warm-ups (Warm-up lines) ──
    'warm-down': "Let's trace a big line down!",
    'warm-across': "Let's trace a line across!",
    'warm-slant': "Let's trace a slant line!",
    'warm-circle': "Let's trace a circle!",
    'warm-curve': "Let's trace a curve!",
    'warm-zigzag': "Let's trace a zig-zag!",
    'warm-wave': "Let's trace a wave!",
    // ── the numerals (Trace numbers) ──
    ...Object.fromEntries(DIGIT_WORDS.map((w, n) => [`digit-${n}`, `Let's trace ${article(w)} ${w}!`])),
    // ── Counting Mesa's last question: trace the number just counted (1–9) ──
    ...Object.fromEntries(DIGIT_WORDS.slice(1).map((w, i) => [`counted-${i + 1}`, `You counted ${w}! Now trace ${article(w)} ${w}.`])),
    // ── each stroke's phrase ──
    ...Object.fromEntries(Object.entries(STROKE_PHRASES).map(([id, text]) => [`say-${id}`, text])),
    // ── a stroke that went wrong (the ink fades, the child tries that stroke again) ──
    hintStart: 'Start at the green dot.',
    hintArrow: 'Follow the arrow.',
    hintEnd: 'Keep going, all the way to the end!',
    // praise for tracing (taking turns with the kit's own)
    greatTracing: 'Great tracing!',
    niceLines: 'What nice lines!',
  },
  templates: {
    /** 26 clips: a capital letter to trace (Trace big letters). */
    letter: { text: "Let's trace the letter {letter}!", slots: { letter: { words: UPPER_LETTERS } }, render: 'whole' },
  },
})
