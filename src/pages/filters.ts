import type { Group, Mode } from '../api/types'

export const GROUP_OPTIONS: { value: Group; label: string }[] = [
  { value: 'modelo', label: 'Modelo' },
  { value: 'practica', label: 'Práctica' },
  { value: 'prueba', label: 'Prueba' },
]

export const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'sim', label: 'Simulación' },
  { value: 'mt5', label: 'MT5' },
]

export const GROUP_HELP: Record<Group, string> = {
  modelo: 'Las operaciones del modelo: lo que cuenta para decidir sobre dinero real.',
  practica: 'La mejor compra o venta de cada reporte aunque no llegue al 50 %. Se cuenta aparte.',
  prueba: 'Operaciones manuales de comprobación (scripts/operacion_prueba.py).',
  todos: 'Todas juntas.',
}
