/** The big banners: words for grades 2–5; for K–1 (`listen`) pictures and numbers only (the voice says the rest). */
export function paradeBanner(kind: 'start' | 'level' | 'full' | 'join' | 'tug' | 'slow', listen: boolean, n = 0): string {
  switch (kind) {
    case 'start':
      return listen ? '🎉 🐾 🎉' : 'Critter Parade!'
    case 'level':
      return listen ? '🎉 🐾 🎉' : `Parade ${n}!`
    case 'full':
      return listen ? '🐾🐾🐾' : 'PARADE FULL!'
    case 'join':
      return listen ? `+${n} 🐾` : `+${n} friends!`
    case 'tug':
      return listen ? '🪢' : 'Tug of war!'
    case 'slow':
      return listen ? '🐢' : 'Slow motion!'
  }
}
