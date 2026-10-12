package analyzer

import (
	"crypto/sha1"
	"encoding/binary"
	"fmt"
	"math"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/example/excel-analyzer/internal/model"
	"github.com/example/excel-analyzer/internal/numutil"
)

// Options controls how much of a table is profiled.
type Options struct {
	Sheet    string
	FileSize int64
	// MaxRows caps how many rows are analyzed. When the table has more
	// rows than this, the excess is dropped and Overview.Sampled is set.
	MaxRows int
}

// topCategories is how many category values are kept per column.
const topCategories = 10

// ProfileTable analyzes a parsed sheet and returns the full analysis result.
func ProfileTable(headers []string, rows [][]string, opts Options) model.Analysis {
	start := time.Now()

	sampled := false
	sampledRows := rows
	var sampleIndices []int
	if opts.MaxRows > 0 && len(rows) > opts.MaxRows {
		step := float64(len(rows)) / float64(opts.MaxRows)
		sampleIndices = make([]int, 0, opts.MaxRows)
		sampledRows = make([][]string, 0, opts.MaxRows)
		for i := 0; i < opts.MaxRows; i++ {
			idx := int(float64(i) * step)
			if idx >= len(rows) {
				idx = len(rows) - 1
			}
			sampleIndices = append(sampleIndices, idx)
			sampledRows = append(sampledRows, rows[idx])
		}
		sampled = true
	}

	ov := overview(headers, sampledRows, opts, sampled)

	profiles := make([]model.ColumnProfile, len(headers))
	numericCols := make([][]float64, len(headers))
	numericNames := make([]string, 0, len(headers))

	sem := make(chan struct{}, max(1, runtime.NumCPU()))
	var wg sync.WaitGroup
	for i := range headers {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			p, vals := profileColumn(headers[i], i, sampledRows)
			profiles[i] = p
			numericCols[i] = vals
		}(i)
	}
	wg.Wait()

	var corrCols [][]float64
	for i := range headers {
		if numericCols[i] != nil {
			numericNames = append(numericNames, headers[i])
			corrCols = append(corrCols, numericCols[i])
		}
	}

	corr := CorrelationMatrix(numericNames, corrCols)
	// Guard against empty correlation for datasets with no numeric columns.
	if corr.Columns == nil {
		corr.Columns = []string{}
	}

	insights := BuildInsights(ov, profiles, corr, headers)

	return model.Analysis{
		Overview:    ov,
		Columns:     profiles,
		Correlation: corr,
		Insights:    insights,
		GeneratedAt: time.Now().UTC(),
		DurationMS:  time.Since(start).Milliseconds(),
	}
}

func overview(headers []string, rows [][]string, opts Options, sampled bool) model.Overview {
	ov := model.Overview{
		Rows:           len(rows),
		Columns:        len(headers),
		FileSize:       opts.FileSize,
		Sheet:          opts.Sheet,
		Sampled:        sampled,
		AnalyzedRows:   len(rows),
		EmptyRows:      0,
		DuplicateRows:  0,
		EmptyColumns:   0,
		TruncatedColumn: false,
	}
	if ov.Rows == 0 {
		ov.QualityScore = 0
		return ov
	}

	seen := make(map[[sha1.Size]byte]struct{}, len(rows))
	var memBytes int64
	nonEmptyByCol := make([]int, len(headers))

	for _, r := range rows {
		empty := true
		for i := range headers {
			var v string
			if i < len(r) {
				v = r[i]
			}
			memBytes += int64(len(v)) + 16
			if strings.TrimSpace(v) != "" {
				empty = false
				nonEmptyByCol[i]++
			}
		}
		if empty {
			ov.EmptyRows++
			continue
		}
		h := rowHash(r)
		if _, ok := seen[h]; ok {
			ov.DuplicateRows++
		} else {
			seen[h] = struct{}{}
		}
	}

	totalCells := len(rows) * len(headers)
	missing := 0
	for _, r := range rows {
		for i := 0; i < len(headers); i++ {
			var v string
			if i < len(r) {
				v = r[i]
			}
			if numutil.IsMissing(v) {
				missing++
			}
		}
	}
	for i := range headers {
		if nonEmptyByCol[i] == 0 {
			ov.EmptyColumns++
		}
	}

	ov.MissingCells = missing
	if totalCells > 0 {
		ov.MissingPercent = round2(float64(missing) / float64(totalCells) * 100)
	}
	ov.MemoryEstimate = 256 + memBytes
	ov.QualityScore = qualityScore(ov, totalCells)
	return ov
}

func qualityScore(ov model.Overview, totalCells int) int {
	score := 100.0
	score -= ov.MissingPercent * 1.2
	if ov.Rows > 0 {
		dupPct := float64(ov.DuplicateRows) / float64(ov.Rows) * 100
		score -= dupPct * 0.5
	}
	if ov.Columns > 0 {
		score -= float64(ov.EmptyColumns) / float64(ov.Columns) * 40
	}
	if ov.Sampled {
		score -= 3
	}
	if score < 0 {
		score = 0
	}
	return int(math.Round(score))
}

func rowHash(r []string) [sha1.Size]byte {
	h := sha1.New()
	for _, c := range r {
		var b [8]byte
		binary.LittleEndian.PutUint64(b[:], uint64(len(c)))
		h.Write(b[:])
		h.Write([]byte(c))
	}
	var out [sha1.Size]byte
	copy(out[:], h.Sum(nil))
	return out
}

func profileColumn(name string, idx int, rows [][]string) (model.ColumnProfile, []float64) {
	ctype, sample, mixed := InferType(name, rows, idx)
	nonMissing := sample.total - sample.missing

	p := model.ColumnProfile{
		Name:       name,
		Index:      idx,
		Type:       ctype,
		Missing:    sample.missing,
		MixedTypes: mixed,
		Unique:     sample.uniqueCount(),
	}
	if sample.total > 0 {
		p.MissingPct = round2(float64(sample.missing) / float64(sample.total) * 100)
	}
	if nonMissing > 0 {
		p.UniquePct = round2(float64(p.Unique) / float64(nonMissing) * 100)
	}
	p.IsConstant = p.Unique <= 1

	var numericVals []float64
	switch ctype {
	case model.TypeInteger, model.TypeFloat, model.TypeIDLike:
		vals := make([]float64, 0, nonMissing)
		aligned := make([]float64, len(rows))
		for i := range aligned {
			aligned[i] = math.NaN()
		}
		for i, r := range rows {
			var raw string
			if idx < len(r) {
				raw = r[idx]
			}
			if v, ok := numutil.ParseNumber(raw); ok {
				vals = append(vals, v)
				aligned[i] = v
			}
		}
		ns := DescribeNumeric(vals, 0)
		p.Numeric = &ns
		if ctype != model.TypeIDLike {
			numericVals = aligned
		}
		p.SuggestedChart = "histogram"
	case model.TypeBoolean:
		bs := model.BooleanStats{}
		for _, r := range rows {
			var raw string
			if idx < len(r) {
				raw = r[idx]
			}
			lower := strings.ToLower(strings.TrimSpace(raw))
			if _, ok := boolTrue[lower]; ok {
				bs.True++
			} else if _, ok := boolFalse[lower]; ok {
				bs.False++
			}
		}
		p.Boolean = &bs
		p.SuggestedChart = "donut"
	case model.TypeDate, model.TypeDatetime:
		ds := dateStats(rows, idx)
		p.Date = &ds
		p.SuggestedChart = "line"
	default:
		cat := categoricalStats(rows, idx, nonMissing)
		p.Categorical = &cat
		if cat.Cardinality <= 2 {
			p.SuggestedChart = "donut"
		} else if cat.Cardinality <= 10 {
			p.SuggestedChart = "bar"
		} else {
			p.SuggestedChart = "bar"
		}
	}

	return p, numericVals
}

func categoricalStats(rows [][]string, idx, nonMissing int) model.CategoricalStats {
	counts := map[string]int{}
	var lenSum int
	minLen, maxLen := math.MaxInt32, 0
	lengths := 0
	for _, r := range rows {
		var raw string
		if idx < len(r) {
			raw = r[idx]
		}
		t := strings.TrimSpace(raw)
		if numutil.IsMissing(t) {
			continue
		}
		counts[t]++
		n := len([]rune(t))
		lenSum += n
		lengths++
		if n < minLen {
			minLen = n
		}
		if n > maxLen {
			maxLen = n
		}
	}
	if lengths == 0 {
		minLen = 0
	}

	type kv struct {
		k string
		v int
	}
	all := make([]kv, 0, len(counts))
	for k, v := range counts {
		all = append(all, kv{k, v})
	}
	sort.Slice(all, func(i, j int) bool {
		if all[i].v != all[j].v {
			return all[i].v > all[j].v
		}
		return all[i].k < all[j].k
	})
	top := make([]model.CategoryCount, 0, topCategories)
	for i, e := range all {
		if i >= topCategories {
			break
		}
		pct := 0.0
		if nonMissing > 0 {
			pct = round2(float64(e.v) / float64(nonMissing) * 100)
		}
		top = append(top, model.CategoryCount{Value: e.k, Count: e.v, Pct: pct})
	}
	avg := 0.0
	if lengths > 0 {
		avg = round2(float64(lenSum) / float64(lengths))
	}
	return model.CategoricalStats{
		Top:         top,
		Cardinality: len(counts),
		AvgLength:   avg,
		MinLength:   minLen,
		MaxLength:   maxLen,
	}
}

func dateStats(rows [][]string, idx int) model.DateStats {
	var dates []time.Time
	for _, r := range rows {
		var raw string
		if idx < len(r) {
			raw = r[idx]
		}
		if t, _, ok := ParseDate(raw); ok {
			dates = append(dates, t)
		}
	}
	var ds model.DateStats
	if len(dates) == 0 {
		return ds
	}
	sort.Slice(dates, func(i, j int) bool { return dates[i].Before(dates[j]) })
	minT, maxT := dates[0], dates[len(dates)-1]
	ds.Min = minT.Format(time.RFC3339)
	ds.Max = maxT.Format(time.RFC3339)
	ds.RangeDays = int(maxT.Sub(minT).Hours() / 24)
	ds.Frequency = InferFrequency(dates)

	byYear := map[string]int{}
	byMonth := map[string]int{}
	for _, d := range dates {
		byYear[fmt.Sprintf("%04d", d.Year())]++
		byMonth[d.Format("2006-01")]++
	}
	ds.ByYear = sortedBuckets(byYear)
	ds.ByMonth = sortedBuckets(byMonth)
	return ds
}

func sortedBuckets(m map[string]int) []model.TimeBucket {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := make([]model.TimeBucket, 0, len(keys))
	for _, k := range keys {
		out = append(out, model.TimeBucket{Period: k, Count: m[k]})
	}
	return out
}

func round2(v float64) float64 {
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return 0
	}
	return math.Round(v*100) / 100
}
