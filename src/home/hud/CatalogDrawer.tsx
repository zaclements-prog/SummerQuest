import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProgress } from '../../store/progress'
import { useHomeUi } from '../useHomeUi'
import { HOME_ITEMS } from '../../lib/home/catalog'
import { CREATURES } from '../../lib/home/catalog'
import { ACCESSORIES } from '../../lib/home/accessories'
import { usePetStatusMap } from '../../lib/pets/usePets'
import { nextStepShort, stageLabel } from '../../lib/pets/copy'
import { sfx } from '../../lib/sound'

type Tab = 'furniture' | 'decor' | 'animals' | 'style'

const TAB_LABEL: Record<Tab, string> = { furniture: 'Furniture', decor: 'Decor', animals: '🐾 Animals', style: '✨ Style' }

/** How long a "Buy for 150?" ask waits for its second tap before it quietly backs off (ms). */
const CONFIRM_MS = 6000

/** A shop card's picture: the item's emoji on a soft tile. */
function ItemPicture({ emoji, dim = false }: { emoji: string; dim?: boolean }) {
  return (
    <div className={`mx-auto mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-cream-100 text-3xl leading-none ${dim ? 'opacity-60' : ''}`} aria-hidden="true">
      {emoji}
    </div>
  )
}

/**
 * The price button, in two taps: the first asks "Buy for 🪙150?", the second
 * buys. Nothing is spent on a single (or accidental) tap.
 */
function BuyButton({ price, canAfford, asking, onAsk, onBuy, name }: { price: number; canAfford: boolean; asking: boolean; onAsk: () => void; onBuy: () => void; name: string }) {
  return (
    <button
      type="button"
      onClick={() => (asking ? onBuy() : onAsk())}
      disabled={!canAfford}
      aria-label={asking ? `Yes, buy the ${name} for ${price} coins` : `${name}: ${price} coins`}
      data-asking={asking || undefined}
      className={[
        'kid-text text-sm w-full min-h-12 px-2 py-1 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-quest-300',
        !canAfford ? 'bg-gray-200 text-gray-400' : asking ? 'bg-correct-500 text-white ring-4 ring-correct-300' : 'bg-quest-500 text-quest-900',
      ].join(' ')}
    >
      {asking ? `Buy for ${price}? ✓` : `🪙 ${price}`}
    </button>
  )
}

export default function CatalogDrawer({ onHide }: { onHide: () => void }) {
  const [tab, setTab] = useState<Tab>('furniture')
  const coins = useProgress((s) => s.coins)
  const owned = useProgress((s) => s.ownedHomeItems)
  const buyHomeItem = useProgress((s) => s.buyHomeItem)
  const ownedCreatures = useProgress((s) => s.ownedCreatures)
  const activeCreature = useProgress((s) => s.activeCreature)
  const becomeCreature = useProgress((s) => s.becomeCreature)
  const pets = usePetStatusMap()
  const ownedAccessories = useProgress((s) => s.ownedAccessories)
  const equippedAccessories = useProgress((s) => s.equippedAccessories)
  const buyAccessory = useProgress((s) => s.buyAccessory)
  const equipAccessory = useProgress((s) => s.equipAccessory)
  const startPlacing = useHomeUi((s) => s.startPlacing)
  const items = HOME_ITEMS.filter((i) => i.category === tab)
  // The card waiting for its second ("yes, buy it") tap, if any.
  const [asking, setAsking] = useState<string | null>(null)
  useEffect(() => {
    if (!asking) return
    const id = window.setTimeout(() => setAsking(null), CONFIRM_MS)
    return () => window.clearTimeout(id)
  }, [asking])
  const ask = (id: string) => {
    sfx.click()
    setAsking(id)
  }

  return (
    // The shop: a sheet along the bottom; on a phone held sideways, a panel down
    // the right side instead, so the room keeps most of the (short) screen.
    <div
      className={[
        'pointer-events-auto absolute bottom-0 left-0 right-0 bg-ocean-900/85 backdrop-blur p-3 rounded-t-3xl max-h-[44%] overflow-y-auto overscroll-contain',
        // edge-to-edge screen: keep clear of the home indicator and side notches
        'pb-[calc(0.75rem+var(--safe-bottom,env(safe-area-inset-bottom,0px)))] pl-[calc(0.75rem+var(--safe-left,env(safe-area-inset-left,0px)))] pr-[calc(0.75rem+var(--safe-right,env(safe-area-inset-right,0px)))]',
        'short:left-auto short:top-[calc(4.25rem+var(--safe-top,env(safe-area-inset-top,0px)))] short:w-[min(22rem,44vw)] short:max-h-none short:rounded-t-none short:rounded-tl-3xl',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center gap-2 short:gap-1.5 mb-2">
        <div className="contents" role="tablist" aria-label="Shop">
        {(['furniture', 'decor', 'animals', 'style'] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => { sfx.click(); setTab(t); setAsking(null) }}
            className={`kid-text min-h-12 px-3 short:px-2.5 short:text-sm rounded-full text-base outline-none focus-visible:ring-4 focus-visible:ring-quest-300 ${tab === t ? 'bg-quest-500 text-quest-900' : 'bg-white/15 text-white'}`}>
            {TAB_LABEL[t]}
          </button>
        ))}
        </div>
        <button type="button" onClick={onHide} aria-label="Hide the shop"
          className="kid-text ml-auto min-h-12 px-4 short:px-3 short:text-sm rounded-full text-base bg-white/15 text-white outline-none focus-visible:ring-4 focus-visible:ring-quest-300">
          Hide ▾
        </button>
      </div>
      {tab === 'style' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 short:grid-cols-2 gap-2">
          {ACCESSORIES.map((a) => {
            const isOwned = ownedAccessories.includes(a.id)
            const isEquipped = equippedAccessories[a.slot] === a.id
            const canAfford = coins >= a.price
            return (
              <div key={a.id} className="bg-white text-ocean-900 rounded-2xl p-2 text-center">
                <ItemPicture emoji={a.emoji} />
                <div className="kid-text text-sm leading-tight my-1 min-h-[2em]">{a.name}</div>
                {isOwned ? (
                  <button type="button" onClick={() => { sfx.click(); equipAccessory(a.id) }}
                    className={`kid-text text-sm w-full min-h-12 px-2 py-1 rounded-full ${isEquipped ? 'bg-ocean-500 text-white' : 'bg-correct-500 text-white'}`}>
                    {isEquipped ? 'Wearing ✓' : 'Wear'}
                  </button>
                ) : (
                  <BuyButton
                    name={a.name}
                    price={a.price}
                    canAfford={canAfford}
                    asking={asking === `style:${a.id}`}
                    onAsk={() => ask(`style:${a.id}`)}
                    onBuy={() => {
                      setAsking(null)
                      // bought → put it straight on, so the purchase shows
                      if (buyAccessory(a.id, a.price)) {
                        sfx.victory()
                        if (!isEquipped) equipAccessory(a.id)
                      }
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      ) : tab === 'animals' ? (
        // Animals come from raising pets now (no prices): yours to Become, the rest
        // show how their pet is growing and link to it on the Pets page.
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 short:grid-cols-2 gap-2">
          {CREATURES.map((c) => {
            const isOwned = ownedCreatures.includes(c.id)
            const isActive = activeCreature === c.id
            const pet = pets[c.id]
            return (
              <div key={c.id} className="bg-white text-ocean-900 rounded-2xl p-2 text-center flex flex-col">
                <div className={`text-2xl leading-none ${isOwned ? '' : 'opacity-70'}`} aria-hidden="true">{c.emoji}</div>
                <div className="kid-text text-sm leading-tight my-1">{c.name}</div>
                {isOwned ? (
                  <button type="button" disabled={isActive} onClick={() => { sfx.click(); becomeCreature(c.id) }}
                    className={`kid-text text-sm w-full min-h-12 mt-auto px-2 py-1 rounded-full ${isActive ? 'bg-ocean-500 text-white' : 'bg-correct-500 text-white'}`}>
                    {isActive ? 'You ✓' : 'Become'}
                  </button>
                ) : (
                  <>
                    {pet && (
                      <div className="kid-text text-sm leading-tight text-ink-700 mb-1.5">
                        {pet.stage === 'egg' ? '🥚 ' : ''}{stageLabel(pet.stage)} · {nextStepShort(pet)}
                      </div>
                    )}
                    <Link to={`/pets?pet=${c.id}`} onClick={() => sfx.click()}
                      className="kid-text text-sm w-full min-h-12 mt-auto px-2 py-1 rounded-full bg-quest-500 text-quest-900 inline-flex items-center justify-center outline-none focus-visible:ring-4 focus-visible:ring-quest-300">
                      🐾 See pet
                    </Link>
                  </>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 short:grid-cols-2 gap-2">
          {items.map((it) => {
            const count = owned[it.id] ?? 0
            const canAfford = coins >= it.price
            return (
              <div key={it.id} className="bg-white text-ocean-900 rounded-2xl p-2 text-center">
                <ItemPicture emoji={it.emoji} />
                <div className="kid-text text-sm leading-tight mb-1 min-h-[2em]">{it.name}</div>
                {count > 0 && (
                  // (bought earlier and still in the bag: put one in the room)
                  <button type="button" onClick={() => { sfx.click(); startPlacing(it.id) }} aria-label={`Put a ${it.name} in your room (${count} in your bag)`}
                    className="kid-text text-sm w-full min-h-12 mb-1.5 px-2 py-1 rounded-full bg-correct-500 text-white">
                    📦 Place ({count})
                  </button>
                )}
                <BuyButton
                  name={it.name}
                  price={it.price}
                  canAfford={canAfford}
                  asking={asking === it.id}
                  onAsk={() => ask(it.id)}
                  onBuy={() => {
                    setAsking(null)
                    // bought → straight into placing it: the shop folds away and
                    // the room says "Tap a tile to place"
                    if (buyHomeItem(it.id, it.price)) {
                      sfx.victory()
                      startPlacing(it.id)
                    }
                  }}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
