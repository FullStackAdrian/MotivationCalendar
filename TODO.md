# TODO — Vistas móvil con teclado fijo (revisión manual en emulador)

Revisado en: `expo-pixel` (1080x2400, Android), usuario `nigg`, teclado QWERTY
(Gboard). Todos los bugs de abajo se reproducían en el build anterior al fix y
están verificados como CORREGIDOS en el build con los cambios de esta rama.

## Bugs confirmados → CORREGIDOS y verificados en emulador

- [x] **KB-01 — Login: logo recortado.** Causa: `KeyboardAvoidingView`
  `behavior="height"` en Android (doble encogido con `adjustResize`) +
  contenido centrado. Fix: KAV solo en iOS (`undefined` en Android) +
  `useKeyboardVisible` oculta logo/subtítulo con teclado abierto.
  Verificado: formulario completo visible con teclado, sin recortes.
- [x] **KB-02 — Login: `Entrar` inalcanzable.** Con el hero oculto, `Entrar`
  queda visible sobre el teclado; además `returnKeyType="done"` en Contraseña
  envía el login desde el teclado (verificado: login solo con teclado).
- [x] **KB-03 — Login/Register: el foco no hacía scroll al campo.** Con el
  layout ya sin colapso, Android lleva el campo a la vista; verificado con
  foco en Contraseña/Tags visible sobre el teclado.
- [x] **KB-04 — Register: igual que KB-01/KB-03.** Mismo fix (hero oculto).
  Verificado: logo fuera, campo enfocado con cursor visible, `Crear cuenta`
  accesible.
- [x] **KB-05 — Modal `Nueva tarea` colapsaba con QWERTY** (desaparecían
  Estado/Asignar/Prioridad/Puntos/Fecha/Frecuencia/Tags; bounds con altura
  negativa en `uiautomator`). Fix: `useScrollToFocusedInput` en `ModalShell`
  (responder nativo del ScrollView + fallback `measureLayout`).
  Verificado: auto-scroll hasta Tags enfocado + CTA `Crear tarea` visible.
- [x] **KB-06 — Modal `Nueva pizarra` colapsaba con QWERTY.** Mismo `ModalShell`
  y mismo fix. Verificado: Nombre + Descripción + `Crear pizarra` visibles.

## Verificado OK (sin cambios, sin regresión)

- Login/Register/Calendar/Kanban/Archive (ruta y modal) sin teclado.
- Modales `Nueva pizarra` / `Nuevo estado` / `Nueva tarea` cerrados.
- Modal `Nuevo estado` + teclado numérico (WIP): auto-scroll, CTA y scroll
  manual OK.
- Modal `Nueva tarea` + `Semanal`: fila de días L–D, Tags y CTA con scroll OK.

## Cambios de esta rama (resumen)

- `frontend/src/hooks/use-keyboard-visible.ts` (nuevo).
- `frontend/src/hooks/use-scroll-to-focused-input.ts` (nuevo).
- `Field` reenvía `ref` (`frontend/src/components/ui.tsx`).
- Login/register: hero oculto con teclado, `returnKeyType` next/done con
  avance de foco y envío con guardas.
- Kanban `ModalShell`: KAV solo iOS + scroll al campo enfocado.
- `app.json` + dep `expo-build-properties`: `usesCleartextTraffic` para el
  backend local http en el APK.
- Tests: `keyboard-avoiding`, `keyboard-auth`, `keyboard-modal-scroll`
  (jest verde), `tsc`, smoke Expo y suite backend verdes.

## Notas de entorno (no son bugs de la app)

- Gboard del emulador salta solo a handwriting/stylus con taps `adb` y muestra
  el tutorial "Try out your stylus" que tapa la app (se cierra con BACK).
  En dispositivo real no aplica.
- Tras `pm clear` de Gboard o reboot, `screencap` puede salir negro hasta
  arranque en frío de la app; la jerarquía `uiautomator` sí renderizaba.
