# TODO — Vistas móvil con teclado fijo (revisión manual en emulador)

Revisado en: `expo-pixel` (1080x2400, Android), usuario `nigg`, teclado QWERTY
(Gboard). Build instalada = anterior al fix KAV de esta rama
(`KeyboardAvoidingView behavior="height"` en Android + `adjustResize`).
Las vistas sin teclado están todas OK.

## Bugs confirmados (con teclado abierto)

- [ ] **KB-01 — Login: logo recortado.** Con QWERTY abierto el ScrollView
  centra el contenido y el `2026` queda cortado por arriba. No se puede hacer
  scroll hasta él.
  `frontend/src/screens/login-screen.tsx` (KAV + `container` centrado).
- [ ] **KB-02 — Login: `Entrar`/`Crear cuenta` inalcanzables.** Con foco en
  `Contraseña` los botones quedan tras el teclado; obligan a cerrarlo para
  poder entrar.
- [ ] **KB-03 — Login/Register: el foco no hace scroll al campo.** Al enfocar
  `Contraseña`, el campo queda tras el teclado (bounds degenerados en
  `uiautomator`: `[116,1620][965,1517]`). Solo TAB lo trae a vista.
- [ ] **KB-04 — Register: igual que KB-01/KB-03.** Logo recortado y campo
  enfocado oculto tras el teclado.
  `frontend/src/screens/register-screen.tsx`.
- [ ] **KB-05 — Modal `Nueva tarea` colapsa con QWERTY.** Desaparecen
  Estado, Asignar a, Prioridad, Puntos, Fecha, Hora, Frecuencia y Tags; solo
  quedan Título y `Crear tarea`. En `uiautomator` todos los hijos salen con
  altura negativa (p. ej. Tags `[116,1660][965,1242]`, `Frecuencia`
  `[116,1403][965,1242]`). Con foco en Tags, el campo enfocado tampoco se ve.
  `frontend/src/screens/kanban-screen.tsx` (`ModalShell`).
- [ ] **KB-06 — Modal `Nueva pizarra` colapsa con QWERTY.** Desaparecen
  `Nombre` y las etiquetas; solo input + `Crear pizarra`. Mismo `ModalShell`.

## Verificado OK (no tocar salvo regresión)

- Login/Register/Calendar/Kanban/Archive (ruta y modal) sin teclado.
- Modales `Nueva pizarra` / `Nuevo estado` / `Nueva tarea` cerrados.
- Modal `Nuevo estado` + teclado numérico (WIP): auto-scroll al campo, CTA
  visible y scroll manual hasta `Nombre` OK. Referencia de comportamiento bueno.
- Modal `Nueva tarea` + `Semanal`: fila de días L–D, Tags y CTA correctos con
  scroll (sin teclado).

## Notas de entorno (no son bugs de la app)

- Gboard del emulador salta solo a handwriting/stylus con taps `adb` y muestra
  el tutorial "Try out your stylus" que tapa la app. Se recupera con QWERTY vía
  menú `Show on-screen keyboard` o `pm clear` + reboot. En dispositivo real no
  aplica.
- Tras el reboot, `screencap` salió negro hasta forzar parada y arranque en
  frío de la app (la jerarquía `uiautomator` sí renderizaba).

## Seguimiento

- Esta rama ya cambia el KAV a `behavior={ios ? 'padding' : undefined}` en
  login/register/`ModalShell` + test `keyboard-avoiding.test.tsx`.
- Pendiente: rebuild del APK, instalar y re-verificar KB-01…KB-06 con teclado.
