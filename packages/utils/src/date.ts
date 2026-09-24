import { format, parseISO, startOfDay, endOfDay, isValid } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

export const JST_TIMEZONE = 'Asia/Tokyo'

// ─────────────────────────────────────────────
// Datas puras (sem hora): aniversário, validade, emissão…
//
// Formato canônico de armazenamento: ISO `AAAA-MM-DD`.
// Formato de exibição/entrada para o usuário: `DD/MM/AAAA`.
//
// Data pura NÃO tem fuso: não usar formatJST/toJST aqui, senão a meia-noite
// vira outro dia dependendo do timezone. Tudo abaixo é manipulação textual.
// ─────────────────────────────────────────────

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const BR_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/

/** Rejeita datas que casam o formato mas não existem no calendário (31/02, 30/02, mês 13…). */
function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/** `true` só para uma data ISO `AAAA-MM-DD` que existe de fato. */
export function isIsoDate(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const match = ISO_DATE_RE.exec(value)
  if (!match) return false
  return isRealDate(Number(match[1]), Number(match[2]), Number(match[3]))
}

/**
 * Normaliza entrada de data para ISO `AAAA-MM-DD`.
 *
 * Aceita `DD/MM/AAAA` e `AAAA-MM-DD` de propósito: o app antigo (build 9) envia BR,
 * e há dados legados gravados em BR — ambos precisam continuar sendo aceitos.
 *
 * Devolve `null` para vazio ou data inválida; quem chama decide se isso é erro.
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

/**
 * ISO `AAAA-MM-DD` → `DD/MM/AAAA` para exibição.
 * Tolera valor legado já em BR (devolve como está) e devolve '' para vazio/inválido.
 */
export function formatDateBR(value: unknown): string {
  const iso = parseDateInput(value)
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Converts a UTC ISO string to a JST Date object.
 */
export function toJST(utcDateStr: string): Date {
  return toZonedTime(parseISO(utcDateStr), JST_TIMEZONE)
}

/**
 * Converts a local/JST Date to UTC ISO string for DB storage.
 */
export function jstToUTC(jstDate: Date): string {
  return fromZonedTime(jstDate, JST_TIMEZONE).toISOString()
}

/**
 * Formats a UTC date string into a readable JST date string.
 * Default: dd/MM/yyyy HH:mm
 */
export function formatJST(
  utcDateStr: string,
  fmt = 'dd/MM/yyyy HH:mm',
  locale: 'pt-BR' | 'en' = 'pt-BR',
): string {
  if (!utcDateStr || !isValid(parseISO(utcDateStr))) return '—'
  const jstDate = toJST(utcDateStr)
  const opts = locale === 'pt-BR' ? { locale: ptBR } : {}
  return format(jstDate, fmt, opts)
}

/**
 * Formats a UTC date string to show only the date part in JST.
 */
export function formatDateJST(utcDateStr: string): string {
  return formatJST(utcDateStr, 'dd/MM/yyyy')
}

/**
 * Formats a UTC date string to show only the time part in JST.
 */
export function formatTimeJST(utcDateStr: string): string {
  return formatJST(utcDateStr, 'HH:mm')
}

/**
 * Gets the start of a JST day as a UTC ISO string.
 * Useful for date range queries.
 */
export function getJSTDayStartUTC(jstDateStr: string): string {
  const jstDate = new Date(`${jstDateStr}T00:00:00`)
  const startJST = startOfDay(jstDate)
  return fromZonedTime(startJST, JST_TIMEZONE).toISOString()
}

/**
 * Gets the end of a JST day as a UTC ISO string.
 */
export function getJSTDayEndUTC(jstDateStr: string): string {
  const jstDate = new Date(`${jstDateStr}T00:00:00`)
  const endJST = endOfDay(jstDate)
  return fromZonedTime(endJST, JST_TIMEZONE).toISOString()
}

/**
 * Returns today's date in JST as YYYY-MM-DD string.
 */
export function getTodayJST(): string {
  const nowJST = toZonedTime(new Date(), JST_TIMEZONE)
  return format(nowJST, 'yyyy-MM-dd')
}

/**
 * Returns a relative label for a UTC date string (e.g. "Hoje", "Amanhã", "Ontem").
 */
export function getRelativeDayLabel(utcDateStr: string, lang: 'pt-BR' | 'en' = 'pt-BR'): string {
  const todayJST = getTodayJST()
  const dateJST = format(toJST(utcDateStr), 'yyyy-MM-dd')

  const today = new Date(todayJST)
  const target = new Date(dateJST)
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (lang === 'pt-BR') {
    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Amanhã'
    if (diffDays === -1) return 'Ontem'
  } else {
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
  }

  return formatDateJST(utcDateStr)
}
