import { useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'
import Lights from '../home/world/Lights'
import WorldGround from './WorldGround'
import WordProblemWoods from './areas/WordProblemWoods'
import FractionFalls from './areas/FractionFalls'
import WritingWorkshop from './areas/WritingWorkshop'
import House from './areas/House'

/** Free-orbit gallery of the themed areas for visual iteration (no avatar/follow-cam). */
export default function WorldStudio() {
  const dummy = useRef(new Vector3(999, 0, 999)) // far away — NPC prompts never trigger
  return (
    <>
      <OrbitControls makeDefault target={[0, 1, -6]} />
      <Lights />
      <WorldGround />
      <WordProblemWoods posRef={dummy} />
      <FractionFalls posRef={dummy} />
      <WritingWorkshop posRef={dummy} />
      <House />
    </>
  )
}
