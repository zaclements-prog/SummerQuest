/**
 * Node ≥25 exposes an experimental `localStorage` global that resolves to
 * `undefined` unless `--localstorage-file` is passed — and even then every
 * vitest worker contends on the same backing file (flaky cross-file clobbering).
 * CI pins Node 22; dev machines don't. Install a plain in-memory Storage on any
 * worker whose localStorage is missing, so tests are hermetic and never touch
 * disk. (jsdom's own implementation wins when it exists — we only fill gaps.)
 */

class MemoryStorage implements Storage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  clear() {
    this.map.clear()
  }
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value))
  }
}

const missing = (obj: object) => {
  try {
    return (obj as { localStorage?: Storage }).localStorage === undefined
  } catch {
    return true
  }
}

for (const target of [globalThis, globalThis.window ?? globalThis]) {
  if (missing(target)) {
    const store = new MemoryStorage()
    Object.defineProperty(target, 'localStorage', {
      value: store,
      writable: true,
      configurable: true,
    })
  }
}
