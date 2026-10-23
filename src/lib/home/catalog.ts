import type { Footprint } from './grid'

export interface HomeItem {
  id: string
  name: string
  category: 'furniture' | 'decor'
  price: number
  footprint: Footprint
  modelId: string // → registry
  /** Flat items (rugs) the creature can walk over. They still occupy their tiles for placement. */
  walkable?: boolean
  /** The shop card's picture. */
  emoji: string
}

export interface Creature {
  id: string
  emoji: string
  name: string
}

/**
 * One per avatar animal. ids are stable slugs; emoji matches AvatarCreate's roster.
 * Not for sale: the starter matches the emoji picked at sign-up, and every other
 * one comes from raising its zone's pet (lib/pets) until it's grown up.
 */
export const CREATURES: Creature[] = [
  { id: 'fox',      emoji: '🦊', name: 'Fox' },
  { id: 'frog',     emoji: '🐸', name: 'Frog' },
  { id: 'tiger',    emoji: '🐯', name: 'Tiger' },
  { id: 'owl',      emoji: '🦉', name: 'Owl' },
  { id: 'bear',     emoji: '🐻', name: 'Bear' },
  { id: 'lion',     emoji: '🦁', name: 'Lion' },
  { id: 'panda',    emoji: '🐼', name: 'Panda' },
  { id: 'octopus',  emoji: '🐙', name: 'Octopus' },
  { id: 'dragonet', emoji: '🐲', name: 'Dragonet' },
  { id: 'trex',     emoji: '🦖', name: 'T-Rex' },
  { id: 'unicorn',  emoji: '🦄', name: 'Unicorn' },
  { id: 'dragon',   emoji: '🐉', name: 'Dragon' },
]

export function creatureForEmoji(emoji: string): Creature | undefined {
  return CREATURES.find((c) => c.emoji === emoji)
}
export function creatureById(id: string | null | undefined): Creature | undefined {
  return id ? CREATURES.find((c) => c.id === id) : undefined
}

export const HOME_ITEMS: HomeItem[] = [
  { id: 'chair',     name: 'Chair',        category: 'furniture', price: 100, footprint: { w: 1, d: 1 }, modelId: 'chair', emoji: '🪑' },
  { id: 'plant',     name: 'Potted Plant', category: 'decor',     price: 120, footprint: { w: 1, d: 1 }, modelId: 'plant', emoji: '🪴' },
  { id: 'rug',       name: 'Cozy Rug',     category: 'decor',     price: 120, footprint: { w: 2, d: 3 }, modelId: 'rug', walkable: true, emoji: '🧶' },
  { id: 'lamp',      name: 'Floor Lamp',   category: 'furniture', price: 140, footprint: { w: 1, d: 1 }, modelId: 'lamp', emoji: '💡' },
  { id: 'beanbag',   name: 'Bean Bag',     category: 'furniture', price: 150, footprint: { w: 1, d: 1 }, modelId: 'beanbag', emoji: '🛋️' },
  { id: 'toychest',  name: 'Toy Chest',    category: 'decor',     price: 160, footprint: { w: 1, d: 1 }, modelId: 'toychest', emoji: '🧰' },
  { id: 'table',     name: 'Round Table',  category: 'furniture', price: 220, footprint: { w: 2, d: 2 }, modelId: 'table', emoji: '🍽️' },
  { id: 'bed',       name: 'Comfy Bed',    category: 'furniture', price: 320, footprint: { w: 2, d: 3 }, modelId: 'bed', emoji: '🛏️' },
  { id: 'bookshelf', name: 'Bookshelf',    category: 'furniture', price: 340, footprint: { w: 2, d: 1 }, modelId: 'bookshelf', emoji: '📚' },
  { id: 'rocket',    name: 'Toy Rocket',   category: 'decor',     price: 400, footprint: { w: 1, d: 1 }, modelId: 'rocket', emoji: '🚀' },
  // --- expanded catalog ---
  { id: 'stool',     name: 'Stool',        category: 'furniture', price: 90,  footprint: { w: 1, d: 1 }, modelId: 'stool', emoji: '🍄' },
  { id: 'nightstand',name: 'Nightstand',   category: 'furniture', price: 120, footprint: { w: 1, d: 1 }, modelId: 'nightstand', emoji: '⏰' },
  { id: 'desk',      name: 'Desk',         category: 'furniture', price: 200, footprint: { w: 2, d: 1 }, modelId: 'desk', emoji: '✏️' },
  { id: 'sofa',      name: 'Cozy Sofa',    category: 'furniture', price: 240, footprint: { w: 3, d: 1 }, modelId: 'sofa', emoji: '🛋️' },
  { id: 'dresser',   name: 'Dresser',      category: 'furniture', price: 280, footprint: { w: 2, d: 1 }, modelId: 'dresser', emoji: '👕' },
  { id: 'tv',        name: 'TV',           category: 'furniture', price: 300, footprint: { w: 2, d: 1 }, modelId: 'tv', emoji: '📺' },
  { id: 'wardrobe',  name: 'Wardrobe',     category: 'furniture', price: 320, footprint: { w: 2, d: 1 }, modelId: 'wardrobe', emoji: '🚪' },
  { id: 'rockinghorse', name: 'Rocking Horse', category: 'furniture', price: 240, footprint: { w: 2, d: 1 }, modelId: 'rockinghorse', emoji: '🐴' },
  { id: 'piano',     name: 'Piano',        category: 'furniture', price: 400, footprint: { w: 2, d: 1 }, modelId: 'piano', emoji: '🎹' },
  { id: 'ball',      name: 'Beach Ball',   category: 'decor',     price: 90,  footprint: { w: 1, d: 1 }, modelId: 'ball', emoji: '🏐' },
  { id: 'balloon',   name: 'Balloon',      category: 'decor',     price: 100, footprint: { w: 1, d: 1 }, modelId: 'balloon', emoji: '🎈' },
  { id: 'giftbox',   name: 'Gift Box',     category: 'decor',     price: 100, footprint: { w: 1, d: 1 }, modelId: 'giftbox', emoji: '🎁' },
  { id: 'blocks',    name: 'Toy Blocks',   category: 'decor',     price: 110, footprint: { w: 1, d: 1 }, modelId: 'blocks', emoji: '🧱' },
  { id: 'drum',      name: 'Toy Drum',     category: 'decor',     price: 130, footprint: { w: 1, d: 1 }, modelId: 'drum', emoji: '🥁' },
  { id: 'teddy',     name: 'Teddy Bear',   category: 'decor',     price: 140, footprint: { w: 1, d: 1 }, modelId: 'teddy', emoji: '🧸' },
  { id: 'globe',     name: 'Globe',        category: 'decor',     price: 160, footprint: { w: 1, d: 1 }, modelId: 'globe', emoji: '🌍' },
  { id: 'trophy',    name: 'Trophy',       category: 'decor',     price: 200, footprint: { w: 1, d: 1 }, modelId: 'trophy', emoji: '🏆' },
  { id: 'fishtank',  name: 'Fish Tank',    category: 'decor',     price: 320, footprint: { w: 2, d: 1 }, modelId: 'fishtank', emoji: '🐠' },
]
