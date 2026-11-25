# Diagnóstico técnico del front del dashboard

> Estado del **código** (no de una computadora). El estado de cada equipo se genera con
> `npm run diagnostico -- --guardar` y queda en [diagnosticos/](diagnosticos/).
> Actualizar este archivo cada vez que se cierre o aparezca un pendiente.

**Última revisión:** 2026-11-24 · tipos y build sin errores · lint sin errores, 14 avisos de estilo de React (W6).

## 1. Qué funciona hoy

| Área | Estado | Dónde |
|---|---|---|
| Login y vuelta al login cuando vence la sesión | ✅ con API simulada | `src/auth/` |
| Gráfico de velas H1 con EMA 50/200, operaciones (entrada, salida en R) y líneas de la posición abierta | ✅ revisado en capturas | `src/chart/ChartWorkspace.tsx` |
| Herramientas de dibujo: tendencia, horizontal, zona, Fibonacci, medir; imán, selección, deshacer, ocultar, borrar; atajos de teclado | ✅ código · ⏳ probar a mano con el mouse (W1) | `src/chart/drawings.ts`, `ToolRail.tsx` |
| "Lo que ve el modelo": probabilidades vs. umbral, stop/objetivo, factores en palabras | ✅ revisado en capturas | `src/components/ModelPanel.tsx`, `src/lib/factors.ts` |
| Hora por hora, Operaciones (paginado), Rendimiento (resumen, curva en R, PnL diario, por par) | ✅ revisado en capturas | `src/pages/` |
| Actualización en vivo (Socket.IO): invalida consultas y muestra avisos | ✅ código · ⏳ contra la API real | `src/live/LiveProvider.tsx` |
| Tema oscuro y claro, foco visible, movimiento reducido, colores validados para daltonismo | ✅ | `src/styles/` |
| Pantallas angostas (≥ 492 px verificado) | ✅ | `src/styles/app.css` |
| Docker con nginx: SPA, proxy a la API, cabeceras de seguridad (CSP) | ✅ · ⏳ primer despliegue | `Dockerfile`, `nginx/` |

## 2. Problemas conocidos

| # | Prioridad | Problema | Arreglo propuesto |
|---|---|---|---|
| W1 | **Alta** | Nunca se usó contra la API real ni se probaron a mano las herramientas de dibujo (solo capturas headless con datos simulados) | Primer uso en local con la API conectada a la BD real, o tras el despliegue |
| W2 | Media | Sin pruebas automáticas del front | Vitest para `lib/format.ts`, `lib/factors.ts` y `TimeMapper` de `drawings.ts`; Playwright para login y gráfico |
| W3 | Media | `src/lib/factors.ts` es una copia de `_factor_text` (`services/monitoring/src/daily_report.py` del sistema). Si cambia allá, el panel queda desactualizado | Que la API entregue el texto ya traducido, o un test que compare ambos |
| W4 | Baja | Los dibujos viven solo en el navegador (localStorage): no pasan a otra PC ni al celular | Cuando la API pueda guardar datos propios (no en la BD de trading) |
| W5 | Baja | Solo se muestra la temporalidad de `GRANULARITY` (H1), porque es lo único que guarda el data-collector | Si el sistema guarda más temporalidades, añadir el selector |
| W6 | Baja | `oxlint` da 14 avisos de estilo de React: archivos que exportan componente y hook juntos (afecta solo la recarga en caliente), refs leídas al renderizar y dependencias de `useEffect` en `ChartWorkspace.tsx` (a propósito: esos efectos solo deben correr cuando llegan datos nuevos) | Separar hooks a sus propios archivos y pasar las refs a efectos cuando se refactorice el gráfico |
| W7 | Baja | No se pudo verificar a 390 px (Edge headless no baja de 492). A 492 px todo encaja | Revisar en un celular real |

## 3. Riesgos a vigilar

- **Solo lectura**: el front no debe ofrecer nada que parezca una orden. Si un día se agregan acciones, deben ir por la API y por un canal del sistema, con confirmación explícita.
- **Honestidad de los datos**: el aviso "sin evidencia para dinero real" de Rendimiento refleja `docs/DIAGNOSTICO.md` del sistema (p < 0,00128, revisión 2027-02-09). Actualizarlo si eso cambia.
- **Colores**: el latón (`--brass`) solo marca el umbral y la selección. Velas alcistas huecas: es la segunda codificación para daltonismo, no quitarla. Validar cualquier color nuevo de serie con el validador de la skill `dataviz`.
- **Atribución**: `lightweight-charts` (Apache 2.0) exige su logo de atribución en el gráfico (`attributionLogo: true`).
