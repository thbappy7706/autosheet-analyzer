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
    <form action={formAction} className="w-full">
      <input
        ref={inputRef}
        type="file"
        name="file"
        className="sr-only"
        accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) setSelectedName(file.name)
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
        className={`flex flex-col items-center justify-center gap-3 w-full rounded-2xl border-2 border-dashed p-8 sm:p-12 cursor-pointer transition-colors ${
          dragging ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-100 hover:border-primary/60'
        }`}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-70" aria-hidden="true">
          <path d="M12 16V4m0 0 4 4m-4-4L8 8" />
          <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
        </svg>
        <div className="text-center">
          <p className="font-medium">
            {dragging ? t('dropHere') : t('dropzone')}{' '}
            <span className="link link-primary">{t('browse')}</span>
          </p>
          <p className="text-xs opacity-70 mt-1">
            {t('supported')} · {t('maxSize', { size: MAX_UPLOAD_SIZE / (1024 * 1024) })}
          </p>
          {selectedName ? <p className="text-xs mt-2 break-anywhere opacity-90">{selectedName}</p> : null}
        </div>
      </div>

      {pending ? (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>{progress >= 100 ? t('processing') : t('uploading', { percent: progress })}</span>
            <button type="button" className="btn btn-xs btn-ghost" onClick={cancel}>
              {t('cancelUpload')}
            </button>
          </div>
          <progress className="progress progress-primary w-full" value={progress} max={100} />
          <p className="text-xs opacity-60">{t('analyzingProgress')}</p>
        </div>
      ) : null}

      {state.status === 'error' && state.error ? (
        <div role="alert" className="alert alert-error mt-4">
          <span className="text-sm break-anywhere">{state.error}</span>
        </div>
      ) : null}

      {state.status === 'success' && state.upload && state.upload.sheets.length > 1 ? (
        <div className="mt-4 card bg-base-100 border border-base-300">
          <div className="card-body p-4">
            <h2 className="card-title text-base">{t('chooseSheet')}</h2>
            <p className="text-sm opacity-70">{t('chooseSheetHelp')}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {state.upload.sheets.map((sheet) => (
                <button
                  key={sheet}
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => navigate(`/d/${state.upload?.id}/summary?sheet=${encodeURIComponent(sheet)}`)}
                >
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
  )
}
