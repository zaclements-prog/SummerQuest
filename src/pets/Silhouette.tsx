import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { MeshBasicMaterial } from 'three'
import type { Group, Mesh } from 'three'
import { registerSharedGpuCache } from '../platform/gl/release'

// One flat, unlit dark plum for every silhouette (the toon outline's color, a touch lighter).
const shadowMat = new MeshBasicMaterial({ color: '#4a3a47' })
registerSharedGpuCache(() => [shadowMat])

/**
 * Draws its children as a dark silhouette: a stage a pet hasn't reached yet.
 * Every mesh underneath (outline hulls included) is switched to one flat dark
 * material after it mounts; give the silhouette a new `key` to show the real
 * model again.
 */
export default function Silhouette({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null)
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      m.material = shadowMat
      m.castShadow = false
    })
  })
  return <group ref={ref}>{children}</group>
}
