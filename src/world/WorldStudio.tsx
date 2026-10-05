import { useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'
import WorldScene from './WorldScene'
import { areaById } from './worldLayout'

/**
 * Free-orbit gallery for visual iteration (no avatar / follow-cam):
 *   /world?studio=all          — the whole island from above
 *   /world?studio=<areaId>     — orbit around one area (e.g. fraction-falls)
 */
export default function WorldStudio({ focus }: { focus: string }) {
  const dummy = useRef(new Vector3(999, 0, 999)) // far away — NPC prompts never trigger
  const camera = useThree((s) => s.camera)
  const a = focus === 'all' ? undefined : areaById(focus)
  const [x, z] = a?.worldPos ?? [0, 0]
  useLayoutEffect(() => {
    if (a) camera.position.set(x + 9, 9, z + 11)
    else camera.position.set(0, 62, 58)
  }, [a, camera, x, z])
  return (
    <>
      <OrbitControls makeDefault target={[x, a ? 1 : 0, z]} />
      <WorldScene posRef={dummy} />
    </>
  )
}
