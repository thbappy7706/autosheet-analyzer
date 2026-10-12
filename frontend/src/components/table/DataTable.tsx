import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRows } from '../../api/hooks'
import { useDebounced } from '../../hooks/useDebounced'
import { formatNumber } from '../../lib/format'
import { useFormatOptions } from '../../lib/settingsContext'
import type { ColumnProfile, ColumnType } from '../../types/analysis'

const PAGE_SIZES = [50, 100, 500, 1000]

function typeIcon(type: ColumnType): string {
  switch (type) {
    case 'integer':
    case 'float':
      return '#'
    case 'boolean':
      return '◑'
    case 'date':
    case 'datetime':
      return '🗓'
    case 'id-like':
      return '🆔'
    case 'categorical':
      return 'A'
    default:
      return 'T'
  }
}

export function DataTable({
  id,
  sheet,
  columns: profiles,
}: {
  id: string
  sheet: string
  columns: ColumnProfile[]
}) {
  const { t } = useTranslation('table')
  const { t: tCommon } = useTranslation('common')
  const opts = useFormatOptions()

  const typeByName = useMemo(() => {
    const m = new Map<string, ColumnType>()
    for (const p of profiles) m.set(p.name, p.type)
    return m
  }, [profiles])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [sorting, setSorting] = useState<SortingState>([])
  const [filterInput, setFilterInput] = useState('')
  const filter = useDebounced(filterInput, 350)

  const sort = sorting[0]

  const query = useRows(id, {
    sheet,
    page,
    pageSize,
    sort: sort?.id,
    order: sort ? (sort.desc ? 'desc' : 'asc') : undefined,
    filter: filter || undefined,
  })

  const data = query.data

  const columnDefs = useMemo<ColumnDef<string[]>[]>(
    () =>
      profiles.map((profile, index) => ({
        id: profile.name,
        accessorFn: (row: string[]) => row[index] ?? '',
        header: profile.name,
      })),
    [profiles],
  )

  const table = useReactTable({
    data: data?.rows ?? [],
    columns: columnDefs,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  })

  const rows = table.getRowModel().rows
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 12,
  })

  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="input input-sm input-bordered flex items-center gap-2 w-full sm:w-72">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            className="grow"
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            value={filterInput}
            onChange={(e) => {
              setFilterInput(e.target.value)
              setPage(1)
            }}
          />
        </label>

        <select
          className="select select-sm select-bordered"
          aria-label={t('pageSize')}
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value))
            setPage(1)
          }}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {formatNumber(size, opts)} / {t('title')}
            </option>
          ))}
        </select>

        {data?.filtered ? <span className="badge badge-sm badge-info">{t('filtered')}</span> : null}
        {query.isFetching ? <span className="loading loading-spinner loading-xs" /> : null}
      </div>

      <div
        ref={scrollRef}
        className="overflow-auto max-h-[65vh] rounded-box border border-base-300 bg-base-100"
        style={{ contain: 'strict' }}
      >
        <table className="table table-sm table-pin-rows w-full">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const type = typeByName.get(header.column.id)
                  const sorted = header.column.getIsSorted()
                  return (
                    <th key={header.id} className="bg-base-200 whitespace-nowrap">
                      <button
                        type="button"
                        className="flex items-center gap-1 w-full text-left"
                        onClick={header.column.getToggleSortingHandler()}
                        aria-label={
                          sorted === 'desc'
                            ? t('sortDescending')
                            : sorted === 'asc'
                              ? t('sortAscending')
                              : t('sortAscending')
                        }
                        title={header.column.id}
                      >
                        {type ? (
                          <span aria-hidden="true" className="opacity-60 text-[10px] w-3 shrink-0">
                            {typeIcon(type)}
                          </span>
                        ) : null}
                        <span className="truncate max-w-[200px]">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        {sorted ? <span aria-hidden="true">{sorted === 'desc' ? '▾' : '▴'}</span> : null}
                      </button>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', display: 'block' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index]
              if (!row) return null
              return (
                <tr
                  key={row.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'table',
                    width: '100%',
                    tableLayout: 'fixed',
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="truncate max-w-[240px]" title={String(cell.getValue() ?? '')}>
                      {String(cell.getValue() ?? '')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 && !query.isLoading ? (
          <p className="text-center text-sm opacity-70 py-8">{t('noResults')}</p>
        ) : null}
        {query.isLoading ? <p className="text-center text-sm opacity-70 py-8">{t('loading')}</p> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="opacity-70">
          {tCommon('showing', {
            from: formatNumber(from, opts),
            to: formatNumber(to, opts),
            total: formatNumber(total, opts),
          })}
        </span>
        <div className="join">
          <button
            type="button"
            className="btn btn-sm join-item"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t('previous')}
          </button>
          <span className="btn btn-sm join-item no-animation pointer-events-none">
            {tCommon('page')} {formatNumber(page, opts)} / {formatNumber(totalPages, opts)}
          </span>
          <button
            type="button"
            className="btn btn-sm join-item"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('next')}
          </button>
        </div>
      </div>
    </div>
  )
}
