/**
 * Offline feedback for 5th-grade writing (Writing Workshop, `g5-write-1..3`):
 * the pad's checklist (providers/g5Writing) checked item by item, plus the
 * same "is this real writing?" guard as the 2–4 grader, so keyboard-mashing
 * earns nothing. Pure; grades 2–4 keep lib/writingGrader unchanged.
 */
import { G5_CHECKLISTS, type G5WritingMode } from './providers/g5Writing'
import { starsForScore, type WritingFeedback } from './writingGrader'

const LINKING = [
  'because', 'for example', 'for instance', 'also', 'therefore', 'in addition', 'another', 'however', 'since', 'so that',
  'as a result', 'consequently', 'especially', 'in contrast', 'such as', 'first', 'second', 'finally', 'next', 'then',
]
const TIME = ['later', 'meanwhile', 'after that', 'suddenly', 'finally', 'the next', 'then', 'at last', 'soon', 'that night', 'in the morning', 'first', 'before', 'when', 'after', 'just then', 'a few minutes']
const SENSES = [
  'felt', 'feel', 'heard', 'saw', 'smelled', 'tasted', 'nervous', 'excited', 'scared', 'happy', 'proud', 'worried', 'afraid', 'sad',
  'angry', 'surprised', 'laughed', 'cried', 'smiled', 'whispered', 'shouted', 'yelled', 'cold', 'warm', 'loud', 'quiet', 'bright', 'dark',
]

const count = (text: string, words: string[]) => words.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(text)).length

/** Linking words an opinion piece uses to tie reasons together (a wider net than LINKING: "so", "if", "instead of"…). */
const OPINION_LINKING = [...LINKING, 'so', 'if', 'but', 'instead of', 'instead', 'which', 'although', 'even though', 'while', 'that is why', 'for these reasons', 'this means']

const STOP = new Set(
  'the a an and or but so of to in on at for with from by is are was were be been it its this that these those they them their there here we our us you your i me my he she his her him as if then than also just very really too can could would should will not no yes do does did have has had get got make made more most much many some any all every each one two kids people thing things good bad fun cool like ok okay'.split(' '),
)
/** Words that carry meaning: 4+ letters and not a filler word. */
const contentWords = (s: string) => s.toLowerCase().match(/[a-z']+/g)?.filter((w) => w.length >= 4 && !STOP.has(w)) ?? []
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

/** A sentence that states an opinion. */
const OPINION = /\b(i think|i believe|in my opinion|i feel|should|shouldn’t|shouldn't|must|is better|are better|is the best|are the best|i prefer|i would)\b/i
/** A stock closing phrase. */
const CLOSER = /\b(in conclusion|that is why|that’s why|for these reasons|to sum up|overall|in the end|all in all|so now|now you know|in short)\b/i

/**
 * Opinion reasons, counted by supporting sentences, not by keyword hits: each
 * middle sentence of 8+ words that says something new (not mostly the same
 * words as one already counted), plus a "because …" clause in the opening.
 */
function opinionReasons(sentences: string[]): number {
  const middle = sentences.slice(1, sentences.length >= 3 ? -1 : undefined)
  const seen: Set<string>[] = []
  for (const s of middle) {
    if (wordCount(s) < 8) continue
    const cw = new Set(contentWords(s))
    if (cw.size < 2) continue
    const repeat = seen.some((prev) => [...cw].filter((w) => prev.has(w)).length / cw.size >= 0.6)
    if (!repeat) seen.push(cw)
  }
  const opener = sentences[0] ?? ''
  const because = opener.match(/\b(because|since)\b(.*)$/i)
  return seen.length + (because && contentWords(because[2]).length >= 2 ? 1 : 0)
}

/**
 * Evidence: an example marker ("for example", "for instance", "such as",
 * "according to", ", like …", "including") followed by specific content: a
 * few words in the same clause, at least two of them meaningful. A bare
 * number is not evidence.
 */
function hasEvidence(text: string): boolean {
  const re = /(\bfor example\b|\bfor instance\b|\bsuch as\b|\baccording to\b|,\s*like\b|\bincluding\b)([^.!?;]*)/gi
  for (const m of text.matchAll(re)) {
    const after = m[2].replace(/^[\s,:]+/, '')
    if (wordCount(after) >= 2 && contentWords(after).length >= 2) return true
  }
  return false
}

/** A closing sentence that sums up: a stock closer, or one that restates the opinion. */
function opinionConclusion(sentences: string[], text: string): boolean {
  if (sentences.length < 3) return false
  const first = sentences[0]
  const last = sentences[sentences.length - 1]
  if (CLOSER.test(last) || /\b(in conclusion|for these reasons|to sum up|all in all)\b/i.test(text)) return true
  if (wordCount(last) < 5) return false
  const firstWords = new Set(contentWords(first))
  const shared = new Set(contentWords(last).filter((w) => firstWords.has(w))).size
  return OPINION.test(last) || shared >= 2
}

export interface G5Check {
  label: string
  met: boolean
}

/** The checklist, item by item, for this mode. */
export function g5Checks(text: string, mode: G5WritingMode, minWords: number): G5Check[] {
  const t = text.trim()
  const paragraphs = t.split(/\n+/).filter((p) => p.trim().split(/\s+/).length >= 3).length
  const sentences = t.split(/(?<=[.!?]["”']?)\s+/).filter((s) => s.trim().length > 0)
  const first = sentences[0] ?? ''
  const last = sentences[sentences.length - 1] ?? ''
  const words = t.split(/\s+/).filter(Boolean).length
  const linking = count(t, LINKING)
  const conclusion = CLOSER.test(last) || /\b(in conclusion|for these reasons|to sum up|all in all)\b/i.test(t)
  const labels = G5_CHECKLISTS[mode]
  let met: boolean[]
  if (mode === 'opinion') {
    met = [
      OPINION.test(first),
      opinionReasons(sentences) >= 2,
      hasEvidence(t),
      count(t, OPINION_LINKING) >= 2,
      // (one long paragraph is fine once it is long enough: the prompts don't ask for more)
      (paragraphs >= 2 || words >= minWords) && opinionConclusion(sentences, t),
    ]
  } else if (mode === 'informative') {
    met = [
      first.split(/\s+/).length >= 5,
      paragraphs >= 2,
      /\d|\b(for example|for instance|such as|called|scientists|because)\b/i.test(t),
      linking >= 2,
      conclusion || (sentences.length >= 4 && /^(so|now|that|this|overall|finally)\b/i.test(last)),
    ]
  } else {
    met = [
      sentences.length >= 3 && /\b(at|in|on|near|inside|outside)\s+(the|a|an|my|our|their|his|her)\b/i.test(t),
      /["“][^"”\n]{2,}[,.!?]["”]/.test(t),
      count(t, SENSES) >= 2,
      count(t, TIME) >= 2,
      paragraphs >= 2 && words >= Math.min(minWords, 40),
    ]
  }
  return labels.map((label, i) => ({ label, met: met[i] }))
}

export function g5WritingFeedback(text: string, minWords: number, mode: G5WritingMode): WritingFeedback & { checks: G5Check[] } {
  const trimmed = text.trim()
  const words = trimmed.split(/\s+/).filter(Boolean)
  const bare = words.map((w) => w.toLowerCase().replace(/[^a-z']/g, '')).filter(Boolean)
  const uniqueRatio = bare.length ? new Set(bare).size / bare.length : 0
  const realWordRatio = bare.length ? bare.filter((w) => /[aeiouy]/.test(w)).length / bare.length : 0
  const quality = Math.min(1, realWordRatio / 0.85) * Math.min(1, uniqueRatio / 0.45)
  const lengthRatio = Math.min(1, words.length / Math.max(1, minWords))
  const checks = g5Checks(trimmed, mode, minWords)
  const met = checks.filter((c) => c.met).length
  const raw = Math.round(
    Math.min(
      100,
      30 * lengthRatio * quality + (/^["“(]*[A-Z]/.test(trimmed) ? 5 : 0) + (/[.!?]["”')\]]*$/.test(trimmed) ? 5 : 0) + 60 * (met / checks.length) * quality,
    ),
  )
  // Short of the length asked for: never 3 stars, and the further short the
  // lower the cap (60 of 80 words → at most 60, one star), so a short piece
  // stuffed with checklist words can't outscore a full one.
  const score = words.length < minWords ? Math.min(raw, 84, Math.round((100 * words.length) / minWords) - 15) : raw
  const stars = starsForScore(score)
  const celebrations = checks.filter((c) => c.met).map((c) => c.label)
  const improvements = checks.filter((c) => !c.met).map((c) => c.label)
  if (words.length < minWords) improvements.unshift(`Aim for about ${minWords} words: add another detail or example.`)
  return {
    score,
    stars,
    celebrations: celebrations.slice(0, 3),
    improvements: improvements.slice(0, 2),
    summary:
      stars >= 3
        ? 'Excellent! Your writing checks off the list, clear and well organized.'
        : stars >= 1
          ? `You checked off ${met} of ${checks.length}. Try the tips below to earn more stars.`
          : 'Keep going: write more and use the checklist as your guide.',
    checks,
  }
}
