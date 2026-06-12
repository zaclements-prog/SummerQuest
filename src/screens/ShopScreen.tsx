import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProgress } from '../store/progress'
import { COSMETICS, cosmeticById } from '../lib/cosmetics'
import { sfx } from '../lib/sound'

export default function ShopScreen() {
  const player = useProgress((s) => s.player)
  const coins = useProgress((s) => s.coins)
  const owned = useProgress((s) => s.ownedCosmetics)
  const equipped = useProgress((s) => s.equippedCosmetic)
  const buyCosmetic = useProgress((s) => s.buyCosmetic)
  const equipCosmetic = useProgress((s) => s.equipCosmetic)

  const equippedCos = cosmeticById(equipped)

  return (
    <div className="flex-1 flex flex-col p-4 text-white overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto">
        <Link to="/map" className="kid-text inline-block mb-3">
          ← Back to map
        </Link>

        <div className="flex items-center justify-between mb-4">
          <h2 className="kid-text text-4xl drop-shadow-lg">🛍️ Shop</h2>
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-quest-500 text-quest-900 kid-text">
            🪙 {coins}
          </span>
        </div>

        {/* Avatar preview with whatever is equipped */}
        <div className="flex items-center gap-3 mb-5 bg-white/10 rounded-3xl p-3">
          <div
            className="relative w-20 h-20 rounded-full flex items-center justify-center text-5xl flex-shrink-0"
            style={{ background: player?.color ?? '#f59e0b' }}
          >
            {player?.emoji ?? '🦊'}
            {equippedCos && (
              <span className="absolute -top-1 -right-1 text-3xl drop-shadow">
                {equippedCos.emoji}
              </span>
            )}
          </div>
          <div className="kid-text">
            <div className="text-xl">{player?.name ?? 'Explorer'}</div>
            <div className="text-sm text-white/80">
              {equippedCos ? `Wearing: ${equippedCos.name}` : 'No accessory equipped'}
            </div>
            {equipped && (
              <button
                onClick={() => {
                  sfx.click()
                  equipCosmetic(null)
                }}
                className="mt-1 text-sm underline text-white/90"
              >
                Take it off
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {COSMETICS.map((c) => {
            const isOwned = owned.includes(c.id)
            const isEquipped = equipped === c.id
            const canAfford = coins >= c.price
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white text-ocean-900 rounded-3xl p-3 text-center flex flex-col items-center gap-1 shadow-lg"
              >
                <div className="text-4xl">{c.emoji}</div>
                <div className="kid-text text-sm leading-tight">{c.name}</div>

                {isOwned ? (
                  <button
                    onClick={() => {
                      sfx.click()
                      equipCosmetic(isEquipped ? null : c.id)
                    }}
                    className={`kid-text text-sm mt-1 px-3 py-1 rounded-full ${
                      isEquipped
                        ? 'bg-ocean-500 text-white'
                        : 'bg-correct-500 text-white'
                    }`}
                  >
                    {isEquipped ? 'Equipped ✓' : 'Equip'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!canAfford) return
                      if (buyCosmetic(c.id, c.price)) {
                        sfx.victory()
                        equipCosmetic(c.id)
                      }
                    }}
                    disabled={!canAfford}
                    className={`kid-text text-sm mt-1 px-3 py-1 rounded-full ${
                      canAfford
                        ? 'bg-quest-500 text-quest-900'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    🪙 {c.price}
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
