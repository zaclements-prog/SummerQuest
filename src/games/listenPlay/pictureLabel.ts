import type { Picture } from '../../lib/problem'

/** What a picture is, in words (for screen readers and tests; never shown). */
export function pictureLabel(p: Picture): string {
  switch (p.kind) {
    case 'numeral':
      return String(p.n)
    case 'group':
      return `${p.count} ${p.emoji ?? '🍎'}`
    case 'tenFrame':
      return `ten frame with ${p.count}`
    case 'shape':
      return p.shape
    case 'letter':
      return p.ch
    case 'word':
      return p.text
    case 'emoji':
      return p.emoji
    case 'clock':
      return `${p.hour}:${String(p.minute).padStart(2, '0')}`
    case 'art':
      return p.name
  }
}
