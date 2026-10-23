#!/usr/bin/env node
/**
 * The three v2 Amazon Appstore screenshots (K–1 and 5th grade), added to the
 * seven v1 shots in docs/store/screenshots/:
 *
 *   08-k-listen-play.png        Kindergarten Listen & Play: "find the group of 7" (pictures only)
 *   09-g1-critter-parade.png    1st grade Critter Parade: pick the +8 or +5 gate
 *   10-g5-long-division.png     5th grade lesson: 672 ÷ 28 = 24 worked out
 *
 *   npm run build:store && npx vite preview --port 4191 --strictPort
 *   node scripts/store-screenshots-v2.mjs [base-url] [--out dir] [--only 08,10]
 *
 * Captured like the v1 set: the Fire HD 10's 1280×800 CSS viewport at
 * deviceScaleFactor 1.5, so the PNGs are 1920×1200 with the UI at the size a
 * child sees it on the tablet. Each shot onboards a fresh explorer named "Sam"
 * (the way scripts/check-first-quest.mjs does), stars the stage before the one
 * shown so it is unlocked, and waits for the scene to settle.
 *
 * Audio is blocked in the page (play() rejects, speech errors out): headless
 * Chromium stalls narration clips started after a tap, which freezes a lesson's
 * scene. Blocked, the app runs its silent timeline and the visuals play through.
 *
 * Needs Playwright with Chromium (PLAYWRIGHT_MODULE / CHROMIUM_PATH to point at them).
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const flag = (n) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 ? args[i + 1] : null
}
const base = (args[0] && !args[0].startsWith('--') ? args[0] : 'http://localhost:4173').replace(/\/$/, '')
const out = flag('out') ?? 'docs/store/screenshots'
const only = flag('only')?.split(',')
mkdirSync(out, { recursive: true })
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')

const KEY = 'summerquest-progress-v1'

const SHOTS = [
  {
    file: '08-k-listen-play.png',
    grade: 'Kindergarten',
    path: '/play/multiplication-mesa/k-count-1',
    // the first question's picture cards are in and the "your turn" glow is on; the hint hand comes later
    async run(page) {
      await page.waitForTimeout(8000)
    },
  },
  {
    file: '09-g1-critter-parade.png',
    grade: '1st grade',
    stars: ['multiplication-mesa/g1-add-1'],
    path: '/play/multiplication-mesa/g1-add-parade',
    // the first pair of gates in view, before the idle hint hand appears
    async run(page) {
      await page.waitForTimeout(8000)
    },
  },
  {
    file: '10-g5-long-division.png',
    grade: '5th grade',
    path: '/tutor/g5Division',
    // step 1 (set-up) → step 2 (estimate, answer its check: 2) → step 3 (bring down), played to the end
    async run(page) {
      await page.waitForTimeout(14000)
      await press(page, /^Next/)
      await page.waitForTimeout(16000)
      await press(page, '2', true)
      await page.waitForTimeout(2000)
      await press(page, /^Next/)
      await page.waitForTimeout(19000)
    },
  },
]

/** Press a button without a trusted gesture (a trusted tap unlocks the audio we keep blocked). */
async function press(page, name, exact = false) {
  await page.getByRole('button', { name, exact }).first().evaluate((b) => b.click())
}

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

let failed = 0
for (const shot of SHOTS) {
  if (only && !only.some((p) => shot.file.startsWith(p))) continue
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5, hasTouch: true })
  await ctx.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return Promise.reject(new DOMException('blocked for screenshots', 'NotAllowedError'))
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.speak = (u) => setTimeout(() => u.dispatchEvent(new Event('error')), 0)
    }
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  try {
    // onboarding (as in check-first-quest.mjs)
    await page.goto(`${base}/`)
    await page.getByText('Start your quest →').click()
    await page.locator('[role="radio"][aria-label^="Character"]').first().click()
    await page.locator('[aria-labelledby="color-label"] [role="radio"]').first().click()
    await page.locator(`[role="radio"][aria-label="${shot.grade}"]`).click()
    const name = page.getByPlaceholder('Type your name')
    if (await name.isVisible().catch(() => false)) await name.fill('Sam')
    await page.getByText('Begin adventure! 🚀').click()
    await page.waitForURL('**/world', { timeout: 30_000 })

    // K–1 has no name field by default: name the explorer "Sam"; unlock the stage shown
    await page.evaluate(
      ([k, stars]) => {
        const s = JSON.parse(localStorage.getItem(k))
        s.state.player.name = 'Sam'
        s.state.zones ??= {}
        for (const zs of stars) {
          const [zoneId, stageId] = zs.split('/')
          s.state.zones[zoneId] ??= { zoneId, stages: {} }
          s.state.zones[zoneId].stages[stageId] = { stageId, stars: 3, bestScore: 10, attempts: 1 }
        }
        localStorage.setItem(k, JSON.stringify(s))
      },
      [KEY, shot.stars ?? []],
    )

    await page.goto(`${base}${shot.path}`)
    await shot.run(page)
    await page.mouse.move(-10, -10) // no hover state anywhere
    await page.screenshot({ path: join(out, shot.file) })
    console.log(`✓ ${shot.file}${errors.length ? ` (page errors: ${errors[0]})` : ''}`)
  } catch (e) {
    failed++
    console.log(`✗ ${shot.file}: ${e.message.split('\n')[0]}`)
  }
  await ctx.close()
}

await browser.close()
process.exit(failed ? 1 : 0)
