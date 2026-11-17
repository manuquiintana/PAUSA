/**
 * npm run voz:generar — Genera con ElevenLabs los audios de todas las indicaciones de las pausas.
 *
 * Necesita la variable ELEVENLABS_API_KEY (en .env.local o como secreto de GitHub).
 * Solo genera los textos nuevos o cambiados y borra los audios que ya no se usan.
 * Los audios se guardan en public/voz/ junto con manifest.json.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createDemoDb } from '../src/lib/demo/setup'
import { clipKey, FIXED_PHRASES, toSpeech, type VoiceManifest } from '../src/lib/voice-clips'
import { loadSqlFromDisk } from './load-sql'

// ── Ajustes de la voz (un solo sitio para afinarlos) ──
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '8gK5gnQBZnJWm1ta8R8X'
const MODEL = 'eleven_multilingual_v2'
const VOICE_SETTINGS = { stability: 0.6, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true, speed: 0.9 }

const OUT = join(import.meta.dirname, '..', 'public', 'voz')
const MANIFEST = join(OUT, 'manifest.json')

function loadEnvLocal() {
  const f = join(import.meta.dirname, '..', '.env.local')
  if (!existsSync(f)) return
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

async function allTexts(): Promise<string[]> {
  const pg = await createDemoDb(loadSqlFromDisk())
  const rows = (await pg.query<{ text: string }>('select text from activity_steps order by activity_id, position')).rows
  await pg.close()
  return [...new Set([...rows.map((r) => r.text), ...FIXED_PHRASES])]
}

async function synth(apiKey: string, text: string): Promise<Buffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: toSpeech(text), model_id: MODEL, language_code: 'es', voice_settings: VOICE_SETTINGS }),
    })
    if (res.ok) return Buffer.from(await res.arrayBuffer())
    const body = await res.text()
    if (res.status === 401 || res.status === 403) throw new Error(`ElevenLabs rechazó la clave o la voz (${res.status}): ${body}`)
    if (res.status === 404) throw new Error(`No se encuentra la voz ${VOICE_ID}. ¿Está añadida a "My Voices"? ${body}`)
    if (attempt === 4) throw new Error(`Error ${res.status} de ElevenLabs: ${body}`)
    await new Promise((r) => setTimeout(r, 1500 * attempt)) // reintento (límite de peticiones, etc.)
  }
  throw new Error('inalcanzable')
}

async function main() {
  loadEnvLocal()
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.error('Falta ELEVENLABS_API_KEY (ponla en .env.local o como secreto del repositorio).')
    process.exit(1)
  }
  mkdirSync(OUT, { recursive: true })
  const old: VoiceManifest | null = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : null
  const sameVoice = old && old.voiceId === VOICE_ID && old.model === MODEL
  const texts = await allTexts()
  const manifest: VoiceManifest = { voiceId: VOICE_ID, model: MODEL, clips: {} }

  let generated = 0
  let chars = 0
  for (const text of texts) {
    const key = clipKey(text)
    const file = `${key}.mp3`
    if (sameVoice && old!.clips[key] === file && existsSync(join(OUT, file))) {
      manifest.clips[key] = file
      continue
    }
    process.stdout.write(`· ${text.slice(0, 70)}${text.length > 70 ? '…' : ''}\n`)
    writeFileSync(join(OUT, file), await synth(apiKey, text))
    manifest.clips[key] = file
    generated++
    chars += toSpeech(text).length
  }

  // Borrar audios que ya no se usan
  const keep = new Set(Object.values(manifest.clips))
  let removed = 0
  for (const f of readdirSync(OUT)) {
    if (f.endsWith('.mp3') && !keep.has(f)) {
      unlinkSync(join(OUT, f))
      removed++
    }
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\nListo: ${texts.length} frases · ${generated} audios nuevos (${chars} caracteres) · ${removed} borrados.`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
