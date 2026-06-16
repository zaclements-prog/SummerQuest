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
  { id: 'tiger',    emoji: '🐯', name: 'Tiger',    price: 60 },
  { id: 'lion',     emoji: '🦁', name: 'Lion',     price: 80 },
  { id: 'bear',     emoji: '🐻', name: 'Bear',     price: 70 },
  { id: 'panda',    emoji: '🐼', name: 'Panda',    price: 90 },
  { id: 'frog',     emoji: '🐸', name: 'Frog',     price: 50 },
  { id: 'owl',      emoji: '🦉', name: 'Owl',      price: 70 },
  { id: 'dragonet', emoji: '🐲', name: 'Dragonet', price: 150 },
  { id: 'unicorn',  emoji: '🦄', name: 'Unicorn',  price: 200 },
  { id: 'octopus',  emoji: '🐙', name: 'Octopus',  price: 110 },
  { id: 'trex',     emoji: '🦖', name: 'T-Rex',    price: 180 },
  { id: 'dragon',   emoji: '🐉', name: 'Dragon',   price: 250 },
]

export function creatureForEmoji(emoji: string): Creature | undefined {
  return CREATURES.find((c) => c.emoji === emoji)
}
export function creatureById(id: string | null | undefined): Creature | undefined {
  return id ? CREATURES.find((c) => c.id === id) : undefined
}

export const HOME_ITEMS: HomeItem[] = [
  { id: 'rug',       name: 'Cozy Rug',     category: 'decor',     price: 30,  footprint: { w: 2, d: 3 }, modelId: 'rug' },
  { id: 'bed',       name: 'Comfy Bed',    category: 'furniture', price: 80,  footprint: { w: 2, d: 3 }, modelId: 'bed' },
  { id: 'lamp',      name: 'Floor Lamp',   category: 'furniture', price: 40,  footprint: { w: 1, d: 1 }, modelId: 'lamp' },
  { id: 'plant',     name: 'Potted Plant', category: 'decor',     price: 35,  footprint: { w: 1, d: 1 }, modelId: 'plant' },
  { id: 'table',     name: 'Round Table',  category: 'furniture', price: 60,  footprint: { w: 2, d: 2 }, modelId: 'table' },
  { id: 'chair',     name: 'Chair',        category: 'furniture', price: 30,  footprint: { w: 1, d: 1 }, modelId: 'chair' },
  { id: 'bookshelf', name: 'Bookshelf',    category: 'furniture', price: 90,  footprint: { w: 2, d: 1 }, modelId: 'bookshelf' },
  { id: 'toychest',  name: 'Toy Chest',    category: 'decor',     price: 50,  footprint: { w: 1, d: 1 }, modelId: 'toychest' },
  { id: 'beanbag',   name: 'Bean Bag',     category: 'furniture', price: 45,  footprint: { w: 1, d: 1 }, modelId: 'beanbag' },
  { id: 'rocket',    name: 'Toy Rocket',   category: 'decor',     price: 120, footprint: { w: 1, d: 1 }, modelId: 'rocket' },
]
