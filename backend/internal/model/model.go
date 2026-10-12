// Package model contains the shared structs used across the backend and
// serialized to JSON for the frontend.
package model

import "time"

// Upload is the metadata returned after a file has been stored.
type Upload struct {
	ID        string    `json:"id"`
	Filename  string    `json:"filename"`
	Size      int64     `json:"size"`
	Sheets    []string  `json:"sheets"`
	CreatedAt time.Time `json:"createdAt"`
}

// Table is a parsed sheet: headers plus rows of string cells.
type Table struct {
	Sheet   string
	Headers []string
	Rows    [][]string
}

// ColumnType is the inferred logical type of a column.
type ColumnType string

const (
	TypeInteger     ColumnType = "integer"
	TypeFloat       ColumnType = "float"
	TypeBoolean     ColumnType = "boolean"
	TypeDate        ColumnType = "date"
	TypeDatetime    ColumnType = "datetime"
	TypeCategorical ColumnType = "categorical"
	TypeText        ColumnType = "text"
	TypeIDLike      ColumnType = "id-like"
	TypeConstant    ColumnType = "constant"
)

// Overview is the dataset-level summary.
type Overview struct {
	Rows            int     `json:"rows"`
	Columns         int     `json:"columns"`
	FileSize        int64   `json:"fileSize"`
	Sheet           string  `json:"sheet"`
	MemoryEstimate  int64   `json:"memoryEstimate"`
	DuplicateRows   int     `json:"duplicateRows"`
	EmptyRows       int     `json:"emptyRows"`
	EmptyColumns    int     `json:"emptyColumns"`
	MissingCells    int     `json:"missingCells"`
	MissingPercent  float64 `json:"missingPercent"`
	Sampled         bool    `json:"sampled"`
	AnalyzedRows    int     `json:"analyzedRows"`
	QualityScore    int     `json:"qualityScore"`
	TruncatedColumn bool    `json:"truncatedColumns"`
}

// HistogramBin is a single bin of a numeric histogram.
type HistogramBin struct {
	From  float64 `json:"from"`
	To    float64 `json:"to"`
	Count int     `json:"count"`
}

// CategoryCount is a value/count pair for categorical columns.
type CategoryCount struct {
	Value string  `json:"value"`
	Count int     `json:"count"`
	Pct   float64 `json:"pct"`
}

// TimeBucket is a period/count pair for date columns.
type TimeBucket struct {
	Period string `json:"period"`
	Count  int    `json:"count"`
}

// NumericStats holds descriptive statistics for a numeric column.
type NumericStats struct {
	Min          float64        `json:"min"`
	Max          float64        `json:"max"`
	Mean         float64        `json:"mean"`
	Median       float64        `json:"median"`
	Mode         float64        `json:"mode"`
	StdDev       float64        `json:"stdDev"`
	Variance     float64        `json:"variance"`
	Q1           float64        `json:"q1"`
	Q3           float64        `json:"q3"`
	IQR          float64        `json:"iqr"`
	Skewness     float64        `json:"skewness"`
	Kurtosis     float64        `json:"kurtosis"`
	Sum          float64        `json:"sum"`
	OutlierCount int            `json:"outlierCount"`
	Histogram    []HistogramBin `json:"histogram"`
}

// CategoricalStats holds stats for categorical/text columns.
type CategoricalStats struct {
	Top         []CategoryCount `json:"top"`
	Cardinality int             `json:"cardinality"`
	AvgLength   float64         `json:"avgLength"`
	MinLength   int             `json:"minLength"`
	MaxLength   int             `json:"maxLength"`
}

// DateStats holds stats for date/datetime columns.
type DateStats struct {
	Min       string       `json:"min"`
	Max       string       `json:"max"`
	RangeDays int          `json:"rangeDays"`
	Frequency string       `json:"frequency"`
	ByYear    []TimeBucket `json:"byYear"`
	ByMonth   []TimeBucket `json:"byMonth"`
}

// BooleanStats holds the split for boolean columns.
type BooleanStats struct {
	True  int `json:"true"`
	False int `json:"false"`
}

// ColumnProfile is the full profile for a single column.
type ColumnProfile struct {
	Name           string            `json:"name"`
	Index          int               `json:"index"`
	Type           ColumnType        `json:"type"`
	Missing        int               `json:"missing"`
	MissingPct     float64           `json:"missingPct"`
	Unique         int               `json:"unique"`
	UniquePct      float64           `json:"uniquePct"`
	IsConstant     bool              `json:"isConstant"`
	MixedTypes     bool              `json:"mixedTypes"`
	Numeric        *NumericStats     `json:"numeric,omitempty"`
	Categorical    *CategoricalStats `json:"categorical,omitempty"`
	Date           *DateStats        `json:"date,omitempty"`
	Boolean        *BooleanStats     `json:"boolean,omitempty"`
	SuggestedChart string            `json:"suggestedChart"`
}

// CorrelationPair is a pair of numeric columns with their correlation.
type CorrelationPair struct {
	A string  `json:"a"`
	B string  `json:"b"`
	R float64 `json:"r"`
}

// Correlation holds the correlation matrix and notable pairs.
type Correlation struct {
	Columns     []string          `json:"columns"`
	Matrix      [][]float64       `json:"matrix"`
	TopPositive []CorrelationPair `json:"topPositive"`
	TopNegative []CorrelationPair `json:"topNegative"`
	HighPairs   []CorrelationPair `json:"highPairs"`
}

// Insight is a machine-readable finding. Text is rendered by the frontend
// using the `code` and `params` so the API stays language neutral.
type Insight struct {
	Code     string         `json:"code"`
	Severity string         `json:"severity"` // info | warning
	Column   string         `json:"column,omitempty"`
	Params   map[string]any `json:"params,omitempty"`
}

// Analysis is the complete analysis response.
type Analysis struct {
	Overview    Overview        `json:"overview"`
	Columns     []ColumnProfile `json:"columns"`
	Correlation Correlation     `json:"correlation"`
	Insights    []Insight       `json:"insights"`
	GeneratedAt time.Time       `json:"generatedAt"`
	DurationMS  int64           `json:"durationMs"`
}
