import { describe, it, expect } from 'vitest'
import { BoxGeometry, Color, Group, Matrix4, Mesh, MeshBasicMaterial, MeshToonMaterial, Scene, Vector3 } from 'three'
import type { BufferAttribute, Material } from 'three'
import { BATCH, Batcher, batchKey, mergeParts } from '../batch'

const toon = (color: string, opts: Partial<ConstructorParameters<typeof MeshToonMaterial>[0]> = {}) => new MeshToonMaterial({ color, ...opts })

/** A scene with `n` toon boxes under a batch root, plus the batcher. */
function setup(n = 4) {
  const scene = new Scene()
  const holder = new Group()
  const root = new Group()
  const out = new Group()
  holder.add(root, out)
  scene.add(holder)
  const geo = new BoxGeometry(1, 1, 1)
  const meshes = Array.from({ length: n }, (_, i) => {
    const m = new Mesh(geo, toon(i % 2 ? '#ff0000' : '#00ff00'))
    m.position.set(i * 2, 0, 0)
    root.add(m)
    return m
  })
  const b = new Batcher(root, out)
  let t = 0
  /** advance one rendered frame (the renderer updates world matrices) */
  const frame = () => {
    scene.updateMatrixWorld()
    t += 400
    b.tick(t)
  }
  const settle = () => {
    for (let i = 0; i < 4 * BATCH.scanFrames; i++) frame()
  }
  const drawn = () => {
    const list: Mesh[] = []
    scene.traverse((o) => {
      if ((o as Mesh).isMesh && o.layers.mask !== 0) list.push(o as Mesh)
    })
    return list
  }
  return { scene, root, out, meshes, b, frame, settle, drawn }
}

describe('mergeParts', () => {
  it('bakes transforms, colours and indices into one geometry', () => {
    const g = new BoxGeometry(1, 1, 1)
    const a = new Matrix4().makeTranslation(10, 0, 0)
    const b = new Matrix4().makeScale(2, 2, 2)
    const merged = mergeParts(
      [
        { geometry: g, matrix: a, color: new Color(1, 0, 0) },
        { geometry: g, matrix: b, color: new Color(0, 0, 1) },
      ],
      true,
    )
    const n = g.getAttribute('position').count
    expect(merged.getAttribute('position').count).toBe(2 * n)
    expect(merged.index!.count).toBe(2 * g.index!.count)
    const pos = merged.getAttribute('position') as BufferAttribute
    expect(pos.getX(0)).toBeCloseTo(g.getAttribute('position').getX(0) + 10)
    expect(pos.getX(n)).toBeCloseTo(g.getAttribute('position').getX(0) * 2)
    const col = merged.getAttribute('color') as BufferAttribute
    expect([col.getX(0), col.getY(0), col.getZ(0)]).toEqual([1, 0, 0])
    expect([col.getX(n), col.getY(n), col.getZ(n)]).toEqual([0, 0, 1])
    // second part's indices point at its own vertices
    expect(Math.min(...Array.from(merged.index!.array).slice(g.index!.count))).toBe(n)
    expect(merged.boundingSphere).not.toBeNull()
  })

  it('keeps faces facing out under a mirroring transform', () => {
    const g = new BoxGeometry(1, 1, 1)
    const merged = mergeParts([{ geometry: g, matrix: new Matrix4().makeScale(-1, 1, 1) }], false)
    // first triangle: its winding normal must agree with the (transformed) vertex normal
    const P = merged.getAttribute('position') as BufferAttribute
    const N = merged.getAttribute('normal') as BufferAttribute
    const [i0, i1, i2] = Array.from(merged.index!.array).slice(0, 3)
    const v = (i: number) => new Vector3().fromBufferAttribute(P, i)
    const face = new Vector3().crossVectors(v(i1).sub(v(i0)), v(i2).sub(v(i0))).normalize()
    expect(face.dot(new Vector3().fromBufferAttribute(N, i0))).toBeGreaterThan(0.9)
  })
})

describe('batchKey', () => {
  it('takes opaque toon looks and see-through ones that skip depth writes', () => {
    const m: Mesh<BoxGeometry, Material> = new Mesh(new BoxGeometry(), toon('#fff'))
    expect(batchKey(m)).not.toBeNull()
    m.material = toon('#fff', { transparent: true, opacity: 0.14, depthWrite: false })
    expect(batchKey(m)).not.toBeNull()
    m.material = toon('#fff', { transparent: true, opacity: 0.7, depthWrite: true })
    expect(batchKey(m)).toBeNull()
    m.material = new MeshBasicMaterial()
    expect(batchKey(m)).toBeNull()
  })

  it('separates looks: emissive, side and shadow flags', () => {
    const a = new Mesh(new BoxGeometry(), toon('#f00'))
    const b = new Mesh(new BoxGeometry(), toon('#00f'))
    expect(batchKey(a)).toBe(batchKey(b)) // colour moves into vertex colours
    b.material = toon('#00f', { emissive: '#ffffff' })
    expect(batchKey(b)).not.toBe(batchKey(a))
    b.material = toon('#00f')
    b.castShadow = true
    expect(batchKey(b)).not.toBe(batchKey(a))
  })
})

describe('Batcher', () => {
  it('draws still meshes as one merged mesh per look', () => {
    const s = setup(6)
    s.settle()
    expect(s.b.batchedCount).toBe(6)
    const drawn = s.drawn()
    expect(drawn).toHaveLength(1)
    expect(drawn[0].userData.batched).toBe(true)
    expect((drawn[0].material as MeshToonMaterial).vertexColors).toBe(true)
  })

  it('hands a mesh back the moment it moves, and never batches a mover again', () => {
    const s = setup(3)
    s.settle()
    expect(s.drawn()).toHaveLength(1)
    s.meshes[1].position.y = 1
    s.frame()
    expect(s.drawn()).toContain(s.meshes[1])
    expect(s.b.batchedCount).toBe(2)
    // keeps moving: stays a normal mesh
    for (let i = 0; i < 20; i++) {
      s.meshes[1].position.y = i % 2
      s.frame()
    }
    expect(s.drawn()).toContain(s.meshes[1])
    expect(s.b.batchedCount).toBe(2)
  })

  it('merges the parts riding on an animated group under that group, so they move with it', () => {
    const s = setup(1)
    const npc = new Group()
    const geo = new BoxGeometry(0.5, 0.5, 0.5)
    const parts = [new Mesh(geo, toon('#ffaa00')), new Mesh(geo, toon('#222222')), new Mesh(geo, toon('#ffffff'))]
    parts.forEach((p, i) => {
      p.position.set(i * 0.4, 1, 0)
      npc.add(p)
    })
    s.root.add(npc)
    let t = 0
    const bob = () => {
      t += 1
      npc.position.y = Math.sin(t) * 0.1
      s.frame()
    }
    for (let i = 0; i < 6 * BATCH.scanFrames; i++) bob()
    expect(s.b.batchedCount).toBe(4) // the still box + the three NPC parts
    const underNpc = npc.children.filter((c) => c.userData.batched)
    expect(underNpc).toHaveLength(1)
    for (const p of parts) expect(p.layers.mask).toBe(0)
    // still riding along: nothing is handed back while it bobs
    for (let i = 0; i < 10; i++) bob()
    expect(s.b.batchedCount).toBe(4)
    // a part that starts moving on its own is handed back
    parts[1].rotation.z = 0.5
    bob()
    expect(parts[1].layers.mask).toBe(1)
    expect(s.b.batchedCount).toBe(3)
  })

  it('hands back a mesh whose look changes and re-batches it once it holds still', () => {
    const s = setup(2)
    s.settle()
    s.meshes[0].material = toon('#123456', { transparent: true, opacity: 0.14, depthWrite: false })
    s.frame()
    expect(s.drawn()).toContain(s.meshes[0])
    s.settle()
    expect(s.drawn()).not.toContain(s.meshes[0])
    expect(s.b.batchedCount).toBe(2)
    expect(s.drawn()).toHaveLength(2) // opaque + faded looks
  })

  it('drops unmounted or hidden meshes from the batch', () => {
    const s = setup(3)
    s.settle()
    s.root.remove(s.meshes[2])
    s.meshes[1].visible = false
    s.frame()
    expect(s.b.batchedCount).toBe(1)
    expect(s.drawn().filter((m) => m.userData.batched)).toHaveLength(1)
  })

  it('never batches interactive meshes (or ones under a group with handlers)', () => {
    const s = setup(2)
    ;(s.meshes[0] as Mesh & { __r3f?: unknown }).__r3f = { eventCount: 1 }
    s.settle()
    expect(s.b.batchedCount).toBe(1)
    expect(s.drawn()).toContain(s.meshes[0])
  })

  it('gives everything back on dispose', () => {
    const s = setup(3)
    s.settle()
    s.b.dispose()
    expect(s.out.children).toHaveLength(0)
    for (const m of s.meshes) expect(m.layers.mask).toBe(1)
  })
})
