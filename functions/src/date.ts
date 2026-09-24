// Normalização de data pura (sem hora) para o formato canônico ISO `AAAA-MM-DD`.
//
// ESPELHO de `packages/utils/src/date.ts` (parseDateInput/isIsoDate). As Functions são
// deployadas isoladas e não importam de `@ueno/*` — por isso a cópia em vez do import.
// `functions/test/date.test.cjs` cobre os mesmos casos do teste de lá; se um lado mudar,
// o outro precisa mudar junto.

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const BR_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/**
 * Aceita `DD/MM/AAAA` e `AAAA-MM-DD`, devolve sempre ISO (ou `null` se vazio/inválido).
 *
 * Aceitar BR não é tolerância a formato ruim: o build 9 (em TestFlight) envia BR, e
 * exigir ISO aqui quebraria o cadastro de quem está com o app antigo instalado.
 */
export function parseDateInput(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const iso = ISO_DATE_RE.exec(trimmed)
  if (iso) {
    const [, year, month, day] = iso
    return isRealDate(Number(year), Number(month), Number(day)) ? trimmed : null
  }

  const br = BR_DATE_RE.exec(trimmed)
  if (br) {
    const [, day, month, year] = br
    return isRealDate(Number(year), Number(month), Number(day)) ? `${year}-${month}-${day}` : null
  }

  return null
}
