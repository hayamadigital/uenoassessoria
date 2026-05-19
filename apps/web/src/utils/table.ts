export type SortDirection = 'asc' | 'desc'

export interface SortState<T extends string> {
  key: T
  direction: SortDirection
}

export type ActiveFilter = 'active' | 'inactive' | 'all'

export function normalizeText(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function includesText(value: unknown, search: string) {
  const term = normalizeText(search.trim())
  if (!term) return true
  return normalizeText(value).includes(term)
}

export function compareValues(a: unknown, b: unknown) {
  const emptyA = a == null || a === ''
  const emptyB = b == null || b === ''
  if (emptyA && emptyB) return 0
  if (emptyA) return 1
  if (emptyB) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)

  const timeA = typeof a === 'string' ? Date.parse(a) : NaN
  const timeB = typeof b === 'string' ? Date.parse(b) : NaN
  if (!Number.isNaN(timeA) && !Number.isNaN(timeB)) return timeA - timeB

  return String(a).localeCompare(String(b), 'pt-BR', {
    sensitivity: 'base',
    numeric: true,
  })
}

export function sortBy<T, K extends string>(
  rows: T[],
  sort: SortState<K>,
  accessors: Record<K, (row: T) => unknown>,
) {
  const accessor = accessors[sort.key]
  return [...rows].sort((a, b) => {
    const result = compareValues(accessor(a), accessor(b))
    return sort.direction === 'asc' ? result : -result
  })
}

export function nextSort<T extends string>(current: SortState<T>, key: T): SortState<T> {
  if (current.key !== key) return { key, direction: 'asc' }
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
}

export function isWithinDateRange(value: string | null | undefined, from: string, to: string) {
  if (!value) return !from && !to
  const date = value.slice(0, 10)
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

export function matchesActiveFilter(value: boolean, filter: ActiveFilter) {
  if (filter === 'all') return true
  return filter === 'active' ? value : !value
}
