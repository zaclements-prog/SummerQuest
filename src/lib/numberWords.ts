/**
 * Number words for what the narrator says ("seven", not "7"): count-along
 * lines and the voice-line catalogs.
 */

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/** 0–999 as words ("forty-two", "one hundred twenty"). */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999) throw new Error(`numberWord: ${n} is out of range`)
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '')
  const rest = n % 100
  return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` ${numberWord(rest)}` : ''}`
}

/** "One, two, three." — counting from 1 to `n`, as the narrator says it. */
export function countAlongText(n: number): string {
  const s = Array.from({ length: n }, (_, i) => numberWord(i + 1)).join(', ')
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`
}

/**
 * Where each number word starts in a count-along line (character offsets), so
 * whatever counts along with the voice can light object `i` as word `i` is said.
 */
export function countAlongOffsets(text: string): number[] {
  const out: number[] = []
  const re = /[A-Za-z]+(?:-[A-Za-z]+)?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) out.push(m.index)
  return out
}
