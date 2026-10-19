import { describe, expect, it } from 'vitest'
import { BufferAttribute, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshToonMaterial, SphereGeometry } from 'three'
import { bakeModel, backFaces, fewerSegments, glowToonMaterial } from '../bake'
import { outlineMaterial } from '../outlineMaterial'

const toon = (color: string, extra: Partial<ConstructorParameters<typeof MeshToonMaterial>[0]> = {}) => new MeshToonMaterial({ color, ...extra })

/** A tiny "creature": a body with an outline hull, a glowing eye, a double-sided shell and a hidden part. */
function model() {
  const root = new Group()
  root.visible = false // baked while hidden, as the game does
  const body = new Mesh(new SphereGeometry(1, 24, 18), toon('#ff0000'))
  body.scale.setScalar(0.3)
  body.position.set(0, 0.3, 0)
  const holder = new Group()
  const hull = new Mesh(body.geometry, outlineMaterial('#3a2c38', 2))
  hull.userData.toonOutlineHull = true
  holder.add(hull)
  body.add(holder)
  const eye = new Mesh(new SphereGeometry(1, 16, 12), toon('#ffffff', { emissive: new Color('#ffffff'), emissiveIntensity: 1 }))
  eye.scale.setScalar(0.05)
  eye.position.set(0.1, 0.45, 0.25)
  const shell = new Mesh(new SphereGeometry(1, 8, 6), toon('#00ff00', { side: DoubleSide }))
  shell.scale.setScalar(0.1)
  const hidden = new Mesh(new SphereGeometry(1, 8, 6), toon('#0000ff'))
  hidden.visible = false
  root.add(body, eye, shell, hidden)
  return { root, body }
}

describe('bakeModel', () => {
  it('merges visible parts into one coloured geometry with fewer segments, glow and a hull', () => {
    const { root } = model()
    const before = 24 * 18 * 2 + 16 * 12 * 2 + 8 * 6 * 2
    const baked = bakeModel(root, { maxSegments: 8 })
    expect(baked.triangles).toBeGreaterThan(50)
    expect(baked.triangles).toBeLessThan(before / 2)
    const color = baked.body.getAttribute('color') as BufferAttribute
    const glow = baked.body.getAttribute('bakedGlow') as BufferAttribute
    expect(color.count).toBe(baked.body.getAttribute('position').count)
    expect(glow.count).toBe(color.count)
    // the first vertex is the red body; no glow there
    expect(color.getX(0)).toBeCloseTo(1)
    expect(color.getY(0)).toBeCloseTo(0)
    expect(glow.getX(0)).toBe(0)
    // somewhere the eye glows white; nothing is blue (the hidden part is left out)
    let glowing = 0
    let blue = 0
    for (let i = 0; i < glow.count; i++) {
      if (glow.getX(i) > 0.9 && glow.getY(i) > 0.9) glowing++
      if (color.getZ(i) > 0.9 && color.getX(i) < 0.1) blue++
    }
    expect(glowing).toBeGreaterThan(0)
    expect(blue).toBe(0)
    expect(baked.hull).not.toBeNull()
    expect(baked.hullMaterial).toBe(outlineMaterial('#3a2c38', 2))
    // the body sits where it stood in the model (0.3 up, radius 0.3)
    baked.body.computeBoundingBox()
    expect(baked.body.boundingBox!.max.y).toBeCloseTo(0.6, 1)
  })

  it('bakes without a hull when the model wore no outlines (Fast graphics)', () => {
    const { root, body } = model()
    body.remove(body.children[0])
    expect(bakeModel(root).hull).toBeNull()
  })

  it('keeps cones and cylinders their own size when it trims their segments', () => {
    const cone = fewerSegments(new ConeGeometry(0.1, 0.3, 16), 6)
    expect(cone).toBeInstanceOf(ConeGeometry)
    cone.computeBoundingBox()
    expect(cone.boundingBox!.max.x).toBeLessThanOrEqual(0.1001)
    const cyl = fewerSegments(new CylinderGeometry(0.05, 0.08, 0.4, 16), 6) as CylinderGeometry
    expect(cyl.parameters).toMatchObject({ radiusTop: 0.05, radiusBottom: 0.08, height: 0.4, radialSegments: 6 })
  })

  it('re-tessellates spheres once and flips double-sided copies', () => {
    const g = new SphereGeometry(1, 24, 18)
    const f = fewerSegments(g, 8)
    expect((f as SphereGeometry).parameters.widthSegments).toBe(8)
    expect(fewerSegments(g, 8)).toBe(f)
    const small = new SphereGeometry(1, 6, 4)
    expect(fewerSegments(small, 8)).toBe(small)
    const b = backFaces(f)
    const n0 = (f.getAttribute('normal') as BufferAttribute).getY(0)
    expect((b.getAttribute('normal') as BufferAttribute).getY(0)).toBeCloseTo(-n0)
    expect(b.index!.getY(0)).toBe(f.index!.getZ(0))
  })

  it('makes the glow material once per look', () => {
    expect(glowToonMaterial()).toBe(glowToonMaterial())
    expect(glowToonMaterial({ opacity: 0.4 }).transparent).toBe(true)
    expect(glowToonMaterial({ opacity: 0.4 }).depthWrite).toBe(false)
  })
})
