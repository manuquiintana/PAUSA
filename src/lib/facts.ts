/**
 * "¿Sabías que…?": un dato breve con respaldo científico al terminar cada pausa.
 * Cada dato cita su fuente. Redactados con prudencia (lo que dice el estudio, sin exagerar).
 * Pendientes de revisión profesional, como el resto del contenido.
 */

export interface Fact {
  id: string
  text: string
  source: string
  url?: string
}

export const FACTS: Record<string, Fact> = {
  respiracion: {
    id: 'respiracion',
    text: 'Respirar despacio, a menos de 10 respiraciones por minuto, se asocia con más sensación de calma y relajación, y con cambios en la variabilidad del ritmo cardiaco.',
    source: 'Zaccaro et al. (2018), revisión sistemática en Frontiers in Human Neuroscience',
    url: 'https://doi.org/10.3389/fnhum.2018.00353',
  },
  imaginar: {
    id: 'imaginar',
    text: 'Imaginar algo activa en el cerebro muchas de las mismas zonas que verlo de verdad. Por eso importa tanto lo que te dices y lo que imaginas.',
    source: 'Dijkstra, Bosch y van Gerven (2019), Trends in Cognitive Sciences',
    url: 'https://doi.org/10.1016/j.tics.2019.02.004',
  },
  gratitud: {
    id: 'gratitud',
    text: 'En un experimento, las personas que anotaban cosas por las que estaban agradecidas mostraron más emociones positivas que las que anotaban contratiempos.',
    source: 'Emmons y McCullough (2003), Journal of Personality and Social Psychology',
    url: 'https://doi.org/10.1037/0022-3514.84.2.377',
  },
  ayudar: {
    id: 'ayudar',
    text: 'Las personas a las que se pidió gastar una pequeña cantidad en otros se sintieron más felices ese día que las que la gastaron en sí mismas.',
    source: 'Dunn, Aknin y Norton (2008), Science',
    url: 'https://doi.org/10.1126/science.1150952',
  },
  listaManana: {
    id: 'listaManana',
    text: 'En un estudio de sueño, escribir una lista concreta de tareas pendientes antes de dormir ayudó a conciliar el sueño unos 9 minutos antes que escribir lo ya hecho.',
    source: 'Scullin et al. (2018), Journal of Experimental Psychology: General',
  },
  mente: {
    id: 'mente',
    text: 'Pasamos casi la mitad del tiempo despiertos (un 46,9 %) pensando en algo distinto de lo que estamos haciendo, y eso suele hacernos sentir peor.',
    source: 'Killingsworth y Gilbert (2010), Science',
    url: 'https://doi.org/10.1126/science.1192439',
  },
  micropausas: {
    id: 'micropausas',
    text: 'Las micropausas de 10 minutos o menos se asocian con más vitalidad y menos fatiga durante la jornada.',
    source: 'Albulescu et al. (2022), metaanálisis de 22 estudios en PLOS ONE',
    url: 'https://doi.org/10.1371/journal.pone.0272460',
  },
  vista: {
    id: 'vista',
    text: 'Para descansar la vista frente a la pantalla, los oftalmólogos recomiendan la regla 20-20-20: cada 20 minutos, mira algo a unos 6 metros durante 20 segundos.',
    source: 'American Academy of Ophthalmology',
  },
  moverse: {
    id: 'moverse',
    text: 'Interrumpir el tiempo sentado con paseos breves cada 20 minutos redujo los niveles de glucosa e insulina después de comer en adultos con sobrepeso.',
    source: 'Dunstan et al. (2012), Diabetes Care',
    url: 'https://doi.org/10.2337/dc11-1931',
  },
}

/** Dato de cada actividad. Si una actividad tiene varios, se alternan. */
const BY_ACTIVITY: Record<string, string[]> = {
  'stretch-cuello-hombros': ['micropausas', 'moverse'],
  'stretch-espalda-manos': ['moverse', 'micropausas'],
  'stretch-de-pie': ['moverse'],
  'breathe-consciente': ['respiracion'],
  'breathe-soltar-tension': ['respiracion'],
  'breathe-cuadrada': ['respiracion'],
  'mind-grounding-54321': ['mente'],
  'mind-recorrido-cuerpo': ['mente', 'imaginar'],
  'mind-atencion-plena': ['mente'],
  'pos-gratitud': ['gratitud', 'ayudar'],
  'pos-intencion-dia': ['imaginar'],
  'pos-intencion-jornada': ['imaginar', 'micropausas'],
  'pos-cerrar-jornada': ['listaManana'],
  'reset-20-20-20': ['vista'],
  'reset-movimiento': ['moverse', 'micropausas'],
  'reset-desconexion': ['micropausas'],
}

/** Dato para una actividad; `seed` (p. ej. el día) alterna entre los disponibles. */
export function factFor(activityId: string, seed = 0): Fact {
  const ids = BY_ACTIVITY[activityId] ?? ['micropausas']
  return FACTS[ids[Math.abs(seed) % ids.length]]
}
