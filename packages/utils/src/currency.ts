/**
 * Formats a number as Japanese Yen (JPY).
 * Example: formatJPY(12000) → "¥12,000"
 */
export function formatJPY(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Formats a number as Brazilian Real (BRL).
 * Example: formatBRL(450.5) → "R$ 450,50"
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Parses a JPY formatted string back to a number.
 * Example: parseJPY("¥12,000") → 12000
 */
export function parseJPY(formatted: string): number {
  return parseInt(formatted.replace(/[^\d]/g, ''), 10) || 0
}
