/**
 * Avatar cosmetics sold in the coin shop. Each is an emoji "accessory" shown
 * next to the player's avatar. Buying spends coins (the store's `spendCoins`
 * path) — this is the coin *sink* the framework's "Math Mall" calls for, so
 * coins finally have a purpose.
 */

export interface Cosmetic {
  id: string
  emoji: string
  name: string
  price: number
}

export const COSMETICS: Cosmetic[] = [
  { id: 'cap', emoji: '🧢', name: 'Explorer Cap', price: 30 },
  { id: 'shades', emoji: '🕶️', name: 'Cool Shades', price: 40 },
  { id: 'bow', emoji: '🎀', name: 'Ribbon Bow', price: 40 },
  { id: 'grad', emoji: '🎓', name: 'Grad Cap', price: 60 },
  { id: 'tophat', emoji: '🎩', name: 'Top Hat', price: 80 },
  { id: 'halo', emoji: '🌟', name: 'Star Halo', price: 100 },
  { id: 'crown', emoji: '👑', name: 'Royal Crown', price: 150 },
  { id: 'rainbow', emoji: '🌈', name: 'Rainbow Aura', price: 200 },
]

export function cosmeticById(id?: string | null): Cosmetic | undefined {
  return id ? COSMETICS.find((c) => c.id === id) : undefined
}
