/** EMA igual que pandas ewm(span=n, adjust=False), como indicators.py del sistema. */
export function ema(values: number[], n: number): (number | null)[] {
  const k = 2 / (n + 1)
  const out: (number | null)[] = []
  let prev: number | null = null
  values.forEach((v, i) => {
    prev = prev == null ? v : v * k + prev * (1 - k)
    // Las primeras n velas aún no son fiables: no se dibujan
    out.push(i >= n - 1 ? prev : null)
  })
  return out
}
