// Diagnóstico del entorno de ESTA computadora para el front del dashboard.
//
//   npm run diagnostico                 # revisa todo, incluido el build
//   npm run diagnostico -- --sin-build  # más rápido
//   npm run diagnostico -- --guardar    # además guarda docs/diagnosticos/<fecha>_<equipo>.md
//
// API_URL (por defecto http://localhost:3001) es la API que usará `npm run dev`.
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { hostname, platform, release } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = new Set(process.argv.slice(2))
const API = process.env.API_URL ?? 'http://localhost:3001'
const secciones = []
const problemas = []
let actual

const seccion = (t) => secciones.push((actual = { titulo: t, lineas: [] }))
const ok = (t) => actual.lineas.push(`- [v] ${t}`)
const info = (t) => actual.lineas.push(`- [i] ${t}`)
const mal = (t) => {
  actual.lineas.push(`- [x] ${t}`)
  problemas.push(t)
}
const sh = (cmd) => {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
  } catch {
    return null
  }
}

// ------------------------------------------------------------------ sistema
seccion('Sistema')
info(`Equipo: ${hostname()} | ${platform()} ${release()} | Node ${process.version}`)
const [major, minor] = process.versions.node.split('.').map(Number)
if (major > 20 || (major === 20 && minor >= 19)) ok('Node >= 20.19 (Vite)')
else mal(`Node ${process.version} es muy viejo para Vite: instala Node 22 LTS`)
existsSync(join(ROOT, 'node_modules')) ? ok('node_modules instalado') : mal('Falta node_modules -> npm install')
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
info(`react ${pkg.dependencies.react} · lightweight-charts ${pkg.dependencies['lightweight-charts']} · vite ${pkg.devDependencies.vite}`)

// ------------------------------------------------------------------ git
seccion('Git')
const rama = sh('git rev-parse --abbrev-ref HEAD')
if (!rama) info('No es un repositorio git o no hay commits todavía')
else {
  info(`Rama ${rama} | último commit: ${sh('git log -1 --format="%h %s (%cr)"') ?? 'ninguno'}`)
  const sucio = sh('git status --porcelain')
  sucio ? info(`Cambios sin commitear: ${sucio.split('\n').length} archivos`) : ok('Árbol de trabajo limpio')
}

// ------------------------------------------------------------------ API
seccion(`API (${API})`)
try {
  const r = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(5000) })
  const body = await r.json().catch(() => ({}))
  if (r.ok) ok('La API responde y tiene BD y Redis')
  else mal(`La API responde pero está degradada: BD ${body.db ? 'ok' : 'caída'}, Redis ${body.redis ? 'ok' : 'caído'}`)
} catch {
  mal(`La API no responde en ${API}. Arráncala (trading-dashboard-api: npm run start:dev) o define API_URL`)
}

// ------------------------------------------------------------------ build
seccion('Tipos, lint y build')
if (args.has('--sin-build')) info('Omitido (--sin-build)')
else {
  for (const [nombre, cmd] of [['tipos', 'npx tsc -b'], ['lint', 'npx oxlint src'], ['build', 'npx vite build']]) {
    try {
      const out = execSync(`${cmd} 2>&1`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString()
      const avisos = (out.match(/warning/g) ?? []).length
      ok(`${nombre}: sin errores${avisos ? ` (${avisos} avisos)` : ''}`)
    } catch (e) {
      mal(`${nombre}: falla. ${(e.stdout?.toString() ?? '').split('\n').filter(Boolean).slice(-3).join(' ')}`)
    }
  }
}

// ------------------------------------------------------------------ salida
const fecha = new Date()
let md = `# Diagnóstico de entorno - ${hostname()} - ${fecha.toLocaleString('es-EC')}\n\n`
for (const s of secciones) md += `## ${s.titulo}\n\n${s.lineas.join('\n')}\n\n`
md += `## Resumen\n\n${problemas.length ? 'Problemas encontrados:\n' + problemas.map((p) => `1. ${p}`).join('\n') : 'Sin problemas.'}\n`

console.log(md)
if (args.has('--guardar')) {
  const dir = join(ROOT, 'docs', 'diagnosticos')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${fecha.toLocaleDateString('sv-SE')}_${hostname()}.md`)
  writeFileSync(file, md)
  console.log(`Guardado en ${file}`)
}
process.exit(problemas.length ? 1 : 0)
