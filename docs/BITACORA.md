# Bitácora de trabajo

Registro corto de cada sesión, para retomar desde cualquier computadora. **Lo más reciente arriba.**
Formato: fecha · equipo · qué se hizo · qué quedó pendiente / siguiente paso.

---

## 2026-11-24 (creación) · DESKTOP-QQ3KOCN

- Proyecto React 19 + Vite creado al lado de `forex-trading-system` y `trading-dashboard-api`. Gráficos con lightweight-charts.
- Pantallas: Gráfico (herramientas de dibujo inspiradas en la captura de TradingView del usuario + "lo que ve el modelo"), Hora por hora, Operaciones, Rendimiento.
- Diseño: grafito petróleo + latón (solo para el umbral y la selección), IBM Plex Sans / Condensed. Colores del gráfico pasados por el validador de daltonismo: verde/rojo quedan en el límite, por eso las velas alcistas son huecas.
- Revisado con capturas headless y una API simulada (fuera del repo). Arreglado al revisar: eje de precios con formato distinto a la leyenda, distancias del oro en pips en vez de USD, decimales con punto y desborde en pantallas angostas.
- `git init` hecho, sin commits.
- **Siguiente paso:** crear el repo en GitHub, probarlo en local contra la API conectada a la BD real (W1) y desplegar en Dokploy.
