import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box3, Sphere } from 'three'
import type { Group } from 'three'
import { Batcher } from './batch'
import { AREA_CULL, sphereInView } from './areaCull'

const _box = new Box3()
const _outBox = new Box3()

/**
 * Wrap scenery in this and its still toon meshes are drawn as a handful of
 * merged meshes instead of one draw call each (see `batch.ts`). Moving,
 * fading, interactive or outline-toggling parts keep rendering normally, so it
 * is safe around whole areas.
 *
 * `cull`: hide the whole area while it is out of the camera's view. Batching
 * keeps every original mesh in the scene graph (React owns them), and three.js
 * walks all of them every frame (matrix updates, the render list) even though
 * they never draw: in the World that is ~3000 objects, most of a slow tablet's
 * frame. A hidden group is skipped in one step, and its batcher pauses too.
 * Only for scenery nobody needs to see or touch off screen.
 */
export default function StaticBatch({
  children,
  enabled = true,
  cull = false,
}: {
  children: ReactNode
  enabled?: boolean
  cull?: boolean
}) {
  const root = useRef<Group>(null)
  const out = useRef<Group>(null)
  const batcher = useRef<Batcher | null>(null)
  const view = useRef({ shown: true, sphere: null as Sphere | null, nextBounds: 0 })
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
  useEffect(() => {
    if (cull) return
    // switched off: show the area again
    view.current.shown = true
    if (root.current) root.current.visible = true
    if (out.current) out.current.visible = true
  }, [cull])
  useFrame(({ camera }) => {
    const now = performance.now()
    if (cull && root.current && out.current) {
      const v = view.current
      // Re-measure only while shown (a hidden area's contents are standing still).
      if (v.shown && now >= v.nextBounds) {
        v.nextBounds = now + AREA_CULL.boundsMs
        // (the merged meshes too: batched originals may be out of the tree)
        _box.setFromObject(root.current).union(_outBox.setFromObject(out.current))
        v.sphere = _box.isEmpty() ? null : _box.getBoundingSphere(v.sphere ?? new Sphere())
      }
      const inView = !v.sphere || sphereInView(camera, v.sphere, AREA_CULL.margin)
      if (inView !== v.shown) {
        v.shown = inView
        root.current.visible = inView
        out.current.visible = inView
        // back in view: measure again soon (things may have changed while away)
        if (inView) v.nextBounds = Math.min(v.nextBounds, now + 500)
      }
      // A hidden area's batcher waits: its sources would all look "hidden" to it.
      if (!inView) return
    }
    batcher.current?.tick(now)
  })
  return (
    <group>
      <group ref={root}>{children}</group>
      <group ref={out} />
    </group>
  )
}
