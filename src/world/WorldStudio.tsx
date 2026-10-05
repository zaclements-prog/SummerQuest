import { useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'
import WorldScene from './WorldScene'
import { areaById } from './worldLayout'

/**
 * Free-orbit gallery for visual iteration (no avatar / follow-cam):
 *   /world?studio=all                 — the whole island from above
 *   /world?studio=<areaId>            — orbit around one area (e.g. fraction-falls)
 *   /world?studio=<areaId>&cam=dx,dy,dz — camera offset from the area center
 *   /world?studio=at&x=..&z=..&cam=.. — look at any point
 */
export default function WorldStudio({ focus, at, cam }: { focus: string; at?: [number, number]; cam?: [number, number, number] }) {
  const dummy = useRef(new Vector3(999, 0, 999)) // far away — NPC prompts never trigger
  const camera = useThree((s) => s.camera)
  const a = focus === 'all' ? undefined : areaById(focus)
  const [x, z] = at ?? a?.worldPos ?? [0, 0]
  const close = !!(a || at)
  const [ox, oy, oz] = cam ?? (close ? [9, 9, 11] : [0, 62, 58])
  useLayoutEffect(() => {
    camera.position.set(x + ox, oy, z + oz)
  }, [camera, x, z, ox, oy, oz])
  return (
    <>
      <OrbitControls makeDefault target={[x, close ? 1 : 0, z]} />
      <WorldScene posRef={dummy} />
    </>
  )
}
