import { describe, it, expect, vi } from 'vitest'
import { BoxGeometry, DataTexture, Group, Mesh, MeshBasicMaterial, MeshToonMaterial, Scene, ShaderMaterial } from 'three'
import { classifyDevice, isTouchFirst } from '../deviceClass'
import { RECOVERY, mayAutoRecover, pruneRecoveries } from '../recovery'
import { collectGpuResources, registerSharedGpuCache, releaseGpuResources } from '../release'

describe('classifyDevice', () => {
  it('a mouse/trackpad-first screen is a desktop, whatever its size', () => {
    expect(classifyDevice({ coarse: false, screenW: 1440, screenH: 900 })).toBe('desktop')
    expect(classifyDevice({ coarse: false, screenW: 1024, screenH: 768 })).toBe('desktop')
  })

  it('touch-first: phones by their short side, tablets above it (either orientation)', () => {
    expect(classifyDevice({ coarse: true, screenW: 390, screenH: 844 })).toBe('phone')
    expect(classifyDevice({ coarse: true, screenW: 844, screenH: 390 })).toBe('phone')
    expect(classifyDevice({ coarse: true, screenW: 412, screenH: 915 })).toBe('phone')
    expect(classifyDevice({ coarse: true, screenW: 810, screenH: 1080 })).toBe('tablet')
    expect(classifyDevice({ coarse: true, screenW: 1366, screenH: 1024 })).toBe('tablet')
    expect(classifyDevice({ coarse: true, screenW: 712, screenH: 1138 })).toBe('tablet')
  })

  it('any very small screen is a phone; unknown sizes fall back on the pointer', () => {
    expect(classifyDevice({ coarse: false, screenW: 360, screenH: 740 })).toBe('phone')
    expect(classifyDevice({ coarse: true, screenW: 0, screenH: 0 })).toBe('tablet')
    expect(classifyDevice({ coarse: false, screenW: 0, screenH: 0 })).toBe('desktop')
  })

  it('touch-first means phone or tablet', () => {
    expect(isTouchFirst('phone')).toBe(true)
    expect(isTouchFirst('tablet')).toBe(true)
    expect(isTouchFirst('desktop')).toBe(false)
  })
})

describe('context-loss recovery policy', () => {
  it('remounts on its own a few times, then waits for a tap', () => {
    const t0 = 1_000_000
    const recent: number[] = []
    for (let i = 0; i < RECOVERY.maxAuto; i++) {
      expect(mayAutoRecover(recent, t0 + i * 1000)).toBe(true)
      recent.push(t0 + i * 1000)
    }
    expect(mayAutoRecover(recent, t0 + 5000)).toBe(false)
    // …and trusts itself again once the burst is old
    expect(mayAutoRecover(recent, t0 + RECOVERY.windowMs + 5000)).toBe(true)
  })

  it('keeps a bounded history', () => {
    const now = 10_000_000
    expect(pruneRecoveries([now - RECOVERY.windowMs - 1, now - 10, now - 5], now)).toEqual([now - 10, now - 5])
  })
})

describe('GPU resource release', () => {
  it('collects every geometry, material and texture under a scene', () => {
    const scene = new Scene()
    const tex = new DataTexture(new Uint8Array([1, 2, 3, 4]), 4, 1)
    const geo = new BoxGeometry()
    const toon = new MeshToonMaterial({ gradientMap: tex })
    const shader = new ShaderMaterial({ uniforms: { map: { value: tex } } })
    const g = new Group()
    g.add(new Mesh(geo, toon))
    g.add(new Mesh(geo, [toon, new MeshBasicMaterial()]))
    scene.add(g, new Mesh(new BoxGeometry(), shader))
    const found = collectGpuResources(scene)
    expect(found.has(geo)).toBe(true)
    expect(found.has(toon)).toBe(true)
    expect(found.has(tex)).toBe(true)
    expect(found.has(shader)).toBe(true)
    expect(found.size).toBe(6) // 2 geometries, 3 materials, 1 texture
  })

  it("dispatches dispose on the scene's resources and every registered shared cache", () => {
    const shared = new BoxGeometry()
    registerSharedGpuCache(() => [shared])
    const sceneGeo = new BoxGeometry()
    const scene = new Scene()
    scene.add(new Mesh(sceneGeo, new MeshToonMaterial()))
    const onShared = vi.fn()
    const onScene = vi.fn()
    shared.addEventListener('dispose', onShared)
    sceneGeo.addEventListener('dispose', onScene)
    releaseGpuResources(scene)
    expect(onShared).toHaveBeenCalledTimes(1)
    expect(onScene).toHaveBeenCalledTimes(1)
    // still usable afterwards (the next canvas uploads it again)
    expect(shared.getAttribute('position').count).toBeGreaterThan(0)
  })
})
