#!/usr/bin/env node
/**
 * Frame-rate probe for SummerQuest running on a real Android / Fire tablet.
 *
 *   node scripts/fire-perf.mjs /world [/home ...] [--settle 6] [--seconds 8] [--profile]
 *
 * Needs: the DEBUG APK installed and open on a tablet connected over USB (`adb devices`),
 * with an explorer already created. Debug builds let the WebView be inspected
 * (MainActivity); release builds don't, so this can't attach to them.
 *
 * A route of `.` measures whatever is on screen now (no navigation: e.g. a lesson you
 * started by tapping Watch, since narration only starts after a tap).
 *
 * For each route it switches screens in-app (no reload), waits `--settle` seconds for
 * loading and scenery merging, then measures `--seconds` of frames:
 *   - frame times (avg / p50 / p95 / worst) and fps, counted on requestAnimationFrame;
 *   - WebGL draw calls and triangles per frame, counted on the context's draw methods;
 *   - the canvas's drawn size and the page's devicePixelRatio;
 *   - long tasks (> 50 ms main-thread blocks);
 *   - with --profile, the functions that spent the most CPU (self time);
 *   - with --trace, where the browser's own time goes (style, layout, paint, raster…), from a
 *     DevTools timeline trace: total ms per event type over the window;
 *   - with --throttle N, the page's CPU slowed N× (DevTools CPU throttling) to stand in
 *     for a slower tablet: ~3× on a Fire HD 10 (2023) ≈ a Fire 7's quad Cortex-A53;
 *   - the scene census: objects three.js walks every frame, meshes, meshes it walks but
 *     never draws (layer mask 0: the batcher's hidden originals), and lights.
 * Results are printed as a table and written to perf-results/<timestamp>.json (not committed).
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const APP = 'com.summerquest.app'
const PORT = Number(process.env.PERF_PORT ?? 9877)
const ADB = process.env.ADB ?? join(process.env.ANDROID_HOME ?? join(homedir(), 'Library/Android/sdk'), 'platform-tools/adb')

const args = process.argv.slice(2)
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? Number(args[i + 1]) : def
}
const settle = flag('settle', 6)
const throttle = flag('throttle', 1)
const seconds = flag('seconds', 8)
const profile = args.includes('--profile')
const trace = args.includes('--trace')
// --eval "<js>": run in the page after settling, before measuring (experiments; `R` = the
// renderer, `S` = the scene, `gl` = its WebGL context)
const evalIdx = args.indexOf('--eval')
const experiment = evalIdx >= 0 ? args[evalIdx + 1] : null
const routes = args.filter((a, i) => (a.startsWith('/') || a === '.') && !(i > 0 && args[i - 1].startsWith('--')))
if (routes.length === 0) routes.push('/world')

const adb = (...a) => execFileSync(ADB, a, { encoding: 'utf8' }).trim()
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000))

// ── Attach ───────────────────────────────────────────────────────────────────
let pid = ''
try {
  pid = adb('shell', 'pidof', APP)
} catch {
  // not running
}
if (!pid) {
  adb('shell', 'am', 'start', '-n', `${APP}/.MainActivity`)
  await sleep(6)
  pid = adb('shell', 'pidof', APP)
}
adb('forward', `tcp:${PORT}`, `localabstract:webview_devtools_remote_${pid}`)
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = targets.find((t) => t.type === 'page')
if (!page) throw new Error('No inspectable page: is the DEBUG build installed and open?')

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res, rej) => {
  ws.onopen = res
  ws.onerror = rej
})
let nextId = 1
const pending = new Map()
const traceEvents = []
let traceDone = null
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.method === 'Tracing.dataCollected') traceEvents.push(...msg.params.value)
  if (msg.method === 'Tracing.tracingComplete') traceDone?.()
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) rej(new Error(msg.error.message))
    else res(msg.result)
  }
}
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = nextId++
    pending.set(id, { res, rej })
    ws.send(JSON.stringify({ id, method, params }))
  })
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'evaluate failed')
  return r.result.value
}

// ── In-page counters (installed once; prototype patches reach existing contexts) ──
await evaluate(`(() => {
  if (window.__sqPerf) return
  const P = (window.__sqPerf = { draws: 0, tris: 0, frames: [], longMs: 0, longN: 0, on: false })
  const TRI = 4 // gl.TRIANGLES
  const patch = (proto) => {
    if (!proto) return
    for (const [name, countArg, modeArg, instArg] of [
      ['drawArrays', 2, 0, -1], ['drawElements', 1, 0, -1],
      ['drawArraysInstanced', 2, 0, 3], ['drawElementsInstanced', 1, 0, 4],
      ['drawRangeElements', 3, 0, -1],
    ]) {
      const orig = proto[name]
      if (!orig) continue
      proto[name] = function (...a) {
        if (P.on) {
          P.draws++
          if (a[modeArg] === TRI) P.tris += (a[countArg] / 3) * (instArg >= 0 ? a[instArg] : 1)
        }
        return orig.apply(this, a)
      }
    }
  }
  // three.js announces each new Scene to __THREE_DEVTOOLS__: keep the latest one
  if (!window.__THREE_DEVTOOLS__) window.__THREE_DEVTOOLS__ = new EventTarget()
  window.__THREE_DEVTOOLS__.addEventListener('observe', (e) => {
    if (e.detail && e.detail.isScene) P.scene = new WeakRef(e.detail)
    if (e.detail && e.detail.isWebGLRenderer) P.renderer = new WeakRef(e.detail)
  })
  patch(window.WebGLRenderingContext && WebGLRenderingContext.prototype)
  patch(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype)
  let last = 0
  const tick = (t) => {
    if (P.on && last) P.frames.push(t - last)
    last = t
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  try {
    new PerformanceObserver((l) => {
      if (!P.on) return
      for (const e of l.getEntries()) { P.longMs += e.duration; P.longN++ }
    }).observe({ type: 'longtask', buffered: false })
  } catch {}
})()`)

if (throttle !== 1) await send('Emulation.setCPUThrottlingRate', { rate: throttle })
const results = []
for (const route of routes) {
  if (route === '.') {
    await sleep(settle)
  } else {
  // via a 2D screen, so the route's 3D scene is built fresh (and announced) after the hook
  await evaluate(`(() => { history.pushState({}, '', '/progress'); dispatchEvent(new PopStateEvent('popstate')) })()`)
  await sleep(1)
  await evaluate(`(() => { history.pushState({}, '', ${JSON.stringify(route)}); dispatchEvent(new PopStateEvent('popstate')) })()`)
  await sleep(settle)
  }
  if (experiment) {
    const out = await evaluate(`(() => { const R = window.__sqPerf.renderer?.deref(), S = window.__sqPerf.scene?.deref(), gl = R?.getContext(); return (${experiment}) })()`)
    console.log(`  eval → ${JSON.stringify(out)}`)
    await sleep(1)
  }
  await evaluate(`Object.assign(window.__sqPerf, { draws: 0, tris: 0, frames: [], longMs: 0, longN: 0, on: true })`)
  if (trace) {
    traceEvents.length = 0
    await send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' })
  }
  if (profile) {
    await send('Profiler.enable')
    await send('Profiler.setSamplingInterval', { interval: 500 })
    await send('Profiler.start')
  }
  await sleep(seconds)
  const raw = await evaluate(`(() => {
    const P = window.__sqPerf
    P.on = false
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]
    return { frames: P.frames, draws: P.draws, tris: P.tris, longMs: P.longMs, longN: P.longN,
      canvas: c ? [c.width, c.height] : null, css: c ? [c.clientWidth, c.clientHeight] : null,
      dpr: devicePixelRatio, path: location.pathname, census: census() }
    function census() {
      const scene = P.scene && P.scene.deref()
      if (!scene) return null
      const c = { objects: 0, meshes: 0, hiddenMeshes: 0, autoMatrix: 0, lights: 0 }
      scene.traverseVisible((o) => {
        c.objects++
        if (o.matrixAutoUpdate) c.autoMatrix++
        if (o.isLight) c.lights++
        if (o.isMesh) {
          c.meshes++
          if (o.layers.mask === 0) c.hiddenMeshes++
        }
      })
      return c
    }
  })()`)
  let timeline = []
  if (trace) {
    const done = new Promise((r) => (traceDone = r))
    await send('Tracing.end')
    await done
    timeline = timelineTotals(traceEvents)
  }
  let hot = []
  if (profile) {
    const { profile: prof } = await send('Profiler.stop')
    hot = hotFunctions(prof)
  }
  const f = [...raw.frames].sort((a, b) => a - b)
  const n = f.length || 1
  const avg = f.reduce((a, b) => a + b, 0) / n
  const pct = (p) => f[Math.min(f.length - 1, Math.floor(f.length * p))] ?? 0
  const r = {
    route,
    at: raw.path,
    fps: +(1000 / avg).toFixed(1),
    avgMs: +avg.toFixed(1),
    p50Ms: +pct(0.5).toFixed(1),
    p95Ms: +pct(0.95).toFixed(1),
    worstMs: +(f[f.length - 1] ?? 0).toFixed(1),
    drawsPerFrame: Math.round(raw.draws / n),
    trisPerFrame: Math.round(raw.tris / n),
    canvas: raw.canvas ? raw.canvas.join('×') : '—',
    dpr: raw.dpr,
    longTasks: `${raw.longN} (${Math.round(raw.longMs)} ms)`,
    census: raw.census,
    timeline,
    hot,
  }
  results.push(r)
  console.log(`\n${route}  (measured on ${raw.path})`)
  console.log(`  ${r.fps} fps · avg ${r.avgMs} ms · p50 ${r.p50Ms} · p95 ${r.p95Ms} · worst ${r.worstMs}`)
  console.log(`  ${r.drawsPerFrame} draws/frame · ${r.trisPerFrame.toLocaleString()} tris/frame · canvas ${r.canvas} (dpr ${r.dpr})`)
  console.log(`  long tasks: ${r.longTasks}`)
  if (r.census) {
    const c = r.census
    console.log(`  scene: ${c.objects} objects walked/frame (${c.autoMatrix} re-composed), ${c.meshes} meshes (${c.hiddenMeshes} never drawn), ${c.lights} lights`)
  }
  for (const e of timeline) console.log(`    ${e.ms.toFixed(0).padStart(6)} ms  ${e.name} (${e.n}×)`)
  for (const h of hot) console.log(`    ${h.ms.toFixed(0).padStart(6)} ms  ${h.fn}`)
}

if (throttle !== 1) await send('Emulation.setCPUThrottlingRate', { rate: 1 })
ws.close()
adb('forward', '--remove', `tcp:${PORT}`)
const model = adb('shell', 'getprop', 'ro.product.model')
mkdirSync('perf-results', { recursive: true })
const file = join('perf-results', `${new Date().toISOString().replace(/[:.]/g, '-')}-${model}.json`)
writeFileSync(file, JSON.stringify({ model, throttle, settle, seconds, results }, null, 2))
console.log(`\nSaved ${file}`)

/** The functions with the most self time in a CPU profile (top 15). */
function hotFunctions(prof) {
  const dt = new Map()
  const ids = prof.samples ?? []
  const deltas = prof.timeDeltas ?? []
  for (let i = 0; i < ids.length; i++) dt.set(ids[i], (dt.get(ids[i]) ?? 0) + (deltas[i] ?? 0))
  const by = new Map()
  for (const node of prof.nodes) {
    const us = dt.get(node.id) ?? 0
    if (!us) continue
    const cf = node.callFrame
    const file = cf.url ? cf.url.split('/').pop() : ''
    const key = `${cf.functionName || '(anonymous)'} ${file}${file ? `:${cf.lineNumber + 1}:${cf.columnNumber + 1}` : ''}`
    by.set(key, (by.get(key) ?? 0) + us)
  }
  return [...by.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([fn, us]) => ({ fn, ms: us / 1000 }))
}

/** Total time per timeline event type (complete events with a duration), top 14. */
function timelineTotals(events) {
  const WANT = new Set(['UpdateLayoutTree', 'Layout', 'PrePaint', 'Paint', 'Layerize', 'UpdateLayer', 'CompositeLayers',
    'RasterTask', 'GPUTask', 'FunctionCall', 'FireAnimationFrame', 'EventDispatch', 'HitTest', 'ScrollLayer',
    'Commit', 'DecodeImage', 'ParseHTML', 'TimerFire', 'v8.run', 'MajorGC', 'MinorGC', 'V8.GC_SCAVENGER', 'PaintImage'])
  const by = new Map()
  for (const e of events) {
    if (e.ph !== 'X' || !WANT.has(e.name)) continue
    const t = by.get(e.name) ?? { ms: 0, n: 0 }
    t.ms += (e.dur ?? 0) / 1000
    t.n++
    by.set(e.name, t)
  }
  return [...by.entries()].map(([name, t]) => ({ name, ...t })).sort((a, b) => b.ms - a.ms).slice(0, 14)
}
