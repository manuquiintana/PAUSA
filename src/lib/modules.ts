export type ModuleId = 'stretch' | 'breathe' | 'mindfulness' | 'positive' | 'reset'

export interface ModuleInfo {
  id: ModuleId
  name: string
  minutes: string
  description: string
  color: string // de tailwind.config → modulo.*
  bg: string
}

export const MODULES: ModuleInfo[] = [
  { id: 'stretch', name: 'Stretch & Move', minutes: '10 min', color: '#6F9A82', bg: '#E3EDE6',
    description: 'Estiramientos en silla, cuello y hombros, espalda, manos y muñecas.' },
  { id: 'breathe', name: 'Breathe', minutes: '5 min', color: '#7FA7B3', bg: '#E4EEF1',
    description: 'Respiración consciente para soltar tensión y recuperar la concentración.' },
  { id: 'mindfulness', name: 'Mindfulness & Grounding', minutes: '10 min', color: '#9A8FB5', bg: '#ECE9F3',
    description: 'Meditación guiada, grounding 5-4-3-2-1 y desconexión mental.' },
  { id: 'positive', name: 'Positive Mindset', minutes: '5 min', color: '#E58F6E', bg: '#F8E6DD',
    description: 'Afirmaciones, gratitud y reflexiones para empezar o cerrar el día.' },
  { id: 'reset', name: 'Reset Break', minutes: '5-10 min', color: '#C9A86A', bg: '#F4ECDC',
    description: 'Descanso visual 20-20-20, microdescansos y desconexión de pantallas.' },
]
