import { useState } from 'react'
import { useProgress } from '../../store/progress'
import { useHomeUi } from '../useHomeUi'
import { HOME_ITEMS } from '../../lib/home/catalog'
import { sfx } from '../../lib/sound'

type Tab = 'furniture' | 'decor' | 'creatures'

export default function CatalogDrawer() {
  const [tab, setTab] = useState<Tab>('furniture')
  const coins = useProgress((s) => s.coins)
  const owned = useProgress((s) => s.ownedHomeItems)
  const buyHomeItem = useProgress((s) => s.buyHomeItem)
  const startPlacing = useHomeUi((s) => s.startPlacing)
  const items = HOME_ITEMS.filter((i) => i.category === tab)

  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 bg-ocean-900/85 backdrop-blur p-3 rounded-t-3xl max-h-[44%] overflow-y-auto">
      <div className="flex gap-2 mb-2">
        {(['furniture', 'decor', 'creatures'] as Tab[]).map((t) => (
          <button key={t} onClick={() => { sfx.click(); setTab(t) }}
            className={`kid-text px-3 py-1 rounded-full text-sm capitalize ${tab === t ? 'bg-quest-500 text-quest-900' : 'bg-white/15 text-white'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'creatures' ? (
        <div className="text-white/80 kid-text text-center py-4">Creature shop coming soon →</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {items.map((it) => {
            const count = owned[it.id] ?? 0
            const canAfford = coins >= it.price
            return (
              <div key={it.id} className="bg-white text-ocean-900 rounded-2xl p-2 text-center">
                <div className="kid-text text-xs leading-tight mb-1 min-h-[2em]">{it.name}</div>
                {count > 0 && (
                  <button onClick={() => { sfx.click(); startPlacing(it.id) }}
                    className="kid-text text-xs w-full mb-1 px-2 py-1 rounded-full bg-correct-500 text-white">
                    Place ({count})
                  </button>
                )}
                <button onClick={() => { if (buyHomeItem(it.id, it.price)) sfx.victory() }} disabled={!canAfford}
                  className={`kid-text text-xs w-full px-2 py-1 rounded-full ${canAfford ? 'bg-quest-500 text-quest-900' : 'bg-gray-200 text-gray-400'}`}>
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
