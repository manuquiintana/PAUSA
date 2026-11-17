/**
 * Voz guía con la síntesis de voz del navegador (Web Speech API).
 * Provisional: antes de los pilotos se sustituirá por audios grabados con una voz profesional.
 * Elige una voz en español de España si el dispositivo la tiene; si no, cualquier voz en español.
 */

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

/** Prepara el texto para leerlo en voz alta (sin comillas ni puntos suspensivos raros). */
export function toSpeech(text: string): string {
  return text
    .replace(/[«»"“”]/g, '')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
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
  onSpeakingChange?: (speaking: boolean) => void

  constructor(enabled: boolean) {
    this.enabled = enabled
    if (!VoiceGuide.supported) return
    const load = () => {
      this.voice = pickSpanishVoice(window.speechSynthesis.getVoices()) as SpeechSynthesisVoice | null
    }
    load()
    window.speechSynthesis.addEventListener?.('voiceschanged', load)
  }

  static get supported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  }

  get speaking(): boolean {
    return VoiceGuide.supported && window.speechSynthesis.speaking
  }

  setEnabled(on: boolean) {
    this.enabled = on
    if (!on) this.cancel()
  }

  /** Habla con voz suave y pausada. `interrupt` corta lo que estuviera diciendo. */
  speak(text: string, { interrupt = false, rate = 0.88 }: { interrupt?: boolean; rate?: number } = {}) {
    if (!this.enabled || !VoiceGuide.supported) return
    try {
      const synth = window.speechSynthesis
      if (interrupt) synth.cancel()
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

  cancel() {
    if (!VoiceGuide.supported) return
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* nada */
    }
    this.onSpeakingChange?.(false)
  }
}
