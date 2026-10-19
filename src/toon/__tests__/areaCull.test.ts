import { describe, it, expect } from 'vitest'
import { PerspectiveCamera, Sphere, Vector3 } from 'three'
import { sphereInView } from '../areaCull'

// StaticBatch hides an area while its bounds (plus a margin) are out of the camera's view.

function camera() {
  const c = new PerspectiveCamera(38, 1.6, 0.3, 900)
  c.position.set(10.5, 12.5, 11)
  c.lookAt(0, 0, 0)
  c.updateMatrixWorld()
  return c
}

describe('sphereInView', () => {
  it('sees an area the camera looks at', () => {
    expect(sphereInView(camera(), new Sphere(new Vector3(0, 0, 0), 3), 0)).toBe(true)
  })
  it('skips an area well off to the side or behind the camera', () => {
    expect(sphereInView(camera(), new Sphere(new Vector3(-40, 0, 30), 4), 0)).toBe(false)
    expect(sphereInView(camera(), new Sphere(new Vector3(30, 0, 30), 4), 0)).toBe(false)
  })
  it('keeps an area just past the edge when the margin reaches it', () => {
    const near = new Sphere(new Vector3(-22, 0, 8), 1)
    expect(sphereInView(camera(), near, 0)).toBe(false)
    expect(sphereInView(camera(), near, 12)).toBe(true)
  })
})
