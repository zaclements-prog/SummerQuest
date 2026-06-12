// Generates MP3 narration for every lesson step using Microsoft Edge TTS (free, no key).
// Reads narration text from src/tutoring/narration.json (emitted by dump-narration.mjs).
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { mkdirSync, writeFileSync, existsSync, readFileSync, createWriteStream } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const VOICE = 'en-US-JennyNeural'
const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = `${root}public/tts`
const lessons = JSON.parse(readFileSync(`${root}src/tutoring/narration.json`, 'utf8'))

const manifest = {}
for (const [lessonId, steps] of Object.entries(lessons)) {
  const dir = `${outDir}/${lessonId}`
  mkdirSync(dir, { recursive: true })
  for (const { stepId, text } of steps) {
    const hash = createHash('sha1').update(VOICE + '|' + text).digest('hex').slice(0, 10)
    const file = `tts/${lessonId}/${stepId}.mp3`
    const abs = `${outDir}/${lessonId}/${stepId}.mp3`
    manifest[`${lessonId}/${stepId}`] = { file, hash }
    if (existsSync(abs) && existsSync(abs + '.hash') && readFileSync(abs + '.hash', 'utf8') === hash) {
      console.log('skip (unchanged):', file); continue
    }
    const tts = new MsEdgeTTS()
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    await new Promise((resolve, reject) => {
      // msedge-tts v2: toStream() is synchronous and returns { audioStream, metadataStream }
      const { audioStream } = tts.toStream(text)
      const ws = createWriteStream(abs)
      audioStream.pipe(ws)
      audioStream.on('error', reject)
      ws.on('error', reject)
      ws.on('finish', resolve)
    })
    tts.close()
    writeFileSync(abs + '.hash', hash)
    console.log('wrote:', file)
  }
}
writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2))
console.log('manifest written:', Object.keys(manifest).length, 'clips')
