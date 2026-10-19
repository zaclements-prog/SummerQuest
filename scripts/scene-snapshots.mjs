#!/usr/bin/env node
/**
 * Pixel comparison of two scene frame dumps (see src/tutoring/motion/__tests__/sceneSnapshots.test.tsx).
 *
 *   node scripts/scene-snapshots.mjs <before-dir> <after-dir> [--scale 1.5] [--diffs out-dir]
 *
 * Every frame (lesson/step/time.svg) present in both dumps is rasterized in Chromium at
 * `--scale` (the Fire HD 10's 1.5 by default) and compared pixel by pixel. A pixel
 * "differs" when any channel moves by more than 8/255. Prints, per step, the frames
 * compared, frames with any difference and the worst frame; with --diffs writes the worst
 * frame of each changed step side by side (before | after | difference) as PNG.
 * Needs Playwright with Chromium (PLAYWRIGHT_MODULE / CHROMIUM_PATH to point at them).
 */
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [before, after] = process.argv.slice(2)
const flag = (n, d) => {
  const i = process.argv.indexOf(`--${n}`)
  return i >= 0 ? process.argv[i + 1] : d
}
const scale = Number(flag('scale', 1.5))
const diffsDir = flag('diffs', null)
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')

const frames = []
for (const lesson of readdirSync(before, { withFileTypes: true }).filter((d) => d.isDirectory()))
  for (const step of readdirSync(join(before, lesson.name), { withFileTypes: true }).filter((d) => d.isDirectory()))
    for (const f of readdirSync(join(before, lesson.name, step.name)).filter((f) => f.endsWith('.svg')).sort()) {
      const b = join(before, lesson.name, step.name, f)
      const a = join(after, lesson.name, step.name, f)
      if (existsSync(a)) frames.push({ step: `${lesson.name}/${step.name}`, t: f.replace('.svg', ''), b, a })
    }

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const page = await browser.newPage()
await page.setContent('<canvas id=a></canvas><canvas id=b></canvas>')

const byStep = new Map()
for (const fr of frames) {
  const sb = readFileSync(fr.b, 'utf8')
  const sa = readFileSync(fr.a, 'utf8')
  let r
  if (sb === sa) r = { diff: 0, total: 1 }
  else
    r = await page.evaluate(
      async ({ sb, sa, scale, wantImages }) => {
        const load = (svg) =>
          new Promise((res, rej) => {
            const img = new Image()
            img.onload = () => res(img)
            img.onerror = rej
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
          })
        const [ib, ia] = await Promise.all([load(sb), load(sa)])
        const w = Math.round(ib.width * scale)
        const h = Math.round(ib.height * scale)
        const px = (img) => {
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          const g = c.getContext('2d')
          g.drawImage(img, 0, 0, w, h)
          return { c, d: g.getImageData(0, 0, w, h).data }
        }
        const B = px(ib)
        const A = px(ia)
        let diff = 0
        const dc = document.createElement('canvas')
        dc.width = w
        dc.height = h
        const dg = dc.getContext('2d')
        const out = dg.createImageData(w, h)
        for (let i = 0; i < B.d.length; i += 4) {
          const m = Math.max(Math.abs(B.d[i] - A.d[i]), Math.abs(B.d[i + 1] - A.d[i + 1]), Math.abs(B.d[i + 2] - A.d[i + 2]), Math.abs(B.d[i + 3] - A.d[i + 3]))
          const hit = m > 8
          if (hit) diff++
          out.data[i] = hit ? 255 : 255
          out.data[i + 1] = hit ? 0 : 255
          out.data[i + 2] = hit ? 0 : 255
          out.data[i + 3] = 255
        }
        if (!wantImages) return { diff, total: w * h }
        dg.putImageData(out, 0, 0)
        const strip = document.createElement('canvas')
        strip.width = w * 3
        strip.height = h
        const sg = strip.getContext('2d')
        sg.drawImage(B.c, 0, 0)
        sg.drawImage(A.c, w, 0)
        sg.drawImage(dc, 2 * w, 0)
        return { diff, total: w * h, png: strip.toDataURL('image/png') }
      },
      { sb, sa, scale, wantImages: false },
    )
  const s = byStep.get(fr.step) ?? { frames: 0, changed: 0, worst: 0, worstT: null, worstFr: null }
  s.frames++
  if (r.diff > 0) s.changed++
  if (r.diff > s.worst) {
    s.worst = r.diff
    s.worstT = fr.t
    s.worstFr = fr
    s.total = r.total
  }
  byStep.set(fr.step, s)
}

let anyChange = false
for (const [step, s] of byStep) {
  const pct = s.worst ? ((100 * s.worst) / s.total).toFixed(3) : '0'
  if (s.changed) anyChange = true
  console.log(`${step.padEnd(28)} ${String(s.frames).padStart(4)} frames · ${String(s.changed).padStart(4)} differ · worst ${s.worst} px (${pct}%)${s.worstT ? ` at ${s.worstT}s` : ''}`)
}
if (diffsDir) {
  mkdirSync(diffsDir, { recursive: true })
  for (const [step, s] of byStep) {
    if (!s.worstFr) continue
    const sb = readFileSync(s.worstFr.b, 'utf8')
    const sa = readFileSync(s.worstFr.a, 'utf8')
    const { png } = await page.evaluate(
      async ({ sb, sa, scale }) => {
        const load = (svg) =>
          new Promise((res) => {
            const img = new Image()
            img.onload = () => res(img)
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
          })
        const [ib, ia] = await Promise.all([load(sb), load(sa)])
        const w = Math.round(ib.width * scale)
        const h = Math.round(ib.height * scale)
        const draw = (img) => {
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          c.getContext('2d').drawImage(img, 0, 0, w, h)
          return c
        }
        const B = draw(ib)
        const A = draw(ia)
        const bd = B.getContext('2d').getImageData(0, 0, w, h).data
        const ad = A.getContext('2d').getImageData(0, 0, w, h).data
        const strip = document.createElement('canvas')
        strip.width = w * 3
        strip.height = h
        const g = strip.getContext('2d')
        g.drawImage(B, 0, 0)
        g.drawImage(A, w, 0)
        const out = g.createImageData(w, h)
        for (let i = 0; i < bd.length; i += 4) {
          const m = Math.max(Math.abs(bd[i] - ad[i]), Math.abs(bd[i + 1] - ad[i + 1]), Math.abs(bd[i + 2] - ad[i + 2]), Math.abs(bd[i + 3] - ad[i + 3]))
          out.data[i] = 255
          out.data[i + 1] = m > 8 ? 0 : 255
          out.data[i + 2] = m > 8 ? 0 : 255
          out.data[i + 3] = 255
        }
        g.putImageData(out, 2 * w, 0)
        return { png: strip.toDataURL('image/png') }
      },
      { sb, sa, scale },
    )
    writeFileSync(join(diffsDir, `${step.replace('/', '_')}_${s.worstT}.png`), Buffer.from(png.split(',')[1], 'base64'))
  }
}
await browser.close()
console.log(anyChange ? '\nSome frames differ (see above).' : '\nAll frames pixel-identical.')
