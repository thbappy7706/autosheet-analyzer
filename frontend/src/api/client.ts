import type {
  AggregateRequest,
  AggregateResponse,
  Analysis,
  ApiErrorBody,
  RowsPage,
  Upload,
} from '../types/analysis'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

/** ApiError carries the machine-readable error code from the backend. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly params?: Record<string, string | number>

  constructor(code: string, message: string, status: number, params?: Record<string, string | number>) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    if (params) this.params = params
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Accept-Language': navigator.language || 'en',
      ...(init?.headers ?? {}),
    },
  })
  if (res.status === 204) return undefined as T
  const text = await res.text()
  const body: unknown = text ? JSON.parse(text) : null
  if (!res.ok) {
    const err = body as ApiErrorBody | null
    throw new ApiError(
      err?.error?.code ?? 'INTERNAL_ERROR',
      err?.error?.message ?? `Request failed with status ${res.status}`,
      res.status,
      err?.error?.params,
    )
  }
  return body as T
}

export interface UploadOptions {
  file: File
  sheet?: string
  signal?: AbortSignal
  onProgress?: (percent: number) => void
}

/**
 * Uploads a file via XHR so upload progress and cancellation are available.
 */
export function uploadFile({ file, sheet, signal, onProgress }: UploadOptions): Promise<Upload> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append('file', file)
    if (sheet) form.append('sheet', sheet)

    xhr.open('POST', `${API_BASE}/uploads`)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('Accept-Language', navigator.language || 'en')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      let body: unknown = null
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        body = null
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as Upload)
        return
      }
      const err = body as ApiErrorBody | null
      reject(
        new ApiError(
          err?.error?.code ?? 'INTERNAL_ERROR',
          err?.error?.message ?? `Upload failed with status ${xhr.status}`,
          xhr.status,
          err?.error?.params,
        ),
      )
    }
    xhr.onerror = () => reject(new ApiError('NETWORK_ERROR', 'Network error during upload', 0))
    xhr.onabort = () => reject(new ApiError('ABORTED', 'Upload cancelled', 0))

    if (signal) {
      if (signal.aborted) {
        xhr.abort()
        return
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }
    xhr.send(form)
  })
}

export const api = {
  getUpload: (id: string) => request<Upload>(`/uploads/${id}`),
  deleteUpload: (id: string) => request<void>(`/uploads/${id}`, { method: 'DELETE' }),
  getAnalysis: (id: string, sheet?: string) =>
    request<Analysis>(`/uploads/${id}/analysis${sheet ? `?sheet=${encodeURIComponent(sheet)}` : ''}`),
  getRows: (id: string, params: { sheet?: string; page?: number; pageSize?: number; sort?: string; order?: string; filter?: string }) => {
    const q = new URLSearchParams()
    if (params.sheet) q.set('sheet', params.sheet)
    if (params.page) q.set('page', String(params.page))
    if (params.pageSize) q.set('pageSize', String(params.pageSize))
    if (params.sort) q.set('sort', params.sort)
    if (params.order) q.set('order', params.order)
    if (params.filter) q.set('filter', params.filter)
    const qs = q.toString()
    return request<RowsPage>(`/uploads/${id}/rows${qs ? `?${qs}` : ''}`)
  },
  aggregate: (id: string, body: AggregateRequest) =>
    request<AggregateResponse>(`/uploads/${id}/aggregate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
}
