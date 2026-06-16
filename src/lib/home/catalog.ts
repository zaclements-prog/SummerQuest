import type { Footprint } from './grid'

export interface HomeItem {
  id: string
  name: string
  category: 'furniture' | 'decor'
  price: number
  footprint: Footprint
  modelId: string // → registry
}

export interface Creature {
  id: string
  emoji: string
  name: string
  price: number // starter is resolved at runtime by emoji match; listed price applies when buying
}

/** One per avatar animal. ids are stable slugs; emoji matches AvatarCreate's roster. */
export const CREATURES: Creature[] = [
  { id: 'fox',      emoji: '🦊', name: 'Fox',      price: 0 },
  { id: 'frog',     emoji: '🐸', name: 'Frog',     price: 220 },
  { id: 'tiger',    emoji: '🐯', name: 'Tiger',    price: 280 },
  { id: 'owl',      emoji: '🦉', name: 'Owl',      price: 300 },
  { id: 'bear',     emoji: '🐻', name: 'Bear',     price: 320 },
  { id: 'lion',     emoji: '🦁', name: 'Lion',     price: 360 },
  { id: 'panda',    emoji: '🐼', name: 'Panda',    price: 420 },
  { id: 'octopus',  emoji: '🐙', name: 'Octopus',  price: 480 },
  { id: 'dragonet', emoji: '🐲', name: 'Dragonet', price: 600 },
  { id: 'trex',     emoji: '🦖', name: 'T-Rex',    price: 700 },
  { id: 'unicorn',  emoji: '🦄', name: 'Unicorn',  price: 850 },
  { id: 'dragon',   emoji: '🐉', name: 'Dragon',   price: 1000 },
]

export function creatureForEmoji(emoji: string): Creature | undefined {
  return CREATURES.find((c) => c.emoji === emoji)
}
export function creatureById(id: string | null | undefined): Creature | undefined {
  return id ? CREATURES.find((c) => c.id === id) : undefined
}

export const HOME_ITEMS: HomeItem[] = [
  { id: 'chair',     name: 'Chair',        category: 'furniture', price: 100, footprint: { w: 1, d: 1 }, modelId: 'chair' },
  { id: 'plant',     name: 'Potted Plant', category: 'decor',     price: 120, footprint: { w: 1, d: 1 }, modelId: 'plant' },
  { id: 'rug',       name: 'Cozy Rug',     category: 'decor',     price: 120, footprint: { w: 2, d: 3 }, modelId: 'rug' },
  { id: 'lamp',      name: 'Floor Lamp',   category: 'furniture', price: 140, footprint: { w: 1, d: 1 }, modelId: 'lamp' },
  { id: 'beanbag',   name: 'Bean Bag',     category: 'furniture', price: 150, footprint: { w: 1, d: 1 }, modelId: 'beanbag' },
  { id: 'toychest',  name: 'Toy Chest',    category: 'decor',     price: 160, footprint: { w: 1, d: 1 }, modelId: 'toychest' },
  { id: 'table',     name: 'Round Table',  category: 'furniture', price: 220, footprint: { w: 2, d: 2 }, modelId: 'table' },
  { id: 'bed',       name: 'Comfy Bed',    category: 'furniture', price: 320, footprint: { w: 2, d: 3 }, modelId: 'bed' },
  { id: 'bookshelf', name: 'Bookshelf',    category: 'furniture', price: 340, footprint: { w: 2, d: 1 }, modelId: 'bookshelf' },
  { id: 'rocket',    name: 'Toy Rocket',   category: 'decor',     price: 400, footprint: { w: 1, d: 1 }, modelId: 'rocket' },
  // --- expanded catalog ---
  { id: 'stool',     name: 'Stool',        category: 'furniture', price: 90,  footprint: { w: 1, d: 1 }, modelId: 'stool' },
  { id: 'nightstand',name: 'Nightstand',   category: 'furniture', price: 120, footprint: { w: 1, d: 1 }, modelId: 'nightstand' },
  { id: 'desk',      name: 'Desk',         category: 'furniture', price: 200, footprint: { w: 2, d: 1 }, modelId: 'desk' },
  { id: 'sofa',      name: 'Cozy Sofa',    category: 'furniture', price: 240, footprint: { w: 3, d: 1 }, modelId: 'sofa' },
  { id: 'dresser',   name: 'Dresser',      category: 'furniture', price: 280, footprint: { w: 2, d: 1 }, modelId: 'dresser' },
  { id: 'tv',        name: 'TV',           category: 'furniture', price: 300, footprint: { w: 2, d: 1 }, modelId: 'tv' },
  { id: 'wardrobe',  name: 'Wardrobe',     category: 'furniture', price: 320, footprint: { w: 2, d: 1 }, modelId: 'wardrobe' },
  { id: 'rockinghorse', name: 'Rocking Horse', category: 'furniture', price: 240, footprint: { w: 2, d: 1 }, modelId: 'rockinghorse' },
  { id: 'piano',     name: 'Piano',        category: 'furniture', price: 400, footprint: { w: 2, d: 1 }, modelId: 'piano' },
  { id: 'ball',      name: 'Beach Ball',   category: 'decor',     price: 90,  footprint: { w: 1, d: 1 }, modelId: 'ball' },
  { id: 'balloon',   name: 'Balloon',      category: 'decor',     price: 100, footprint: { w: 1, d: 1 }, modelId: 'balloon' },
  { id: 'giftbox',   name: 'Gift Box',     category: 'decor',     price: 100, footprint: { w: 1, d: 1 }, modelId: 'giftbox' },
  { id: 'blocks',    name: 'Toy Blocks',   category: 'decor',     price: 110, footprint: { w: 1, d: 1 }, modelId: 'blocks' },
  { id: 'drum',      name: 'Toy Drum',     category: 'decor',     price: 130, footprint: { w: 1, d: 1 }, modelId: 'drum' },
  { id: 'teddy',     name: 'Teddy Bear',   category: 'decor',     price: 140, footprint: { w: 1, d: 1 }, modelId: 'teddy' },
  { id: 'globe',     name: 'Globe',        category: 'decor',     price: 160, footprint: { w: 1, d: 1 }, modelId: 'globe' },
  { id: 'trophy',    name: 'Trophy',       category: 'decor',     price: 200, footprint: { w: 1, d: 1 }, modelId: 'trophy' },
  { id: 'fishtank',  name: 'Fish Tank',    category: 'decor',     price: 320, footprint: { w: 2, d: 1 }, modelId: 'fishtank' },
]
