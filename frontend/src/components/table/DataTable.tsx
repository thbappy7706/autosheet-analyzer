import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useRows } from '../../api/hooks'
import { useDebounced } from '../../hooks/useDebounced'
import { formatNumber } from '../../lib/format'
import { useFormatOptions } from '../../lib/settingsContext'
import { useErrorMessage } from '../../lib/errorMessage'
import { ErrorAlert } from '../common/States'
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
  const message = useErrorMessage()

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
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="space-y-3">
      {/* Table controls toolbar - strictly inline on the same row */}
      <div className="flex items-center gap-2.5 bg-base-100 p-2.5 sm:p-3 rounded-2xl border border-base-300 shadow-2xs w-full">
        <label className="input input-sm input-bordered flex items-center gap-2 flex-1 min-w-0 max-w-sm sm:max-w-md rounded-xl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="opacity-60 shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            className="grow min-w-0 text-xs sm:text-sm"
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            value={filterInput}
            onChange={(e) => {
              setFilterInput(e.target.value)
              setPage(1)
            }}
          />
          {filterInput ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle shrink-0"
              onClick={() => {
                setFilterInput('')
                setPage(1)
              }}
              aria-label={tCommon('close')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </label>

        <select
          className="select select-sm select-bordered rounded-xl shrink-0 text-xs"
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

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {data?.filtered ? (
            <span className="badge badge-sm badge-info badge-soft gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span className="hidden sm:inline">{t('filtered')}</span>
            </span>
          ) : null}
          {query.isFetching ? <span className="loading loading-spinner loading-xs text-primary" /> : null}
        </div>
      </div>

      {/* Table container */}
      <div className="overflow-auto max-h-[65vh] rounded-2xl border border-base-300 bg-base-100 shadow-xs">
        <table className="table table-sm table-pin-rows table-zebra w-full">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const type = typeByName.get(header.column.id)
                  const sorted = header.column.getIsSorted()
                  return (
                    <th key={header.id} className="bg-base-200/95 backdrop-blur whitespace-nowrap py-2.5">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 w-full text-left font-semibold hover:text-primary transition-colors cursor-pointer"
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
                          <span
                            aria-hidden="true"
                            className="badge badge-xs badge-neutral badge-outline font-mono text-[9px] px-1"
                          >
                            {typeIcon(type)}
                          </span>
                        ) : null}
                        <span className="truncate max-w-[200px] text-xs">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {sorted ? (
                          <span aria-hidden="true" className="badge badge-xs badge-primary">
                            {sorted === 'desc' ? '▾' : '▴'}
                          </span>
                        ) : null}
                      </button>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-primary/5 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="truncate max-w-[240px] text-xs" title={String(cell.getValue() ?? '')}>
                    {String(cell.getValue() ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && !query.isLoading && !query.isError ? (
          <div className="text-center py-12 px-4 space-y-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto opacity-40" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="text-sm font-medium opacity-70">{t('noResults')}</p>
          </div>
        ) : null}
        {query.isLoading && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2">
            <span className="loading loading-spinner loading-md text-primary" />
            <p className="text-xs opacity-70">{t('loading')}</p>
          </div>
        ) : null}
        {query.isError ? (
          <div className="p-4">
            <ErrorAlert message={message(query.error)} onRetry={() => void query.refetch()} />
          </div>
        ) : null}
      </div>

      {/* Pagination footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-base-100 p-3 rounded-2xl border border-base-300 shadow-2xs">
        <span className="text-xs opacity-70 font-medium">
          {tCommon('showing', {
            from: formatNumber(from, opts),
            to: formatNumber(to, opts),
            total: formatNumber(total, opts),
          })}
        </span>
        <div className="join shadow-2xs">
          <button
            type="button"
            className="btn btn-sm join-item"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            « {t('previous')}
          </button>
          <span className="btn btn-sm join-item no-animation pointer-events-none text-xs font-semibold">
            {tCommon('page')} {formatNumber(page, opts)} / {formatNumber(totalPages, opts)}
          </span>
          <button
            type="button"
            className="btn btn-sm join-item"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('next')} »
          </button>
        </div>
      </div>
    </div>
  )
}
