import type { Slot } from '../../home/models/anchors'

export interface Accessory {
  id: string
  name: string
  slot: Slot
  price: number
  modelId: string
  /** The shop card's picture. */
  emoji: string
}

export const ACCESSORIES: Accessory[] = [
  // head
  { id: 'cap',       name: 'Ball Cap',     slot: 'head', price: 80,  modelId: 'cap', emoji: '🧢' },
  { id: 'beanie',    name: 'Beanie',       slot: 'head', price: 90,  modelId: 'beanie', emoji: '🧶' },
  { id: 'partyhat',  name: 'Party Hat',    slot: 'head', price: 120, modelId: 'partyhat', emoji: '🥳' },
  { id: 'tophat',    name: 'Top Hat',      slot: 'head', price: 200, modelId: 'tophat', emoji: '🎩' },
  { id: 'crown',     name: 'Royal Crown',  slot: 'head', price: 400, modelId: 'crown', emoji: '👑' },
  // face
  { id: 'sunglasses',name: 'Sunglasses',   slot: 'face', price: 120, modelId: 'sunglasses', emoji: '🕶️' },
  { id: 'glasses',   name: 'Round Glasses',slot: 'face', price: 100, modelId: 'glasses', emoji: '👓' },
  { id: 'eyemask',   name: 'Hero Mask',    slot: 'face', price: 160, modelId: 'eyemask', emoji: '🦸' },
  // back
  { id: 'angelwings',name: 'Angel Wings',  slot: 'back', price: 320, modelId: 'angelwings', emoji: '😇' },
  { id: 'batwings',  name: 'Bat Wings',    slot: 'back', price: 300, modelId: 'batwings', emoji: '🦇' },
  { id: 'cape',      name: 'Hero Cape',    slot: 'back', price: 220, modelId: 'cape', emoji: '🦸' },
  { id: 'backpack',  name: 'Backpack',     slot: 'back', price: 140, modelId: 'backpack', emoji: '🎒' },
  // body
  { id: 'bowtie',    name: 'Bow Tie',      slot: 'body', price: 90,  modelId: 'bowtie', emoji: '🎀' },
  { id: 'scarf',     name: 'Cozy Scarf',   slot: 'body', price: 110, modelId: 'scarf', emoji: '🧣' },
  { id: 'herooutfit',name: 'Hero Suit',    slot: 'body', price: 260, modelId: 'herooutfit', emoji: '🦸' },
  { id: 'lei',       name: 'Flower Lei',   slot: 'body', price: 100, modelId: 'lei', emoji: '🌺' },
]

export function accessoryById(id: string | null | undefined): Accessory | undefined {
  return id ? ACCESSORIES.find((a) => a.id === id) : undefined
}
