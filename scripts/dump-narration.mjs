import { allLessons } from '../src/tutoring/lessons/index.ts'
import { writeFileSync } from 'node:fs'
const out = {}
for (const l of allLessons) out[l.id] = l.steps.map((s) => ({ stepId: s.id, text: s.narration }))
writeFileSync(new URL('../src/tutoring/narration.json', import.meta.url), JSON.stringify(out, null, 2))
console.log('narration.json:', Object.keys(out).length, 'lessons')
