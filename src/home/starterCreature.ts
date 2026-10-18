import { useEffect } from 'react'
import { useProgress } from '../store/progress'
import { CREATURES, creatureForEmoji } from '../lib/home/catalog'

interface CreatureSlice {
  player: { emoji: string } | null
  ownedCreatures: string[]
  activeCreature: string | null
}

/**
 * The store patch that gives a player their starter creature (the one matching
 * their avatar emoji, else the first in the roster), or re-activates an owned one
 * when none is active. null when nothing needs to change.
 *
 * A player who grew a pet all the way up before ever opening a 3D screen
 * already owns that grown-up, but never had a starter: they still get it.
 */
export function starterCreaturePatch(
  s: CreatureSlice,
): Partial<Pick<CreatureSlice, 'ownedCreatures' | 'activeCreature'>> | null {
  if (!s.player) return null
  const starter = creatureForEmoji(s.player.emoji) ?? CREATURES[0]
  if (s.ownedCreatures.length === 0) return { ownedCreatures: [starter.id], activeCreature: starter.id }
  if (!s.activeCreature) {
    if (!s.ownedCreatures.includes(starter.id)) {
      return { ownedCreatures: [starter.id, ...s.ownedCreatures], activeCreature: starter.id }
    }
    return { activeCreature: s.ownedCreatures[0] }
  }
  return null
}

/**
 * Make sure the player has an active creature before a 3D screen (Home or World)
 * shows it, whichever of the two a new player opens first.
 */
export function useStarterCreature(): void {
  const player = useProgress((s) => s.player)
  const ownedCount = useProgress((s) => s.ownedCreatures.length)
  const activeCreature = useProgress((s) => s.activeCreature)
  useEffect(() => {
    const patch = starterCreaturePatch(useProgress.getState())
    if (patch) useProgress.setState(patch)
  }, [player, ownedCount, activeCreature])
}
