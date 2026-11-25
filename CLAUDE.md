# CLAUDE.md

Guía para Claude Code en este repositorio. Responde al usuario en **español**.

## Qué es

"Mesa de análisis": front (React 19 + Vite + lightweight-charts) del dashboard del sistema de trading Forex
(`../forex-trading-system`). Todo lo lee de `../trading-dashboard-api`. **No envía órdenes.** Guía en `README.md`.

## Comandos

```powershell
npm install
npm run dev                 # http://localhost:5173 (API en http://localhost:3001; otra: $env:API_URL)
npm run build               # tsc + build (debe pasar antes de cada commit)
npm run lint
npm run diagnostico         # entorno de esta PC (--guardar lo deja en docs/diagnosticos/)
```

## Arquitectura

| Carpeta | Qué hace |
|---|---|
| `src/api/` | `client.ts` (fetch mismo origen, avisa si vence la sesión), `hooks.ts` (React Query), `types.ts` (respuestas de la API) |
| `src/auth/` | Sesión y pantalla de login |
| `src/live/` | Socket.IO `/live`: invalida consultas y muestra avisos |
| `src/chart/` | `ChartWorkspace` (gráfico, leyenda, rangos), `drawings.ts` (primitiva de dibujo + `TimeMapper`), `ToolRail` |
| `src/components/` | Panel del modelo, medidor de probabilidad, gráfico de una serie, controles |
| `src/pages/` | Gráfico, Hora por hora, Operaciones, Rendimiento |
| `src/lib/` | `format.ts` (números y fechas en es-EC, hora de Ecuador), `factors.ts` (copia de `_factor_text` del sistema) |
| `src/styles/` | `tokens.css` (colores y tipografía, ambos temas) y `app.css` |

## Reglas

- Colores solo desde los tokens de `tokens.css`; el gráfico los lee con `getComputedStyle`. El latón (`--brass`) es solo para umbral y selección.
- Velas alcistas huecas: segunda codificación para daltonismo. Validar colores nuevos con el validador de la skill `dataviz`.
- Números con `lib/format.ts` (coma decimal es-EC, distancias del oro en USD). Fechas en hora de Ecuador.
- Modelo / práctica / prueba y sim / MT5 nunca se mezclan en una misma cifra.
- Si cambia `_factor_text` en `daily_report.py` del sistema, actualizar `src/lib/factors.ts`.
- Textos en español, en palabras de trader, sin jerga del sistema.

## Estado del proyecto

| Archivo | Para qué |
|---|---|
| `docs/BITACORA.md` | Qué se hizo en cada sesión y el **siguiente paso**. Leer primero |
| `docs/DIAGNOSTICO.md` | Estado del código: qué funciona, problemas W1..Wn, riesgos |
| `docs/diagnosticos/<fecha>_<equipo>.md` | Entorno de cada computadora (`npm run diagnostico -- --guardar`) |

**Al empezar:** `git pull`, leer la bitácora y correr `npm run diagnostico -- --sin-build`.
**Al terminar una tarea relevante:** entrada nueva arriba en la bitácora, actualizar el diagnóstico si cambió y proponer commit + push.
