// Types mirroring the backend `internal/model` structs and openapi.yaml.
// Keep in sync with the Go definitions; the API is the source of truth.

export type ColumnType =
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'categorical'
  | 'text'
  | 'id-like'
  | 'constant'

export interface Upload {
  id: string
  filename: string
  size: number
  sheets: string[]
  createdAt: string
}

export interface Overview {
  rows: number
  columns: number
  fileSize: number
  sheet: string
  memoryEstimate: number
  duplicateRows: number
  emptyRows: number
  emptyColumns: number
  missingCells: number
  missingPercent: number
  sampled: boolean
  analyzedRows: number
  qualityScore: number
  truncatedColumns: boolean
}

export interface HistogramBin {
  from: number
  to: number
  count: number
}

export interface CategoryCount {
  value: string
  count: number
  pct: number
}

export interface TimeBucket {
  period: string
  count: number
}

export interface NumericStats {
  min: number
  max: number
  mean: number
  median: number
  mode: number
  stdDev: number
  variance: number
  q1: number
  q3: number
  iqr: number
  skewness: number
  kurtosis: number
  sum: number
  outlierCount: number
  histogram: HistogramBin[] | null
}

export interface CategoricalStats {
  top: CategoryCount[] | null
  cardinality: number
  avgLength: number
  minLength: number
  maxLength: number
}

export interface DateStats {
  min: string
  max: string
  rangeDays: number
  frequency: string
  byYear: TimeBucket[] | null
  byMonth: TimeBucket[] | null
}

export interface BooleanStats {
  true: number
  false: number
}

export interface ColumnProfile {
  name: string
  index: number
  type: ColumnType
  missing: number
  missingPct: number
  unique: number
  uniquePct: number
  isConstant: boolean
  mixedTypes: boolean
  numeric?: NumericStats
  categorical?: CategoricalStats
  date?: DateStats
  boolean?: BooleanStats
  suggestedChart: string
}

export interface CorrelationPair {
  a: string
  b: string
  r: number
}

export interface Correlation {
  columns: string[]
  matrix: number[][]
  topPositive: CorrelationPair[] | null
  topNegative: CorrelationPair[] | null
  highPairs: CorrelationPair[] | null
}

export type Severity = 'info' | 'warning'

export interface Insight {
  code: string
  severity: Severity
  column?: string
  params?: Record<string, string | number>
}

export interface Analysis {
  overview: Overview
  columns: ColumnProfile[]
  correlation: Correlation
  insights: Insight[] | null
  generatedAt: string
  durationMs: number
}

export interface RowsPage {
  sheet: string
  columns: string[]
  rows: string[][]
  page: number
  pageSize: number
  total: number
  totalPages: number
  filtered: boolean
}export type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max'

export interface AggregateRequest {
  sheet?: string
  x: string
  y?: string
  agg: Aggregation
  groupBy?: string
}

export interface AggregatePoint {
  label: string
  value: number
  count: number
}

export interface AggregateResponse {
  sheet: string
  x: string
  y: string
  agg: Aggregation
  points: AggregatePoint[]
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    params?: Record<string, string | number>
  }
}
