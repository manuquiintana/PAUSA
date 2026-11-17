/**
 * Voz guía. Usa los audios grabados con ElevenLabs (public/voz/) cuando existen para ese texto;
 * si no, la síntesis de voz del navegador (Web Speech API) con una voz en español.
 */

import { resolveClip, toSpeech, type VoiceManifest } from './voice-clips'

export { toSpeech }

const STORAGE_KEY = 'pausa-voz'

export function loadVoicePref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function saveVoicePref(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    /* sin almacenamiento */
  }
}

/** Prefiere es-ES; si no, cualquier español; si no, null (la voz por defecto del sistema). */
export function pickSpanishVoice(voices: Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'localService'>[]) {
  const es = voices.filter((v) => v.lang?.toLowerCase().startsWith('es'))
  const spain = es.filter((v) => v.lang.toLowerCase().replace('_', '-') === 'es-es')
  const pool = spain.length ? spain : es
  // Las voces "naturales"/"neural" suenan más suaves; luego las locales (sin depender de red)
  const score = (v: (typeof pool)[number]) =>
    (/natural|neural|online|premium|enhanced/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0)
  return [...pool].sort((a, b) => score(b) - score(a))[0] ?? null
}

export class VoiceGuide {
  private enabled: boolean
  private voice: SpeechSynthesisVoice | null = null
  private manifest: VoiceManifest | null = null
  private audio: HTMLAudioElement | null = null
  onSpeakingChange?: (speaking: boolean) => void

  constructor(enabled: boolean, clipsBase = 'voz/') {
    this.enabled = enabled
    this.clipsBase = clipsBase
    // Índice de audios grabados (si no existe, se usa la voz del navegador)
    if (typeof fetch !== 'undefined') {
      fetch(`${clipsBase}manifest.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((m) => { this.manifest = m })
        .catch(() => undefined)
    }
    if (!VoiceGuide.supported) return
    const load = () => {
      this.voice = pickSpanishVoice(window.speechSynthesis.getVoices()) as SpeechSynthesisVoice | null
    }
    load()
    window.speechSynthesis.addEventListener?.('voiceschanged', load)
  }

  private clipsBase: string

  /** Hay voz disponible: audios grabados o síntesis del navegador. */
  static get available(): boolean {
    return typeof window !== 'undefined' && ('Audio' in window || VoiceGuide.supported)
  }

  static get supported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  }

  get speaking(): boolean {
    const clipPlaying = !!this.audio && !this.audio.paused && !this.audio.ended
    return clipPlaying || (VoiceGuide.supported && window.speechSynthesis.speaking)
  }

  setEnabled(on: boolean) {
    this.enabled = on
    if (!on) this.cancel()
  }

  /** Habla con voz suave y pausada. `interrupt` corta lo que estuviera diciendo. */
  speak(text: string, { interrupt = false, rate = 0.88 }: { interrupt?: boolean; rate?: number } = {}) {
    if (!this.enabled) return
    if (interrupt) this.stopAll()
    else if (this.speaking) return
    const clip = resolveClip(this.manifest, text)
    if (clip) {
      try {
        const a = new Audio(`${this.clipsBase}${clip}`)
        a.volume = 1
        a.onplay = () => this.onSpeakingChange?.(true)
        a.onended = () => this.onSpeakingChange?.(false)
        a.onerror = () => this.onSpeakingChange?.(false)
        this.audio = a
        a.play().catch(() => this.onSpeakingChange?.(false))
        return
      } catch {
        /* si el audio falla, seguimos con la voz del navegador */
      }
    }
    if (!VoiceGuide.supported) return
    try {
      const synth = window.speechSynthesis
      const u = new SpeechSynthesisUtterance(toSpeech(text))
      u.lang = this.voice?.lang ?? 'es-ES'
      if (this.voice) u.voice = this.voice
      u.rate = rate
      u.pitch = 0.95
      u.volume = 0.95
      u.onstart = () => this.onSpeakingChange?.(true)
      u.onend = () => this.onSpeakingChange?.(synth.speaking)
      u.onerror = () => this.onSpeakingChange?.(false)
      synth.speak(u)
    } catch {
      /* la voz es un extra: si falla, la pausa sigue con texto y sonidos */
    }
  }

  private stopAll() {
    if (this.audio) {
      try { this.audio.pause() } catch { /* nada */ }
      this.audio = null
    }
    if (VoiceGuide.supported) {
      try { window.speechSynthesis.cancel() } catch { /* nada */ }
    }
  }

  cancel() {
    this.stopAll()
    this.onSpeakingChange?.(false)
  }
}
