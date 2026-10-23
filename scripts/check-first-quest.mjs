#!/usr/bin/env node
/**
 * Onboarding → first quest → today's quest, played in Chromium for one grade
 * of each band (K, 1st, 3rd, 5th) at the Fire tablet sizes (1024×528 sideways,
 * 600×952 upright):
 *
 *   1. Welcome → set up an explorer for the grade → the World shows the
 *      first-quest card, its start button fully on screen.
 *   2. One tap on it starts the quest's stage (/play/<zone>/<stage>).
 *   3. The quest done (a star on its stage) → back in the World, the
 *      celebration card shows once.
 *   4. The next day: a "today's quest" button in the HUD, and free play still
 *      open (no card in the way).
 *
 *   node scripts/check-first-quest.mjs [base-url] [--shots out-dir]
 *
 * Needs a running dev server (default http://localhost:5173) and Playwright
 * with Chromium (PLAYWRIGHT_MODULE / CHROMIUM_PATH to point at them).
 * Exits 1 on any failed check.
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const base = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://localhost:5173').replace(/\/$/, '')
const shotsAt = process.argv.indexOf('--shots')
const shots = shotsAt >= 0 ? process.argv[shotsAt + 1] : null
if (shots) mkdirSync(shots, { recursive: true })
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')

const KEY = 'summerquest-progress-v1'
const SIZES = [
  { width: 1024, height: 528 },
  { width: 600, height: 952 },
]
const GRADES = [
  { grade: 0, label: 'Kindergarten', listen: true },
  { grade: 1, label: '1st grade', listen: true },
  { grade: 3, label: '3rd grade', listen: false },
  { grade: 5, label: '5th grade', listen: false },
]

let failed = 0
const check = (ok, what) => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${what}`)
  if (!ok) failed++
}

/** Is the element's whole box inside the viewport? */
async function onScreen(page, locator) {
  const box = await locator.boundingBox()
  const vp = page.viewportSize()
  return !!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width + 0.5 && box.y + box.height <= vp.height + 0.5
}

/**
 * Tap the middle of an element, after checking it's the thing a finger there
 * would hit (Playwright's own click waits for a bobbing button to stop moving).
 */
async function tap(page, locator) {
  const box = await locator.boundingBox()
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const hit = await locator.evaluate((el, [px, py]) => el.contains(document.elementFromPoint(px, py)), [x, y])
  if (!hit) throw new Error('something covers the button')
  await page.mouse.click(x, y)
}

/** Close a pet celebration (an egg hatched on the quest's stars) if one is up. */
async function closePetMoment(page) {
  const yay = page.getByRole('button', { name: /^Yay/ })
  if (await yay.isVisible().catch(() => false)) {
    await yay.click()
    await yay.waitFor({ state: 'hidden' })
  }
}

const save = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY)
const writeSave = (page, s) => page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, s])

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

for (const size of SIZES) {
  for (const g of GRADES) {
    const tag = `${g.label} @ ${size.width}×${size.height}`
    console.log(tag)
    const ctx = await browser.newContext({ viewport: size, hasTouch: true })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    try {
      // ── 1. onboarding ──
      await page.goto(`${base}/`)
      await page.getByText('Start your quest →').click()
      await page.locator('[role="radio"][aria-label^="Character"]').first().click()
      await page.locator('[aria-labelledby="color-label"] [role="radio"]').first().click()
      await page.locator(`[role="radio"][aria-label="${g.label}"]`).click()
      if (!g.listen) await page.getByPlaceholder('Type your name').fill('Sam')
      await page.getByText('Begin adventure! 🚀').click()
      await page.waitForURL('**/world', { timeout: 15_000 })

      const card = page.locator('[data-quest-card="first"]')
      await card.waitFor({ timeout: 30_000 })
      const start = page.locator('[data-guide="quest-start"]')
      check(await start.isVisible(), 'first-quest card with one start button')
      check(await onScreen(page, start), 'start button fully on screen')
      check(g.listen === !(await card.innerText()).includes('first quest'), g.listen ? 'K–1 card: pictures, no words to read' : 'card says "first quest"')
      check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'no sideways scroll')
      await page.waitForTimeout(1200) // let it settle (K–1: the voice starts pointing)
      if (shots) await page.screenshot({ path: join(shots, `first-quest-g${g.grade}-${size.width}x${size.height}.png`) })
      const { quest } = (await save(page)).state
      check(quest?.reason === 'first', `quest saved: ${quest?.zoneId}/${quest?.stageId}`)

      // ── 2. one tap starts it ──
      await tap(page, start)
      await page.waitForURL(`**/play/${quest.zoneId}/${quest.stageId}`, { timeout: 15_000 })
      check(true, 'one tap starts the quest stage')

      // ── 3. done → celebration back in the World ──
      const s = await save(page)
      s.state.zones = { [quest.zoneId]: { zoneId: quest.zoneId, stages: { [quest.stageId]: { stageId: quest.stageId, stars: 2, bestScore: 10, attempts: 1 } } } }
      s.state.quest = { ...quest, doneAt: Date.now() }
      await writeSave(page, s)
      await page.goto(`${base}/world`)
      const party = page.getByRole('dialog', { name: 'First quest done!' })
      await party.waitFor({ timeout: 30_000 })
      check(await party.isVisible(), 'quest celebration shows')
      await party.getByText('Awesome! 🎉').click()
      await party.waitFor({ state: 'hidden' })
      await page.waitForTimeout(1500) // the pet card (if any) waits for the celebration, then settles
      await closePetMoment(page)
      check((await save(page)).state.quest.celebrated === true, 'celebrated once')

      // ── 4. the next day: today's quest ──
      const s2 = await save(page)
      s2.state.quest = { ...s2.state.quest, day: '2000-01-01' }
      await writeSave(page, s2)
      await page.goto(`${base}/world`)
      const chip = page.locator('[data-quest-chip=""]')
      await chip.waitFor({ timeout: 30_000 })
      check(await onScreen(page, chip), "today's quest button on screen")
      check((await page.locator('[data-quest-card="first"]').count()) === 0, 'no card in the way of free play')
      const today = (await save(page)).state.quest
      check(today.reason !== 'first' && !today.doneAt, `today's quest: ${today.reason} ${today.zoneId}/${today.stageId}`)
      await page.waitForTimeout(1500)
      await closePetMoment(page)
      if (shots) await page.screenshot({ path: join(shots, `todays-quest-g${g.grade}-${size.width}x${size.height}.png`) })
      await tap(page, chip)
      await page.waitForURL(`**/play/${today.zoneId}/${today.stageId}`, { timeout: 15_000 })
      check(true, "today's quest starts in one tap")
      check(errors.length === 0, `no page errors${errors.length ? `: ${errors[0]}` : ''}`)
    } catch (e) {
      check(false, `flow broke: ${e.message.split('\n')[0]}`)
      if (shots) await page.screenshot({ path: join(shots, `FAIL-g${g.grade}-${size.width}x${size.height}.png`) }).catch(() => {})
    }
    await ctx.close()
  }
}

await browser.close()
console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ all checks passed')
process.exit(failed ? 1 : 0)
