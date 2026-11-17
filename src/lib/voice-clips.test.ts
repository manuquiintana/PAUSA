import { describe, expect, it } from 'vitest'
import { clipKey, FIXED_PHRASES, resolveClip, type VoiceManifest } from './voice-clips'

describe('audios de la voz guía', () => {
  it('la clave es estable e ignora comillas y espacios de más', () => {
    expect(clipKey('Di para ti: «Por hoy, es suficiente».')).toBe(clipKey('Di  para ti: Por hoy, es suficiente.'))
    expect(clipKey('Inspira')).toBe(clipKey('Inspira'))
    expect(clipKey('Inspira')).not.toBe(clipKey('Mantén'))
  })
  it('usa el audio grabado si existe', () => {
    const m: VoiceManifest = { voiceId: 'v', model: 'm', clips: { [clipKey('Inspira')]: 'a.mp3' } }
    expect(resolveClip(m, 'Inspira')).toBe('a.mp3')
  })
  it('si no hay audio (o no hay índice) devuelve null para usar la voz del navegador', () => {
    const m: VoiceManifest = { voiceId: 'v', model: 'm', clips: {} }
    expect(resolveClip(m, 'Texto nuevo')).toBeNull()
    expect(resolveClip(null, 'Inspira')).toBeNull()
  })
  it('incluye las frases fijas del reproductor', () => expect(FIXED_PHRASES).toContain('Suelta el aire'))
})
