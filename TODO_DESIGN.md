# Auditoría visual móvil — Motivation Calendar

> Rama: `chore/mobile-design-audit`
>
> Propósito: documentar defectos visuales y de usabilidad móvil para corregirlos en PRs independientes.
>
> Alcance de esta rama: auditoría y capturas; **no** modifica pantallas ni estilos.
> Revisado: 2026-11-11.

## Método y entorno reproducible

- **Android nativo:** Expo Go SDK 57 en emulador Pixel 7, Android 15/API 35, 1080×2400, 420 dpi. Postgres en Docker; backend Node/tsx en `:3000`; Metro en `:8081`; Expo Go conectado con `adb reverse tcp:8081 tcp:8081`.
- **Playwright:** export de desarrollo Expo Web en `http://localhost:8099`, API local en `:3000`, con viewports **390×844** y **320×568**. Se recorrieron rutas y modales con datos demo y una pizarra de auditoría con contenido largo. Playwright valida el render web responsive; los hallazgos nativos se confirman con capturas Android/ADB, no se extrapolan desde Web.
- **Datos:** el usuario demo seed tiene 3 pizarras y tareas. Se añadieron datos temporales de auditoría para probar títulos largos y archivo; el usuario `designempty` sirvió para revisar Kanban sin pizarras.
- **Ruido del entorno excluido como defecto de producto:** Expo Go muestra su control flotante de desarrollo. El emulador tuvo un ANR de `System UI` durante el arranque y se recuperó esperando. El primer intento de Playwright en `:8081` usó un bundle/baseURL incorrectos; la auditoría web válida se hizo en `:8099` con `EXPO_PUBLIC_API_URL=http://localhost:3000`. En el flujo web válido: 0 errores de consola y una advertencia deprecada de estilos `shadow*`.

### Resumen ejecutivo

Los problemas más urgentes son el **safe area superior de Android** (el saludo queda bajo la status bar), los **formularios modales de Kanban** (campos/CTA se solapan o quedan cortados) y el **tablero horizontal móvil** (contenido recortado y sin indicador de desplazamiento). En teléfono pequeño también se ocultan acciones debajo del primer viewport y el calendario requiere descubrir un scroll interno sin pista visible.

## Hallazgos confirmados

Severidades: **P1** impide entender o completar un flujo sin esfuerzo/gestos no indicados; **P2** degrada claramente legibilidad o descubribilidad; **P3** mejora menor.

### D-01 — Contenido bajo status bar / falta safe area superior — P1

- **Pantallas:** calendario y Kanban Android; revisar todas las pantallas basadas en `Screen`/`AppHeader`.
- **Repro:** abrir calendario con sesión; después abrir Kanban. En Pixel 7, `Hola, demo` se dibuja encima de la hora/indicadores del sistema. En Kanban no se aprecia el título/subtítulo de pantalla; queda la navegación antes del selector.
- **Evidencia:** [`native-calendar.png`](design-audit/native-calendar.png), [`native-kanban.png`](design-audit/native-kanban.png). El árbol Android sitúa `Hola, demo` en `[32,42]-[1049,89]`, en la misma región que la status bar.
- **Zona a revisar:** `frontend/src/components/ui.tsx` (`Screen`, padding superior fijo y `AppHeader`) y `frontend/app/_layout.tsx`/`StatusBar`; no hay un inset superior compartido en el contenedor de pantalla.
- **Aceptación futura:** ninguna cabecera ni modal se dibuja bajo status bar; verificar calendario, Kanban, archivo y auth en Android/iOS, con capturas sin solapes.

### D-02 — Navegación móvil apilada y cabecera de Kanban sin jerarquía — P2

- **Pantallas:** calendario y Kanban.
- **Observación:** en mobile `KanbanScreen` usa botones de navegación a ancho completo en columna; en el calendario sucede lo mismo. En Kanban el espacio inicial se consume en `Calendario`, `Salir`, `Nueva pizarra`, `Nuevo estado`, `Nueva tarea` y `Archivo` antes de dar contexto al tablero; el título de pantalla tampoco se aprecia en la captura Android (ver D-01).
- **Evidencia:** [`native-kanban.png`](design-audit/native-kanban.png), [`kanban-mobile.png`](design-audit/kanban-mobile.png). El render web deja visibles dos filas completas de navegación antes del selector del tablero.
- **Zona a revisar:** `kanban-screen.tsx` (`mobileHeaderActions`, `mobileToolbarActions`) y `calendar-screen.tsx` (`mobileMainNav`).
- **Aceptación futura:** cabecera con título siempre visible y navegación compacta; acciones frecuentes agrupadas sin empujar la primera columna fuera del primer viewport.

### D-03 — Modal «Nueva pizarra» con campos y CTA solapados en Android — P1

- **Pantalla:** Kanban → Nueva pizarra.
- **Repro:** abrir el modal desde Android Pixel 7. Las cajas de Nombre/Descripción quedan apiladas bajo el botón «Crear pizarra»; los labels no quedan asociados visualmente a los campos y el CTA tapa parte de las entradas.
- **Evidencia:** [`native-board-modal.png`](design-audit/native-board-modal.png). En web el mismo modal no se solapa: [`board-modal-mobile.png`](design-audit/board-modal-mobile.png); por tanto mantener prueba visual específica para nativo.
- **Zona a revisar:** `kanban-screen.tsx` (`ModalShell`, modal board) y `components/ui.tsx` (`Field`, cuyo contenedor tiene `flex: 1`). El modal usa `ModalShell` sin scroll.
- **Aceptación futura:** inputs y CTA nunca se superponen; modal limitado al área segura, desplazable si hace falta y con CTA visible/alcanzable con teclado en 320×568 y Android.

### D-04 — Modal «Nuevo estado» también se comprime y tapa controles — P1

- **Pantalla:** Kanban → Nuevo estado.
- **Repro:** abrir en Android. El label «Color» aparece dibujado encima de una caja vacía grande; el selector y checks quedan comprimidos y el botón «Crear estado» pisa el campo del límite WIP.
- **Evidencia:** [`native-column-modal.png`](design-audit/native-column-modal.png). En Web el layout se ve correcto en 390×844: [`column-modal-mobile.png`](design-audit/column-modal-mobile.png).
- **Zona a revisar:** `kanban-screen.tsx` (`ModalShell`, modal column), `Field` y estilos de `modal`/`colorPicker`.
- **Aceptación futura:** orden visual nombre → color → toggles → WIP → CTA, sin intersecciones a escala de fuente Android normal o ampliada; si el alto disponible no alcanza, scroll interno visible.

### D-05 — Modal «Nueva tarea»: CTA fuera del área visible — P1

- **Pantalla:** Kanban → Nueva tarea.
- **Repro:** abrir en Android. El formulario es alto; «Crear tarea» queda cortado en la parte inferior del modal, justo antes de la zona de navegación. En viewport web 320×568, la captura inicial llega a Fecha/Hora y no muestra Tags ni el CTA.
- **Evidencia:** [`native-task-modal.png`](design-audit/native-task-modal.png), [`task-modal-small-320.png`](design-audit/task-modal-small-320.png). Aunque usa `ModalShell scroll`, no hay CTA fijo ni indicación visual de que el modal continúa; comprobar la interacción con teclado antes de cerrar el hallazgo.
- **Zona a revisar:** `kanban-screen.tsx` (modal task y `ModalShell`), `KeyboardAvoidingView`/insets y footer del formulario.
- **Aceptación futura:** todos los campos y «Crear tarea» se alcanzan sin quedar tapados por teclado, gesto inferior ni límites del modal; CTA sticky o scroll inequívoco; verificado en 320×568 y Pixel 7.

### D-06 — Kanban horizontal recortado, desplazamiento sin pista — P1

- **Pantalla:** Kanban con pizarras y columnas.
- **Repro:** en Playwright a 390×844 seleccionar la pizarra «Auditoría visual móvil». El viewport corta la columna/tarjeta por la derecha y recorta el chip de pizarra; el contenido sólo aparece al arrastrar horizontalmente. La barra de scroll está desactivada. Con un título largo, Playwright midió viewport 390 px, área visible del carrusel 358 px, columna 931 px, texto 881 px y scroll horizontal de 3754 px.
- **Evidencia:** [`kanban-mobile.png`](design-audit/kanban-mobile.png), [`kanban-small-320.png`](design-audit/kanban-small-320.png), [`long-content-kanban-mobile.png`](design-audit/long-content-kanban-mobile.png), [`native-kanban-long-title.png`](design-audit/native-kanban-long-title.png).
- **Zona a revisar:** `kanban-screen.tsx` (`ScrollView horizontal`, `showsHorizontalScrollIndicator={false}`, `mobileColumn: width: '78%'`, `boardOptions`). En Web el track interno llegó a 1202 px y el título expandió la columna/card a 931/909 px en un viewport de 390 px; el ancho no queda limitado de forma efectiva al viewport.
- **Aceptación futura:** columna de ancho calculado con el viewport, texto legible dentro de la tarjeta y pista clara de que hay más columnas/pizarras; comprobar swipe y scroll en Android y Web, incluido 320 px.

### D-07 — Títulos de tareas largos se perciben cortados en tarjeta — P2

- **Pantalla:** Kanban con título de tarea largo.
- **Repro:** abrir la pizarra temporal de auditoría. En la tarjeta el título termina visualmente en el borde derecho del viewport antes de que el usuario pueda leerlo; la navegación horizontal del tablero hace que parezca truncamiento.
- **Evidencia:** [`long-content-kanban-mobile.png`](design-audit/long-content-kanban-mobile.png), [`native-kanban-long-title.png`](design-audit/native-kanban-long-title.png).
- **Zona a revisar:** ancho/overflow de `mobileColumn` junto con `taskTitle` (`numberOfLines={3}`); definir si el texto debe envolver o mostrar ellipsis deliberado, sin cortar a mitad de palabra por el viewport.
- **Aceptación futura:** título largo legible hasta el límite diseñado (hasta 3 líneas) y overflow/ellipsis explícito; test con 100+ caracteres.

### D-08 — Estado Kanban vacío ofrece acciones sin contexto — P2

- **Pantalla:** usuario recién registrado, Kanban sin pizarras.
- **Repro:** abrir Kanban con la cuenta `designempty`. «Nuevo estado» y «Archivo» se ven como acciones disponibles aunque requieren una pizarra; «Nueva tarea» se ve deshabilitada. El mensaje inferior dice «Pulsa una tarjeta para avanzar al siguiente estado» cuando no hay ni tablero ni tarjetas.
- **Evidencia:** [`kanban-empty-mobile.png`](design-audit/kanban-empty-mobile.png), viewport 320×568.
- **Zona a revisar:** estado vacío de `kanban-screen.tsx` y habilitación/jerarquía del toolbar.
- **Aceptación futura:** ilustración/mensaje de primer uso con «Crear pizarra» como CTA primario; deshabilitar u ocultar acciones que requieren una pizarra y eliminar el hint de mover tarjeta hasta que haya tareas.

### D-09 — Calendario con scroll interno escondido y poca densidad de lectura — P2

- **Pantalla:** calendario en 390×844 y 320×568.
- **Repro/evidencia:** Playwright inspeccionó los 365 botones. A 390×844 la lista tiene `clientHeight=288`, `scrollHeight=1369`, `overflow-y:auto`; tras `scrollTop=1113` Día 365 queda visible. `showsVerticalScrollIndicator={false}`: el usuario debe descubrir el gesto dentro del grid, mientras la leyenda/footer permanecen fuera de ese scroll. Capturas: [`calendar-mobile.png`](design-audit/calendar-mobile.png), [`calendar-small-320.png`](design-audit/calendar-small-320.png), [`calendar-grid-bottom-mobile.png`](design-audit/calendar-grid-bottom-mobile.png), [`native-calendar.png`](design-audit/native-calendar.png).
- **Zona a revisar:** `calendar-screen.tsx` (`FlatList`, `gridList`, leyenda/footer y `mobileLegend`); etiquetas de 8–9 px con tracking grande (`mobileTagline`, `statLabel`).
- **Aceptación futura:** acceso obvio a los 365 días y a leyenda/footer (scroll vertical de pantalla o affordance visible); texto de apoyo y métricas legibles al ancho 320 px; validar tamaños de toque.

### D-10 — Registro: CTA secundario queda debajo del primer viewport pequeño — P2

- **Pantalla:** registro a 320×568.
- **Observación:** «Ya tengo cuenta» aparece cortado al borde inferior en la primera vista. La pantalla usa un `ScrollView`; el teclado Android no se mantuvo visible de forma consistente durante esta pasada, así que verificar en la PR que se puede llegar a ambos CTAs con teclado abierto y que el scroll es descubrible.
- **Evidencia:** [`register-small-320.png`](design-audit/register-small-320.png), [`native-register.png`](design-audit/native-register.png).
- **Zona a revisar:** `register-screen.tsx` (`ScrollView`, formulario centrado y padding vertical) más comportamiento de teclado.
- **Aceptación futura:** el CTA primario y el secundario son alcanzables con teclado, a 320×568, y no se recortan en Android.

### D-11 — Targets compactos por debajo del mínimo táctil — P2

- **Pantallas:** navegación/acciones compactas en móvil.
- **Observación:** `PrimaryButton` compacto define `minHeight: 40` y `SecondaryButton` compacto `minHeight: 36` en `components/ui.tsx`; el modo móvil los usa en navegación. Aumentar o garantizar área táctil ≥44 dp sin aumentar innecesariamente el peso visual.
- **Aceptación futura:** inspeccionar `onLayout`/bounds nativos y comprobar todos los botones móviles con mínimo táctil de 44 dp, manteniendo la jerarquía visual.

### D-12 — Estado offline inconsistente y sin acción de recuperación — P2

- **Pantallas:** calendario y Kanban con backend apagado.
- **Repro:** parar el backend y recargar. En calendario el error queda como texto rojo suelto entre métricas y grid; en Kanban aparece en una caja roja, pero no hay botón de reintento. El toolbar mantiene acciones de board aparentemente activas, y permanece el mensaje de «Pulsa una tarjeta» aunque la carga falló y no hay tarjetas.
- **Evidencia:** [`calendar-offline-mobile.png`](design-audit/calendar-offline-mobile.png), [`kanban-offline-mobile.png`](design-audit/kanban-offline-mobile.png).
- **Aceptación futura:** estado offline consistente con explicación, acción «Reintentar», y acciones dependientes de datos deshabilitadas mientras no haya conexión; sin mensajes contradictorios de estado vacío.

## Bloques de corrección propuestos — 1 bloque = 1 futura PR

Cada PR futura debe seguir TDD: primero regresión reproducible (RTL para componente/estado y/o Playwright para viewport), después cambio de estilos/layout, finalmente screenshot Android y gates verdes.

1. **PR UI-1 — `fix/mobile-safe-area-navigation`** (D-01, D-02): safe areas, título visible y navegación móvil compacta. Test de no-solape con status/navigation bars y capturas calendario/Kanban.
2. **PR UI-2 — `fix/kanban-mobile-modals`** (D-03, D-04, D-05): tamaños, scroll/teclado y CTA sticky de los modales board/column/task. RTL cubriendo todos los controles; Playwright 320×568/390×844; Android.
3. **PR UI-3 — `fix/kanban-mobile-horizontal-layout`** (D-06, D-07): ancho de columnas/selector, overflow, pista de swipe y títulos largos. Test de scrollWidth/viewport y regresión de títulos largos; Android + Web.
4. **PR UI-4 — `fix/mobile-empty-error-states`** (D-08, D-12): primer uso/offline y disponibilidad de acciones sin board/conexión. RTL para 0 pizarras/0 tarjetas + backend caído y captura Playwright.
5. **PR UI-5 — `fix/calendar-mobile-layout`** (D-09): scroll/descubribilidad del grid y tipografía de leyenda/métricas. Comprobar 365 botones, acceso a Día 365 y leyenda a 320/390 px.
6. **PR UI-6 — `fix/mobile-auth-touch-targets`** (D-10, D-11): layout auth con teclado/viewport bajo y áreas táctiles. RTL + Playwright 320×568 + verificación bounds Android.

## Pantallas/estados cubiertos

- Auth: login y registro, vacíos; validación funcional no forma parte de esta auditoría visual.
- Calendario: cuenta seed, métricas, grid y leyenda; viewport 390×844 y 320×568.
- Kanban: cuenta seed con 3 pizarras/tareas; pizarra con título/tags largos; cuenta sin pizarras; modales nueva pizarra, nuevo estado, nueva tarea y archivo vacío.
- Archivo: ruta vacía y fila archivada de ejemplo.
- No se encontraron defectos visuales bloqueantes en el layout web de login/registro/archivo a 390 px; conservar sus capturas como regresión.

## Índice de capturas

Las capturas están versionadas en [`design-audit/`](design-audit/):

| Evidencia | Capturas |
|---|---|
| Android Pixel 7 | [`native-login.png`](design-audit/native-login.png), [`native-register.png`](design-audit/native-register.png), [`native-calendar.png`](design-audit/native-calendar.png), [`native-kanban.png`](design-audit/native-kanban.png), [`native-kanban-empty.png`](design-audit/native-kanban-empty.png), [`native-kanban-long-title.png`](design-audit/native-kanban-long-title.png) |
| Android modales | [`native-board-modal.png`](design-audit/native-board-modal.png), [`native-column-modal.png`](design-audit/native-column-modal.png), [`native-task-modal.png`](design-audit/native-task-modal.png), [`native-archive-modal.png`](design-audit/native-archive-modal.png) |
| Playwright 390×844 | [`login-mobile.png`](design-audit/login-mobile.png), [`register-mobile.png`](design-audit/register-mobile.png), [`calendar-mobile.png`](design-audit/calendar-mobile.png), [`calendar-grid-bottom-mobile.png`](design-audit/calendar-grid-bottom-mobile.png), [`kanban-mobile.png`](design-audit/kanban-mobile.png), [`long-content-kanban-mobile.png`](design-audit/long-content-kanban-mobile.png), [`board-modal-mobile.png`](design-audit/board-modal-mobile.png), [`column-modal-mobile.png`](design-audit/column-modal-mobile.png), [`task-modal-mobile.png`](design-audit/task-modal-mobile.png), [`archive-mobile.png`](design-audit/archive-mobile.png), [`archive-route-mobile.png`](design-audit/archive-route-mobile.png), [`archive-populated-mobile.png`](design-audit/archive-populated-mobile.png), [`calendar-offline-mobile.png`](design-audit/calendar-offline-mobile.png), [`kanban-offline-mobile.png`](design-audit/kanban-offline-mobile.png) |
| Playwright 320×568 | [`login-small-320.png`](design-audit/login-small-320.png), [`register-small-320.png`](design-audit/register-small-320.png), [`calendar-small-320.png`](design-audit/calendar-small-320.png), [`kanban-small-320.png`](design-audit/kanban-small-320.png), [`kanban-empty-mobile.png`](design-audit/kanban-empty-mobile.png), [`task-modal-small-320.png`](design-audit/task-modal-small-320.png) |

## Criterio de cierre de esta auditoría

- [x] Rama de auditoría independiente: `chore/mobile-design-audit`.
- [x] TODO separado de `TODO.md`: este fichero `TODO_DESIGN.md`.
- [x] Se recorrieron rutas/estados en Android y Web con datos demo; Playwright se usó para Web responsive y ADB para la app nativa (no Puppeteer).
- [x] Se documentaron hallazgos con severidad, pasos de reproducción, código/zona a revisar y capturas.
- [ ] Las correcciones **no** se ejecutan en esta rama; UI-1…UI-6 son ramas/PRs futuras separadas.
