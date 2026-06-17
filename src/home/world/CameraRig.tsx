import { OrbitControls } from '@react-three/drei'

export default function CameraRig() {
  return (
    <OrbitControls
      makeDefault
      enablePan
      screenSpacePanning={false}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 3}
      minDistance={6}
      maxDistance={22}
      target={[0, 0, 0]}
    />
  )
}
