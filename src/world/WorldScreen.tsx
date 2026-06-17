import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Vector3 } from 'three'
import Lights from '../home/world/Lights'
import WorldGround from './WorldGround'
import WorldCameraRig from './WorldCameraRig'
import WorldAvatar from './WorldAvatar'
import WorldHud from './WorldHud'
import WordProblemWoods from './areas/WordProblemWoods'
import FractionFalls from './areas/FractionFalls'

export default function WorldScreen() {
  const posRef = useRef(new Vector3(0, 0, 4))
  return (
    <div className="flex-1 relative">
      <Canvas shadows camera={{ position: [11, 13, 15], fov: 42 }} style={{ position: 'absolute', inset: 0 }}>
        <color attach="background" args={['#bfe3f2']} />
        <Lights />
        <WorldGround />
        <WordProblemWoods posRef={posRef} />
        <FractionFalls posRef={posRef} />
        <WorldCameraRig targetRef={posRef} />
        <WorldAvatar posRef={posRef} />
      </Canvas>
      <WorldHud />
    </div>
  )
}
