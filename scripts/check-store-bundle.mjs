// Post-build gate for the app-store build (`npm run build:store`). SummerQuest is
// listed as a child-directed app, so the bundle must not be able to reach any
// server. Scans dist/ and fails the build when:
//   - the local-AI writing feeder survived (`/api/llm`, `chat/completions`);
//   - a fetch() targets anything but a same-origin relative path, or a target
//     it can't see (a variable) that isn't a known library loader below;
//   - another way out shows up: sendBeacon, WebSocket, EventSource, or an
//     import() of a remote URL;
//   - the HTML or CSS pulls a resource (or links) to another origin.
// Library error messages carry https documentation links, so a bare URL inside
// a string is NOT a failure: only places where a request is actually made are.
//
//   node scripts/check-store-bundle.mjs [distDir]
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const DIST = process.argv[2] ?? 'dist'

/** Strings that only the local-AI feeder uses. */
const BANNED = ['/api/llm', 'chat/completions']

/** Other ways a page can send data out. Any use at all fails. */
const CHANNELS = [
  { re: /\bsendBeacon\s*\(/g, what: 'navigator.sendBeacon()' },
  { re: /\bnew\s+WebSocket\s*\(/g, what: 'new WebSocket()' },
  { re: /\bnew\s+EventSource\s*\(/g, what: 'new EventSource()' },
]

/**
 * fetch() calls inside libraries whose URL is a variable. Each was checked:
 * the app never hands them a remote URL. Matched on the minified code around
 * the call; a library update that changes it fails the check until someone
 * looks again (then update the pattern here).
 */
const KNOWN_DYNAMIC_FETCHES = [
  {
    name: "Vite's modulepreload polyfill (fetches the bundle's own <link rel=modulepreload> chunks)",
    test: (before, after) => /modulepreload/.test(before) && /^\(\w+\.href\b/.test(after),
  },
  {
    name: 'three.js FileLoader (no 3D model or file loaders are used: every scene is built in code)',
    test: (_before, after) => /FileLoader/.test(after.slice(0, 300)),
  },
  {
    name: 'three.js ImageBitmapLoader (no textures are loaded from URLs)',
    test: (_before, after) => /createImageBitmap/.test(after.slice(0, 300)),
  },
]

const TEXT = new Set(['.js', '.mjs', '.cjs', '.html', '.css', '.json', '.svg', '.txt', '.webmanifest'])

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (TEXT.has(extname(name).toLowerCase())) out.push(p)
  }
  return out
}

/** A request to `url` stays on this device / this app's own origin. */
function isLocalTarget(url) {
  if (url.startsWith('//') || url.startsWith('\\\\')) return false // protocol-relative: another host
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)
  if (!scheme) return true // "/tts/…", "./x", "x": same origin
  return ['data', 'blob'].includes(scheme[1].toLowerCase()) // in-memory, never the network
}

/**
 * The first argument of the fetch( at `at` (index just past the paren):
 * { kind: 'literal', value } (for a template literal: its leading static text) |
 * { kind: 'dynamic', name } (a variable, or a template that starts with one) |
 * { kind: 'none' } (a mention in a message, like "fetch() not supported").
 * Minified names are reused in every scope, so a variable is never "resolved".
 */
function firstArg(code, at) {
  let i = at
  while (/\s/.test(code[i] ?? '')) i++
  const c = code[i]
  if (c === ')' || c === undefined) return { kind: 'none' }
  if (c === '"' || c === "'") {
    let j = i + 1
    while (j < code.length && code[j] !== c) j += code[j] === '\\' ? 2 : 1
    return { kind: 'literal', value: code.slice(i + 1, j) }
  }
  if (c === '`') {
    let j = i + 1
    while (j < code.length && code[j] !== '`' && !(code[j] === '$' && code[j + 1] === '{')) j += code[j] === '\\' ? 2 : 1
    const prefix = code.slice(i + 1, j)
    if (code[j] === '`') return { kind: 'literal', value: prefix }
    // `${…}…`: where it goes depends on a variable
    if (prefix === '') return { kind: 'dynamic', name: code.slice(j, code.indexOf('}', j) + 1 || j + 20) }
    return { kind: 'literal', value: prefix }
  }
  const m = /^[\w$.[\]]+/.exec(code.slice(i))
  return { kind: 'dynamic', name: m ? m[0] : code.slice(i, i + 20) }
}

const failures = []
const notes = []
let fetches = 0

function where(file, code, index) {
  const line = code.slice(0, index).split('\n').length
  return `${relative('.', file)}:${line}`
}

function snippet(code, index) {
  return JSON.stringify(code.slice(Math.max(0, index - 60), index + 80))
}

function checkFetches(file, code) {
  const re = /(^|[^\w$.])fetch\s*\(/g
  let m
  while ((m = re.exec(code))) {
    const callAt = m.index + m[1].length
    const argAt = re.lastIndex
    const arg = firstArg(code, argAt)
    if (arg.kind === 'none') continue
    fetches++
    const loc = where(file, code, callAt)
    if (arg.kind === 'literal') {
      if (!isLocalTarget(arg.value)) failures.push(`${loc}: fetch() to another origin: ${JSON.stringify(arg.value)}`)
      continue
    }
    // A target this check can't see: it must be one of the known library loaders.
    const before = code.slice(Math.max(0, callAt - 600), callAt)
    const after = code.slice(argAt - 1)
    const known = KNOWN_DYNAMIC_FETCHES.find((k) => k.test(before, after))
    if (known) notes.push(`${loc}: fetch(${arg.name}…) — ${known.name}`)
    else failures.push(`${loc}: fetch() with a target this check can't see (${arg.name}): ${snippet(code, callAt)}`)
  }
}

function checkRemoteImports(file, code) {
  const re = /\bimport\s*\(\s*(["'`])([^"'`]*)\1/g
  for (const m of code.matchAll(re)) {
    if (!isLocalTarget(m[2])) failures.push(`${where(file, code, m.index)}: import() of a remote module: ${JSON.stringify(m[2])}`)
  }
}

function checkHtml(file, code) {
  const re = /\b(src|href|action|srcset|poster|data)\s*=\s*(["'])([^"']*)\2/gi
  for (const m of code.matchAll(re)) {
    const urls = m[1].toLowerCase() === 'srcset' ? m[3].split(',').map((s) => s.trim().split(/\s+/)[0]) : [m[3]]
    for (const url of urls) {
      if (url && !isLocalTarget(url)) failures.push(`${where(file, code, m.index)}: ${m[1]}= points to another origin: ${JSON.stringify(url)}`)
    }
  }
}

function checkCss(file, code) {
  for (const m of code.matchAll(/url\(\s*(["']?)([^"')]*)\1\s*\)/gi)) {
    if (!isLocalTarget(m[2])) failures.push(`${where(file, code, m.index)}: CSS url() to another origin: ${JSON.stringify(m[2])}`)
  }
  for (const m of code.matchAll(/@import\s+(["'])([^"']*)\1/gi)) {
    if (!isLocalTarget(m[2])) failures.push(`${where(file, code, m.index)}: CSS @import from another origin: ${JSON.stringify(m[2])}`)
  }
}

let files
try {
  files = walk(DIST)
} catch {
  console.error(`✗ store check: no ${DIST}/ — run the store build first`)
  process.exit(1)
}

for (const file of files) {
  const code = readFileSync(file, 'utf8')
  const ext = extname(file).toLowerCase()
  for (const s of BANNED) {
    let i = -1
    while ((i = code.indexOf(s, i + 1)) !== -1) failures.push(`${where(file, code, i)}: contains "${s}" (the local-AI feeder must not ship)`)
  }
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs' || ext === '.html') {
    checkFetches(file, code)
    checkRemoteImports(file, code)
    for (const { re, what } of CHANNELS) {
      for (const m of code.matchAll(re)) failures.push(`${where(file, code, m.index)}: uses ${what}`)
    }
  }
  if (ext === '.html') checkHtml(file, code)
  if (ext === '.css' || ext === '.html') checkCss(file, code)
}

for (const n of notes) console.log(`  · known library loader: ${n}`)
if (failures.length) {
  console.error(`✗ store check failed: ${failures.length} problem(s) in ${DIST}/`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ store check: ${files.length} files, ${fetches} fetch() call(s), all same-origin or known loaders; no AI feeder, no other network channels`)
