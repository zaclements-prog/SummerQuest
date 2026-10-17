import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { Batcher } from './batch'

/**
 * Wrap scenery in this and its still toon meshes are drawn as a handful of
 * merged meshes instead of one draw call each (see `batch.ts`). Moving,
 * fading, interactive or outline-toggling parts keep rendering normally, so it
 * is safe around whole areas.
 */
export default function StaticBatch({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const root = useRef<Group>(null)
  const out = useRef<Group>(null)
  const batcher = useRef<Batcher | null>(null)
  useEffect(() => {
    if (!enabled || !root.current || !out.current) return
    const b = new Batcher(root.current, out.current)
    batcher.current = b
    // dev: headless checks can see how much each area batched
    const dev = import.meta.env.DEV ? ((window as { __sqBatchers?: Set<Batcher> }).__sqBatchers ??= new Set()) : null
    dev?.add(b)
    return () => {
      dev?.delete(b)
      b.dispose()
      batcher.current = null
    }
  }, [enabled])
  useFrame(() => batcher.current?.tick(performance.now()))
  return (
    <group>
      <group ref={root}>{children}</group>
      <group ref={out} />
    </group>
  )
}
