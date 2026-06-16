import CameraRig from './CameraRig'
import Lights from './Lights'
import RoomShell from './RoomShell'
import TileGrid from './TileGrid'

export default function HomeWorld() {
  return (
    <>
      <CameraRig />
      <Lights />
      <RoomShell />
      <TileGrid />
    </>
  )
}
