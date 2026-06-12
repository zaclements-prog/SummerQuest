// Post-build step for the single-file offline build: inline favicon.svg as a
// data URI so dist/index.html is a TRULY standalone, double-clickable file
// (no sibling favicon needed).
import { readFileSync, writeFileSync, rmSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')
const svg = readFileSync('public/favicon.svg', 'utf8')
const dataUri = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')

const out = html.replace(/href="\.?\/?favicon\.svg"/g, `href="${dataUri}"`)
writeFileSync('dist/index.html', out)
// Friendly, double-clickable name for handing to a PC.
writeFileSync('dist/SummerQuest.html', out)
// The single file inlines everything, so the copied favicon.svg is unused — drop it.
try { rmSync('dist/favicon.svg') } catch { /* ok */ }
console.log('✓ standalone single file: dist/SummerQuest.html (' + (out.length / 1024).toFixed(0) + ' KB, fully offline)')
