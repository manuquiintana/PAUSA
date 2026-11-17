# Pausa — MVP de bienestar laboral (B2B)

Lee este archivo entero antes de cualquier tarea. Estas decisiones son fijas: no las cambies sin preguntarme.

## Producto
"Pausa" (nombre provisional). Plataforma de bienestar laboral que se vende a empresas por suscripción mensual por empleado.
Promesa: "Tu bienestar también forma parte de tu jornada laboral."
La app interrumpe brevemente la jornada con pausas guiadas de 5-10 minutos y permite a cada empleado registrar cómo empieza y termina el día. La empresa gestiona horarios y ve indicadores AGREGADOS de bienestar de sus equipos.
Clave de experiencia: la pausa no es una distracción, es algo sencillo, agradable y fácil de encajar en el día.
Objetivo de esta versión: demo funcional para enseñar a 1-2 empresas piloto. Sin pagos.
Idioma de la interfaz: español de España.

## Usuarios y roles
1. Empleado: recibe recordatorios, hace pausas, hace check-in al empezar y terminar el día, personaliza preferencias, ve su propio histórico.
2. Manager: todo lo del empleado + panel de SU equipo, solo con datos agregados.
3. Admin de empresa (RR. HH.): gestiona equipos, invita empleados, asigna managers, define la ventana horaria de pausas.
Multiempresa: los datos de una empresa nunca son visibles para otra.

## Módulos de pausas
1. Stretch & Move (10 min): estiramientos en silla, cuello y hombros, espalda y lumbar, manos y muñecas, estiramientos de pie.
2. Breathe (5 min): respiración consciente, reducir tensión, recuperar concentración, relajación.
3. Mindfulness & Grounding (10 min): meditación guiada, grounding 5-4-3-2-1, atención plena, desconexión mental.
4. Positive Mindset (5 min): afirmaciones, motivación diaria, gratitud, reflexiones de inicio/fin de día.
5. Reset Break (5-10 min): descanso visual (20-20-20), pausas de movimiento, desconexión de pantallas, microdescansos.
Cada actividad = secuencia de pasos (texto breve + segundos + animación sencilla). Sin vídeo en el MVP.
El contenido de ejemplo debe marcarse como "pendiente de revisión profesional".

## Personalización (funcionalidad estrella)
Onboarding de 4 preguntas (máx. 60 s): qué necesita más (Estiramientos, Calma, Focus, Energía, Mindfulness — multi), cuántas pausas al día (1/2/3), si puede ponerse de pie, horario aproximado.
La sugerencia de pausa usa esas preferencias, excluye ejercicios de pie si no puede, y no repite la actividad del día anterior.

## Check-in
- Inicio de jornada: "¿Cómo te sientes hoy?" escala 1-10 en un toque, nota libre opcional, botón "Ahora no".
- Fin de jornada: "¿Cómo terminas el día?" igual.
- Voluntario; nunca bloquea la app.
- Si la nota es ≤ 4, sugerencia amable de Breathe o Grounding, sin tono clínico.
- La nota libre es PRIVADA del empleado.

## Privacidad — reglas no negociables
- Managers y admins NUNCA ven puntuaciones ni notas individuales, ni pueden deducirlas.
- Indicadores de equipo solo si ≥ 5 personas distintas aportaron datos en el periodo; si no: "Datos insuficientes para proteger la privacidad del equipo".
- Se aplica en la base de datos: RLS en todas las tablas + funciones SQL `security definer` que devuelven solo agregados. Un manager que consulte la tabla de check-ins de otro usuario obtiene 0 filas.
- Nada de listas de "quién no ha hecho check-in" ni rankings entre compañeros.
- El onboarding explica en lenguaje claro qué ve la empresa y qué no.
- El empleado puede descargar (CSV) y borrar su historial.

## Stack (fijo)
- Frontend: Vite + React + TypeScript + Tailwind CSS. PWA con `vite-plugin-pwa`.
- Backend: Supabase (Auth email+contraseña, Postgres con RLS, Edge Functions).
- Recordatorios: Supabase Cron (pg_cron + pg_net) invocando una Edge Function cada 5 min que envía Web Push (VAPID, librería `web-push` o equivalente compatible con Deno).
- Hosting del frontend: Vercel.
- Tests: Vitest para lógica; script SQL/TS que verifica las políticas RLS con usuarios de cada rol.
- Secretos solo en variables de entorno (`.env.local`, nunca en el repo). Mantén `.env.example` actualizado.

## Diseño
- Calmado, cálido, profesional. Ni estética de fitness agresiva ni de app médica.
- Paleta: fondo #F7F4EE, principal verde salvia #6F9A82, texto #1F2A2E, acento coral #E58F6E, neutro #8A9499. Un color por módulo derivado de esta paleta.
- Tipografía: títulos "Fraunces", texto "Inter".
- Reproductor a pantalla completa con animación central (círculo de respiración, progreso por paso); pausar y salir siempre visibles.
- Responsive: 375 px, 768 px y 1366 px. Contraste AA, toque ≥ 44 px, usable con teclado.
- Horas siempre en formato 24 h.
- Avatar guía (mujer/hombre, ilustración plana propia) que hace cada ejercicio a la vez que la persona.

## Sonido y voz
- Pensado para hacer las pausas con los ojos cerrados: guía sonora en las respiraciones (tono que sube al inspirar, que baja al soltar y cuenco tibetano en cada segundo) y voz suave que lee cada paso.
- Voz: audios generados con ElevenLabs (voz 8gK5gnQBZnJWm1ta8R8X) en `public/voz/` con `npm run voz:generar` o la acción de GitHub "Generar voz" (secreto ELEVENLABS_API_KEY). Si un texto no tiene audio, se usa la voz del navegador. La clave nunca va al frontend.
- Sonido ambiente en todas las pausas (variante "luz" en el recorrido por el cuerpo) y burbuja al completar el anillo de cada paso. Sonido y voz se pueden silenciar por separado.
- Al terminar cada pausa, un "¿Sabías que…?" con respaldo científico y su fuente.

## Reglas de trabajo
- Antes de cada fase, presenta un plan de 5-10 líneas (pantallas, tablas, archivos) y espera mi OK.
- No inventes funcionalidades. Si crees que falta algo, propónlo y espera confirmación.
- No simules integraciones ni botones; lo no terminado se marca "Próximamente" y me lo dices.
- No añadas dependencias sin justificarlas. Nada de pagos, chat, IA generativa ni gamificación entre compañeros.
- Sin lenguaje de diagnóstico médico o psicológico.
- No modifiques lo de fases anteriores salvo que te lo pida.
- Al cerrar cada fase: ejecuta tests y lint, haz commit con mensaje claro, y lista hecho / no terminado / cómo probarlo.

## Comandos
- `npm run dev` — desarrollo
- `npm run test` — tests
- `npm run lint` — lint
- `npm run test:rls` — verificación de políticas de privacidad (crear en fase 1)
- `npm run voz:generar` — genera los audios de la voz guía (necesita ELEVENLABS_API_KEY)
