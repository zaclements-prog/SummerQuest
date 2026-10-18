import { useState } from 'react'
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
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => { sfx.click(); setTab(t) }}
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
                <div className="kid-text text-sm leading-tight my-1 min-h-[2em]">{a.name}</div>
                {isOwned ? (
                  <button type="button" onClick={() => { sfx.click(); equipAccessory(a.id) }}
                    className={`kid-text text-sm w-full min-h-12 px-2 py-1 rounded-full ${isEquipped ? 'bg-ocean-500 text-white' : 'bg-correct-500 text-white'}`}>
                    {isEquipped ? 'Wearing ✓' : 'Wear'}
                  </button>
                ) : (
                  <button type="button" onClick={() => { if (buyAccessory(a.id, a.price)) sfx.victory() }} disabled={!canAfford}
                    className={`kid-text text-sm w-full min-h-12 px-2 py-1 rounded-full ${canAfford ? 'bg-quest-500 text-quest-900' : 'bg-gray-200 text-gray-400'}`}>
                    🪙 {a.price}
                  </button>
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
                <div className="kid-text text-sm leading-tight mb-1 min-h-[2em]">{it.name}</div>
                {count > 0 && (
                  <button type="button" onClick={() => { sfx.click(); startPlacing(it.id) }}
                    className="kid-text text-sm w-full min-h-12 mb-1.5 px-2 py-1 rounded-full bg-correct-500 text-white">
                    Place ({count})
                  </button>
                )}
                <button type="button" onClick={() => { if (buyHomeItem(it.id, it.price)) sfx.victory() }} disabled={!canAfford}
                  className={`kid-text text-sm w-full min-h-12 px-2 py-1 rounded-full ${canAfford ? 'bg-quest-500 text-quest-900' : 'bg-gray-200 text-gray-400'}`}>
                  🪙 {it.price}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
