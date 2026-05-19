import { ArrowDownUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { SortState } from '@/utils/table'
import type { ReactNode } from 'react'

interface SortableThProps<T extends string> {
  sort: SortState<T>
  sortKey: T
  onSort: (key: T) => void
  children: ReactNode
  className?: string
}

export function SortableTh<T extends string>({
  sort,
  sortKey,
  onSort,
  children,
  className,
}: SortableThProps<T>) {
  const active = sort.key === sortKey

  return (
    <th className={cn('px-4 py-3 text-left font-medium', className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1.5 text-left hover:text-foreground"
      >
        {children}
        <ArrowDownUp
          className={cn(
            'h-3.5 w-3.5',
            active ? 'text-primary' : 'text-muted-foreground/60',
          )}
        />
        {active && (
          <span className="sr-only">
            {sort.direction === 'asc' ? 'ordem crescente' : 'ordem decrescente'}
          </span>
        )}
      </button>
    </th>
  )
}
