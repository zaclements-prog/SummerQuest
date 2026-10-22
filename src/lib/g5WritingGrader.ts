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
  const conclusion = /\b(in conclusion|that is why|that’s why|for these reasons|to sum up|overall|in the end|all in all|so now|now you know|in short)\b/i.test(last) || /\b(in conclusion|for these reasons|to sum up|all in all)\b/i.test(t)
  const labels = G5_CHECKLISTS[mode]
  let met: boolean[]
  if (mode === 'opinion') {
    met = [
      /\b(i think|i believe|in my opinion|i feel|should|is better|are better|i prefer|i would)\b/i.test(first),
      count(t, ['because', 'first', 'second', 'another reason', 'one reason', 'also', 'in addition', 'since', 'finally']) >= 2,
      /\b(for example|for instance|such as|according to|studies|scientists|\d+)\b/i.test(t),
      linking >= 2,
      paragraphs >= 2 && conclusion,
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
  const score = Math.round(
    Math.min(
      100,
      30 * lengthRatio * quality + (/^["“(]*[A-Z]/.test(trimmed) ? 5 : 0) + (/[.!?]["”')\]]*$/.test(trimmed) ? 5 : 0) + 60 * (met / checks.length) * quality,
    ),
  )
  const stars = starsForScore(score)
  const celebrations = checks.filter((c) => c.met).map((c) => `✓ ${c.label}`)
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
