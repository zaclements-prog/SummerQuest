import { useProgress } from '../../store/progress'
import { anchorsFor } from '../models/anchors'
import type { Slot } from '../models/anchors'
import { accessoryById } from '../../lib/home/accessories'
import { accessoryBuilder } from '../models/accessoryRegistry'

const SLOTS: Slot[] = ['head', 'face', 'back', 'body']

export default function CreatureAccessories() {
  const activeCreature = useProgress((s) => s.activeCreature)
  const equipped = useProgress((s) => s.equippedAccessories)
  const anchors = anchorsFor(activeCreature)
  return (
    <group scale={anchors.scale}>
      {SLOTS.map((slot) => {
        const id = equipped[slot]
        const acc = accessoryById(id)
        if (!id || !acc) return null
        const build = accessoryBuilder(acc.modelId)
        const p = anchors[slot]
        return (
          <group key={slot} position={[p[0] / anchors.scale, p[1] / anchors.scale, p[2] / anchors.scale]}>
            {build()}
          </group>
        )
      })}
    </group>
  )
}
