/**
 * Sonidos del reproductor, generados con Web Audio (sin archivos ni dependencias):
 *  - Ambiente de relajación: olas suaves (ruido marrón filtrado que sube y baja) + un acorde cálido
 *    que cambia según el módulo. Entra y sale con fundidos lentos.
 *  - Burbuja: un "pop" redondo y lento con un eco que se apaga, al completarse el anillo de cada paso.
 */
import type { ModuleId } from './types'

/** Acorde de fondo de cada módulo (Hz). Graves y consonantes para que no cansen. */
export const MODULE_CHORDS: Record<ModuleId, number[]> = {
  stretch: [146.83, 220.0, 293.66], // Re
  breathe: [110.0, 164.81, 220.0], // La
  mindfulness: [87.31, 130.81, 174.61], // Fa (más grave y envolvente)
  positive: [130.81, 196.0, 261.63], // Do (más luminoso)
  reset: [98.0, 146.83, 196.0], // Sol
}

/** Acorde claro y luminoso para el recorrido por el cuerpo ("luz"). */
const LIGHT_CHORD = [261.63, 392.0, 523.25]

const AMBIENT_LEVEL = 0.55
const STORAGE_KEY = 'pausa-sonido'

export function loadSoundPref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function saveSoundPref(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

type Ctx = AudioContext

function brownNoiseBuffer(ctx: Ctx, seconds = 4): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  // Fundido en los extremos para que el bucle no haga "clic"
  const fade = Math.floor(ctx.sampleRate * 0.05)
  for (let i = 0; i < fade; i++) {
    data[i] *= i / fade
    data[len - 1 - i] *= i / fade
  }
  return buf
}

export class SoundEngine {
  private ctx: Ctx | null = null
  private master: GainNode | null = null
  private ambientBus: GainNode | null = null
  private ambientNodes: AudioScheduledSourceNode[] = []
  private sparkleTimer: ReturnType<typeof setInterval> | null = null
  private ambientPaused = false
  private ducked = false
  private muted: boolean

  constructor(muted = false) {
    this.muted = muted
  }

  /** Crea o reanuda el contexto de audio. Llamar desde un gesto del usuario si es posible. */
  async unlock(): Promise<boolean> {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (!AC) return false
        this.ctx = new AC()
        this.master = this.ctx.createGain()
        this.master.gain.value = this.muted ? 0 : 1
        this.master.connect(this.ctx.destination)
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      return this.ctx.state === 'running'
    } catch {
      return false
    }
  }

  get isRunning() {
    return this.ctx?.state === 'running'
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(t)
      this.master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.15)
    }
  }

  /**
   * Arranca el ambiente del módulo con un fundido de entrada lento.
   * La variante 'luz' (recorrido por el cuerpo) suena más clara y con destellos suaves.
   */
  startAmbient(module: ModuleId, variant: 'normal' | 'luz' = 'normal') {
    const ctx = this.ctx
    if (!ctx || !this.master || this.ambientBus) return
    const t = ctx.currentTime
    const bus = ctx.createGain()
    bus.gain.setValueAtTime(0, t)
    bus.gain.linearRampToValueAtTime(AMBIENT_LEVEL, t + 4)
    bus.connect(this.master)
    this.ambientBus = bus

    // Olas: ruido marrón con filtro paso bajo y volumen que sube y baja muy despacio
    const noise = ctx.createBufferSource()
    noise.buffer = brownNoiseBuffer(ctx)
    noise.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    const waveGain = ctx.createGain()
    waveGain.gain.value = 0.16
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.09 // una ola cada ~11 s
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 0.1
    lfo.connect(lfoDepth).connect(waveGain.gain)
    noise.connect(lp).connect(waveGain).connect(bus)

    // Acorde cálido: senos ligeramente desafinados, filtrados y con un vaivén lento
    const padFilter = ctx.createBiquadFilter()
    padFilter.type = 'lowpass'
    padFilter.frequency.value = 900
    const padGain = ctx.createGain()
    padGain.gain.value = 0.035
    const tremolo = ctx.createOscillator()
    tremolo.frequency.value = 0.05
    const tremDepth = ctx.createGain()
    tremDepth.gain.value = 0.012
    tremolo.connect(tremDepth).connect(padGain.gain)
    padFilter.connect(padGain).connect(bus)
    const oscs: OscillatorNode[] = []
    const chord = variant === 'luz' ? LIGHT_CHORD : MODULE_CHORDS[module]
    if (variant === 'luz') {
      padGain.gain.value = 0.028
      padFilter.frequency.value = 2400
      waveGain.gain.value = 0.08
    }
    for (const f of chord) {
      for (const detune of [-4, 4]) {
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = f
        o.detune.value = detune
        o.connect(padFilter)
        oscs.push(o)
      }
    }

    const sources: AudioScheduledSourceNode[] = [noise, lfo, tremolo, ...oscs]
    sources.forEach((s) => s.start(t))
    this.ambientNodes = sources
    if (variant === 'luz') {
      this.sparkleTimer = setInterval(() => {
        if (!this.ambientPaused) this.sparkle()
      }, 2600)
    }
  }

  /** Destello de luz: notas altas muy suaves, como polvo brillante. */
  private sparkle() {
    const ctx = this.ctx
    if (!ctx || !this.ambientBus) return
    const notes = [1046.5, 1174.7, 1318.5, 1568, 1760]
    const t = ctx.currentTime
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = notes[Math.floor(Math.random() * notes.length)]
      const g = ctx.createGain()
      const st = t + i * 0.18 + Math.random() * 0.1
      g.gain.setValueAtTime(0.0001, st)
      g.gain.exponentialRampToValueAtTime(0.025, st + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, st + 1.6)
      o.connect(g).connect(this.ambientBus)
      o.start(st)
      o.stop(st + 1.7)
    }
  }

  /** Señal de respiración: inspirar = tono que sube; soltar = tono que baja; mantener = nota suave. */
  cue(kind: 'inhale' | 'exhale' | 'hold') {
    const ctx = this.ctx
    if (!ctx || !this.master || ctx.state !== 'running') return
    const t = ctx.currentTime + 0.01
    const o = ctx.createOscillator()
    o.type = 'sine'
    const g = ctx.createGain()
    const [from, to, len, vol] =
      kind === 'inhale' ? [392, 587.3, 1.1, 0.12] : kind === 'exhale' ? [587.3, 329.6, 1.5, 0.11] : [440, 440, 0.8, 0.06]
    o.frequency.setValueAtTime(from, t)
    o.frequency.exponentialRampToValueAtTime(to, t + len * 0.8)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.08)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + len + 0.05)
  }

  /**
   * Cuenco tibetano: parciales inarmónicos con un ligero batido (la "vibración").
   * `strength` < 1 para el toque de cada segundo, 1 para un golpe completo.
   */
  bowl(strength = 1) {
    const ctx = this.ctx
    if (!ctx || !this.master || ctx.state !== 'running') return
    const t = ctx.currentTime + 0.01
    const f0 = 196
    const decay = 1.2 + 3.5 * strength
    const out = ctx.createGain()
    out.gain.value = 0.18 * strength
    out.connect(this.master)
    const partials: [number, number][] = [[1, 1], [2.76, 0.45], [5.4, 0.2], [8.9, 0.08]]
    for (const [ratio, amp] of partials) {
      for (const beat of [0, 1.8]) {
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = f0 * ratio + beat
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(amp * 0.5, t + 0.006)
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay / Math.sqrt(ratio))
        o.connect(g).connect(out)
        o.start(t)
        o.stop(t + decay + 0.1)
      }
    }
    setTimeout(() => { try { out.disconnect() } catch { /* nada */ } }, (decay + 0.5) * 1000)
  }

  /** Baja el ambiente mientras habla la voz guía. */
  duck(on: boolean) {
    this.ducked = on
    this.applyAmbientLevel(0.6)
  }

  private applyAmbientLevel(seconds: number) {
    if (!this.ctx || !this.ambientBus) return
    const t = this.ctx.currentTime
    const g = this.ambientBus.gain
    const target = this.ambientPaused ? 0 : this.ducked ? AMBIENT_LEVEL * 0.45 : AMBIENT_LEVEL
    g.cancelScheduledValues(t)
    g.setValueAtTime(g.value, t)
    g.linearRampToValueAtTime(target, t + seconds)
  }

  /** Baja o sube el ambiente (al pausar / reanudar). */
  setAmbientPaused(paused: boolean) {
    this.ambientPaused = paused
    this.applyAmbientLevel(paused ? 0.8 : 1.5)
  }

  /** Apaga el ambiente con un fundido de salida. */
  stopAmbient(fadeSeconds = 2.5) {
    if (this.sparkleTimer) clearInterval(this.sparkleTimer)
    this.sparkleTimer = null
    if (!this.ctx || !this.ambientBus) return
    const t = this.ctx.currentTime
    const g = this.ambientBus.gain
    g.cancelScheduledValues(t)
    g.setValueAtTime(g.value, t)
    g.linearRampToValueAtTime(0, t + fadeSeconds)
    const nodes = this.ambientNodes
    nodes.forEach((n) => {
      try {
        n.stop(t + fadeSeconds + 0.1)
      } catch {
        /* ya parado */
      }
    })
    this.ambientNodes = []
    this.ambientBus = null
  }

  /** Burbuja que se explota despacio: tono redondo que sube un poco, con eco que se apaga. */
  pop() {
    const ctx = this.ctx
    if (!ctx || !this.master || ctx.state !== 'running') return
    const t = ctx.currentTime + 0.02

    const out = ctx.createGain()
    out.gain.value = 0.9
    out.connect(this.master)

    // Eco suave
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.22
    const feedback = ctx.createGain()
    feedback.gain.value = 0.32
    const echoFilter = ctx.createBiquadFilter()
    echoFilter.type = 'lowpass'
    echoFilter.frequency.value = 1400
    delay.connect(echoFilter).connect(feedback).connect(delay)
    echoFilter.connect(out)

    // Cuerpo de la burbuja
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(320, t)
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.09)
    osc.frequency.exponentialRampToValueAtTime(560, t + 0.5)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(0.32, t + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
    osc.connect(env)
    env.connect(out)
    env.connect(delay)

    // Armónico suave para que suene "redonda"
    const harm = ctx.createOscillator()
    harm.type = 'sine'
    harm.frequency.setValueAtTime(960, t)
    harm.frequency.exponentialRampToValueAtTime(1240, t + 0.06)
    const harmEnv = ctx.createGain()
    harmEnv.gain.setValueAtTime(0.0001, t)
    harmEnv.gain.exponentialRampToValueAtTime(0.06, t + 0.008)
    harmEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
    harm.connect(harmEnv).connect(out)

    osc.start(t)
    harm.start(t)
    osc.stop(t + 0.75)
    harm.stop(t + 0.3)
    // Limpieza cuando se apague el eco
    setTimeout(() => {
      try {
        out.disconnect()
        delay.disconnect()
      } catch {
        /* nada */
      }
    }, 3000)
  }

  close() {
    this.stopAmbient(0.3)
    const ctx = this.ctx
    this.ctx = null
    this.master = null
    if (ctx) setTimeout(() => ctx.close().catch(() => undefined), 500)
  }
}
