import { useActionState, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ApiError, uploadFile } from '../../api/client'
import type { Upload } from '../../types/analysis'

const MAX_UPLOAD_SIZE = Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? 50) * 1024 * 1024

interface UploadState {
  status: 'idle' | 'error' | 'success'
  error?: string
  upload?: Upload
}

const initialState: UploadState = { status: 'idle' }

/**
 * Upload form built on a React 19 form action. Progress is reported through an
 * XMLHttpRequest so a large file shows a live progress bar and can be
 * cancelled mid-flight.
 */
export function UploadForm() {
  const { t } = useTranslation('upload')
  const { t: tErrorsRaw } = useTranslation('errors')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  // Error codes are dynamic strings coming from the API.
  const tErrors = tErrorsRaw as unknown as (key: string, options?: Record<string, unknown>) => string

  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const runUpload = useCallback(
    async (_prev: UploadState, formData: FormData): Promise<UploadState> => {
      const file = formData.get('file')
      if (!(file instanceof File) || file.size === 0) {
        return { status: 'error', error: tErrors('MISSING_FILE') }
      }
      if (file.size > MAX_UPLOAD_SIZE) {
        return { status: 'error', error: tErrors('FILE_TOO_LARGE', { size: MAX_UPLOAD_SIZE / (1024 * 1024) }) }
      }

      const controller = new AbortController()
      abortRef.current = controller
      setProgress(0)
      try {
        const upload = await uploadFile({
          file,
          signal: controller.signal,
          onProgress: setProgress,
        })
        return { status: 'success', upload }
      } catch (err) {
        if (err instanceof ApiError && err.code === 'ABORTED') {
          return { status: 'idle' }
        }
        const message =
          err instanceof ApiError ? tErrors(err.code, { ...err.params, size: MAX_UPLOAD_SIZE / (1024 * 1024) }) : tErrors('unknown')
        return { status: 'error', error: message }
      } finally {
        abortRef.current = null
      }
    },
    [tErrors],
  )

  const [state, formAction, pending] = useActionState(
    async (prev: UploadState, formData: FormData) => {
      const next = await runUpload(prev, formData)
      if (next.status === 'success' && next.upload) {
        const first = next.upload.sheets[0] ?? ''
        navigate(`/d/${next.upload.id}/summary?sheet=${encodeURIComponent(first)}`)
      }
      return next
    },
    initialState,
  )

  const acceptSelection = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setSelectedName(file.name)
    // Submit the form programmatically so the action receives the file.
    const dt = new DataTransfer()
    dt.items.add(file)
    if (inputRef.current) {
      inputRef.current.files = dt.files
      inputRef.current.form?.requestSubmit()
    }
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    acceptSelection(e.dataTransfer.files)
  }

  const cancel = () => {
    abortRef.current?.abort()
    setProgress(0)
  }

  return (
    <div className="w-full space-y-6">
      <form action={formAction} className="w-full">
        <input
          ref={inputRef}
          type="file"
          name="file"
          className="sr-only"
          accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setSelectedName(file.name)
            // Selecting a file starts the analysis immediately.
            e.currentTarget.form?.requestSubmit()
          }}
        />

        <div
          role="button"
          tabIndex={0}
          aria-label={t('browse')}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-4 w-full rounded-3xl border-2 border-dashed p-8 sm:p-14 cursor-pointer transition-all duration-200 group ${
            dragging
              ? 'border-primary bg-primary/10 shadow-lg scale-[1.01]'
              : 'border-base-300 bg-base-100 hover:border-primary/70 hover:shadow-md'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary grid place-items-center group-hover:scale-110 transition-transform">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <div className="text-center space-y-1">
            <p className="font-semibold text-base sm:text-lg">
              {dragging ? t('dropHere') : t('dropzone')}
            </p>
            <p className="text-xs opacity-70">
              {t('maxSize', { size: MAX_UPLOAD_SIZE / (1024 * 1024) })}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5">
              <span className="badge badge-neutral badge-soft badge-sm">XLSX</span>
              <span className="badge badge-neutral badge-soft badge-sm">XLS</span>
              <span className="badge badge-neutral badge-soft badge-sm">CSV</span>
              <span className="badge badge-neutral badge-soft badge-sm">TSV</span>
            </div>

            {selectedName ? (
              <div className="pt-3">
                <span className="badge badge-primary badge-outline gap-1.5 py-3 px-3 text-xs max-w-xs sm:max-w-md truncate">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {selectedName}
                </span>
              </div>
            ) : (
              <div className="pt-3">
                <span className="btn btn-primary btn-sm gap-2 shadow-xs group-hover:btn-active">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                    <path d="M12 12v9" />
                    <path d="m16 16-4-4-4 4" />
                  </svg>
                  {t('browse')}
                </span>
              </div>
            )}
          </div>
        </div>

        {pending ? (
          <div className="mt-4 card bg-base-100 border border-base-300 p-4 rounded-2xl shadow-xs space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span className="loading loading-spinner loading-xs text-primary" />
                {progress >= 100 ? t('processing') : t('uploading', { percent: progress })}
              </span>
              <button type="button" className="btn btn-xs btn-ghost text-error" onClick={cancel}>
                {t('cancelUpload')}
              </button>
            </div>
            <progress className="progress progress-primary w-full h-2 rounded-full" value={progress} max={100} />
            <p className="text-xs opacity-60">{t('analyzingProgress')}</p>
          </div>
        ) : null}

        {state.status === 'error' && state.error ? (
          <div role="alert" className="alert alert-error alert-soft rounded-2xl shadow-xs mt-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-sm font-medium break-anywhere">{state.error}</span>
          </div>
        ) : null}

        {state.status === 'success' && state.upload && state.upload.sheets.length > 1 ? (
          <div className="mt-4 card bg-base-100 border border-base-300 rounded-2xl shadow-sm">
            <div className="card-body p-4 sm:p-5">
              <h2 className="card-title text-base">{t('chooseSheet')}</h2>
              <p className="text-xs opacity-70">{t('chooseSheetHelp')}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {state.upload.sheets.map((sheet) => (
                  <button
                    key={sheet}
                    type="button"
                    className="btn btn-sm btn-outline btn-primary gap-1.5"
                    onClick={() => navigate(`/d/${state.upload?.id}/summary?sheet=${encodeURIComponent(sheet)}`)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M3 9h18M9 21V9" />
                    </svg>
                    {sheet}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <p className="sr-only" aria-live="polite">
          {pending ? tCommon('loading') : ''}
        </p>
      </form>

    </div>
  )
}
