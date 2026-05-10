/**
 * Validates a Brazilian CPF number.
 * Accepts formatted (000.000.000-00) or unformatted (00000000000) input.
 */
export function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '')

  if (digits.length !== 11) return false

  // Reject known invalid sequences
  if (/^(\d)\1{10}$/.test(digits)) return false

  const calcDigit = (slice: string, factor: number): number => {
    const sum = slice
      .split('')
      .reduce((acc, d, i) => acc + parseInt(d, 10) * (factor - i), 0)
    const rem = (sum * 10) % 11
    return rem === 10 || rem === 11 ? 0 : rem
  }

  const d1 = calcDigit(digits.slice(0, 9), 10)
  const d2 = calcDigit(digits.slice(0, 10), 11)

  return d1 === parseInt(digits[9]!, 10) && d2 === parseInt(digits[10]!, 10)
}

/**
 * Formats a raw CPF string to the standard format: 000.000.000-00
 */
export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

/**
 * Strips all non-digit characters from a CPF string.
 */
export function parseCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}
