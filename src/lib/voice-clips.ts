/**
 * Audios de voz pregenerados (ElevenLabs) para las indicaciones de las pausas.
 * Cada texto se identifica por un hash estable de su versión "hablada"; el índice
 * public/voz/manifest.json relaciona hash → archivo. Lo usan el script de generación
 * (Node) y el reproductor (navegador), así que no depende de ninguna librería.
 */
/** Prepara el texto para leerlo en voz alta (sin comillas ni puntos suspensivos raros). */
export function toSpeech(text: string): string {
  return text
    .replace(/[«»"“”]/g, '')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface VoiceManifest {
  voiceId: string
  model: string
  clips: Record<string, string> // hash → nombre de archivo (en public/voz/)
}

/** Frases fijas del reproductor que también se graban. */
export const FIXED_PHRASES = ['Inspira', 'Suelta el aire', 'Mantén', 'Pausa completada. Gracias por regalarte este momento.']

/** FNV-1a de 32 bits en hexadecimal + longitud: estable, rápido y sin dependencias. */
export function clipKey(text: string): string {
  const s = toSpeech(text)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${(h >>> 0).toString(16).padStart(8, '0')}-${s.length}`
}

/** Archivo de audio para un texto, o null si no se ha generado (se usa la voz del navegador). */
export function resolveClip(manifest: VoiceManifest | null, text: string): string | null {
  if (!manifest) return null
  return manifest.clips[clipKey(text)] ?? null
}
