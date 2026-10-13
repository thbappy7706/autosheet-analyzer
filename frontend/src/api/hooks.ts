import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { AggregateRequest } from '../types/analysis'

export const queryKeys = {
  upload: (id: string) => ['upload', id] as const,
  analysis: (id: string, sheet: string) => ['analysis', id, sheet] as const,
  rows: (id: string, params: Record<string, unknown>) => ['rows', id, params] as const,
}

export function useUploadMeta(id: string) {
  return useQuery({
    queryKey: queryKeys.upload(id),
    queryFn: () => api.getUpload(id),
    enabled: Boolean(id),
    retry: false,
  })
}

export function useAnalysis(id: string, sheet: string) {
  return useQuery({
    queryKey: queryKeys.analysis(id, sheet),
    queryFn: () => api.getAnalysis(id, sheet),
    enabled: Boolean(id) && Boolean(sheet),
    staleTime: 5 * 60 * 1000,
  })
}

export interface RowsParams {
  sheet: string
  page: number
  pageSize: number
  sort?: string
  order?: string
  filter?: string
}

export function useRows(id: string, params: RowsParams) {
  return useQuery({
    queryKey: queryKeys.rows(id, { ...params }),
    queryFn: () =>
      api.getRows(id, {
        sheet: params.sheet || undefined,
        page: params.page,
        pageSize: params.pageSize,
        sort: params.sort,
        order: params.order,
        filter: params.filter,
      }),
    // Keep the previous page visible while the next one loads.
    placeholderData: (prev) => prev,
    enabled: Boolean(id),
  })
}

export function useAggregate(id: string, body: AggregateRequest, enabled: boolean) {
  return useQuery({
    queryKey: ['aggregate', id, body],
    queryFn: () => api.aggregate(id, body),
    enabled: enabled && Boolean(id) && Boolean(body.x),
  })
}

export function useDeleteUpload() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteUpload(id),
    onSuccess: () => qc.invalidateQueries(),
  })
}
