import { useEffect, useRef } from 'react'
import { Group, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { TOON } from '../toon/palette'
import { TCone, TCyl } from '../toon/shapes'
import { useMediaQuery } from '../components/useViewport'
import { registerGuideTarget } from './store'

/**
 * The guide in a 3D game (react-three-fiber; import this file directly, it is
 * not part of the 2D guide so three.js stays out of every other screen).
 *
 *   <GuideMarker position={[PAD.x, 0, PAD.z]} />            // bouncing arrow + ground ring
 *   <GuideMarker position={[x, 0, z]} anchor="forge-pad" />  // …and a guide target id
 *   <GuideAnchor id="pool" position={[x, 1, z]} />           // a target id, no marker
 *
 * An anchor projects its world position to the screen whenever the 2D guide
 * asks, so `guide.show({ target: 'forge-pad', voice, cue })` spotlights a spot
 * in the scene exactly like a button. Meant to replace the three copies in
 * Fraction Forge (GuideArrow), Cloud Keeper (GuideArrow) and Division Arena
 * (HintArrow); the games keep theirs until they migrate.
 */

const DOWN: [number, number, number] = [Math.PI, 0, 0]

export function GuideMarker({
  position,
  height = 2.2,
  radius = 0.85,
  color = TOON.gold,
  ring = true,
  anchor,
  anchorSize = 96,
}: {
  /** The spot on the ground (y = ground height). */
  position: [number, number, number]
  /** How high the arrow floats above the spot. */
  height?: number
  /** Ground ring radius (world units). */
  radius?: number
  color?: string
  ring?: boolean
  /** Also register this spot as a guide target with this id. */
  anchor?: string
  /** The anchor's on-screen box (px). */
  anchorSize?: number
}) {
  const arrow = useRef<Group>(null)
  const pulse = useRef<Mesh>(null)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const a = arrow.current
    if (a) {
      a.position.y = height + (reduced ? 0.15 : Math.abs(Math.sin(t * 3.6)) * 0.35)
      if (!reduced) a.rotation.y = t * 1.4
    }
    const p = pulse.current
    if (p) {
      const k = reduced ? 0.4 : (t * 0.75) % 1
      p.scale.setScalar(1 + k * 0.45)
      ;(p.material as MeshBasicMaterial).opacity = reduced ? 0.5 : 0.75 * (1 - k)
    }
  })

  return (
    <group position={position}>
      <group ref={arrow} position={[0, height, 0]}>
        <TCone radius={0.27} height={0.44} rotation={DOWN} color={color} emissive={color} emissiveIntensity={0.45} outline castShadow={false} />
        <TCyl radiusTop={0.1} height={0.34} position={[0, 0.36, 0]} color={color} emissive={color} emissiveIntensity={0.45} castShadow={false} />
      </group>
      {ring && (
        <>
          {/* a steady ring on the ground, and a wave that grows out of it */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} renderOrder={2}>
            <ringGeometry args={[radius * 0.8, radius, 40]} />
            <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
          </mesh>
          <mesh ref={pulse} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} renderOrder={2}>
            <ringGeometry args={[radius * 0.9, radius, 40]} />
            <meshBasicMaterial color="#fff6cf" transparent opacity={0.6} depthWrite={false} />
          </mesh>
        </>
      )}
      {anchor && <GuideAnchor id={anchor} position={[0, height * 0.5, 0]} size={anchorSize} local />}
    </group>
  )
}

/**
 * A guide target id for a point in the scene: the 2D guide's spotlight, ring
 * and hand go to where it is on screen (a `size`-px box around it), following
 * the camera. Off screen or behind the camera = not there.
 */
export function GuideAnchor({ id, position, size = 96, local = false }: { id: string; position: [number, number, number]; size?: number; local?: boolean }) {
  const camera = useThree((s) => s.camera)
  const canvas = useThree((s) => s.gl.domElement)
  const holder = useRef<Group>(null)
  const [x, y, z] = position

  useEffect(() => {
    const v = new Vector3()
    return registerGuideTarget(id, () => {
      if (local) {
        const g = holder.current
        if (!g) return null
        g.getWorldPosition(v)
      } else {
        v.set(x, y, z)
      }
      v.project(camera)
      if (v.z > 1 || v.z < -1) return null
      const r = canvas.getBoundingClientRect()
      const sx = r.left + ((v.x + 1) / 2) * r.width
      const sy = r.top + ((1 - v.y) / 2) * r.height
      if (sx < r.left || sx > r.right || sy < r.top || sy > r.bottom) return null
      return new DOMRect(sx - size / 2, sy - size / 2, size, size)
    })
  }, [id, x, y, z, size, local, camera, canvas])

  return local ? <group ref={holder} position={position} /> : null
}
