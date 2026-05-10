import { format, parseISO, startOfDay, endOfDay, isValid } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

export const JST_TIMEZONE = 'Asia/Tokyo'

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
