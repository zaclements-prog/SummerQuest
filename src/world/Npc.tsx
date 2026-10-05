import { useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { useWorldUi } from './useWorldUi'
import type { HubKind } from './worldLayout'
import { TOON } from '../toon/palette'
import { TBlob, TCapsule, TCyl, TSphere } from '../toon/shapes'

const INTERACT_R = 2.4

/** A round stone stage the NPC stands on. */
function Stage() {
  return (
    <group>
      <TCyl radiusTop={0.62} radiusBottom={0.7} height={0.16} position={[0, 0.08, 0]} color={TOON.stoneDark} segments={14} receiveShadow />
      <TCyl radiusTop={0.5} height={0.06} position={[0, 0.18, 0]} color={TOON.stone} segments={14} castShadow={false} receiveShadow />
    </group>
  )
}

/** Floating glowing "!" — bobs gently so kids spot who to talk to. */
function Marker({ markerRef }: { markerRef: RefObject<Group | null> }) {
  return (
    <group ref={markerRef} position={[0, 2.0, 0]}>
      <TCapsule radius={0.08} length={0.26} position={[0, 0.2, 0]} color={TOON.gold} emissive={TOON.gold} emissiveIntensity={0.7} outline castShadow={false} />
      <TSphere position={[0, -0.12, 0]} scale={0.09} color={TOON.gold} emissive={TOON.gold} emissiveIntensity={0.7} outline castShadow={false} />
    </group>
  )
}

/** Fallback character: a friendly round sprout-person. */
export function DefaultNpcCharacter({ color = TOON.mint }: { color?: string }) {
  return (
    <group position={[0, 0.22, 0]}>
      <TCapsule radius={0.28} length={0.3} position={[0, 0.45, 0]} color={color} outline />
      <TSphere position={[0, 0.98, 0]} scale={0.3} color={TOON.skinLight} outline />
      <TSphere position={[-0.1, 1.0, 0.26]} scale={0.04} color={TOON.eye} castShadow={false} />
      <TSphere position={[0.1, 1.0, 0.26]} scale={0.04} color={TOON.eye} castShadow={false} />
      <TBlob position={[0, 1.3, 0]} scale={[0.14, 0.1, 0.14]} color={TOON.leaf} outline />
    </group>
  )
}

/**
 * A gateway NPC: stands on a stage, bobs, shows a floating "!", and becomes the
 * active NPC (→ "Press E to visit …") when the avatar is within reach. Areas
 * pass their own character as `children` (≈1 unit tall, standing on y = 0.22,
 * facing +z); without children a default character is shown.
 */
export default function Npc({
  areaId,
  zoneId,
  hub,
  label,
  position,
  posRef,
  facing = 0,
  children,
}: {
  areaId: string
  zoneId?: string
  hub?: HubKind
  label: string
  position: [number, number, number]
  posRef: RefObject<Vector3>
  /** Y rotation of the character (0 = facing +z, toward the camera). */
  facing?: number
  children?: ReactNode
}) {
  const body = useRef<Group>(null)
  const marker = useRef<Group>(null)
  const setActiveNpc = useWorldUi((s) => s.setActiveNpc)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (body.current) body.current.position.y = Math.abs(Math.sin(t * 2)) * 0.08
    if (marker.current) marker.current.position.y = 2.0 + Math.sin(t * 3) * 0.1

    const p = posRef.current
    if (!p) return
    const dx = p.x - position[0]
    const dz = p.z - position[2]
    const near = dx * dx + dz * dz < INTERACT_R * INTERACT_R
    const cur = useWorldUi.getState().activeNpc
    if (near && cur?.areaId !== areaId) setActiveNpc({ areaId, zoneId, hub, label })
    else if (!near && cur?.areaId === areaId) setActiveNpc(null)
  })

  return (
    <group position={position}>
      <Stage />
      <group ref={body} rotation={[0, facing, 0]}>
        {children ?? <DefaultNpcCharacter />}
      </group>
      <Marker markerRef={marker} />
    </group>
  )
}
