package analyzer

import (
	"math"
	"sort"

	"github.com/thbappy7706/autosheet-analyzer/backend/internal/model"
)

// DescribeNumeric computes descriptive statistics for a slice of values.
// Quantiles use linear interpolation (the R type-7 / NumPy default method).
func DescribeNumeric(vals []float64, bins int) model.NumericStats {
	var st model.NumericStats
	if len(vals) == 0 {
		return st
	}
	sorted := append([]float64(nil), vals...)
	sort.Float64s(sorted)

	n := len(sorted)
	st.Min = sorted[0]
	st.Max = sorted[n-1]
	var sum float64
	for _, v := range sorted {
		sum += v
	}
	st.Sum = sum
	st.Mean = sum / float64(n)
	st.Median = Quantile(sorted, 0.5)
	st.Q1 = Quantile(sorted, 0.25)
	st.Q3 = Quantile(sorted, 0.75)
	st.IQR = st.Q3 - st.Q1
	st.Mode = Mode(sorted)

	// Variance / standard deviation: sample when n > 1, population otherwise.
	var ss float64
	for _, v := range sorted {
		d := v - st.Mean
		ss += d * d
	}
	if n > 1 {
		st.Variance = ss / float64(n-1)
	} else {
		st.Variance = 0
	}
	st.StdDev = math.Sqrt(st.Variance)

	// Skewness and excess kurtosis use population moments (matching NumPy /
	// SciPy defaults), so the population standard deviation is used here
	// rather than the sample one reported above.
	popStd := math.Sqrt(ss / float64(n))
	if popStd > 0 {
		var m3, m4 float64
		for _, v := range sorted {
			z := (v - st.Mean) / popStd
			m3 += z * z * z
			m4 += z * z * z * z
		}
		st.Skewness = m3 / float64(n)
		st.Kurtosis = m4/float64(n) - 3
	}

	st.OutlierCount = countOutliers(sorted, st.Q1, st.Q3, st.IQR)
	st.Histogram = Histogram(sorted, bins)
	return st
}

// Quantile returns the interpolated quantile q in [0,1] for a sorted slice.
func Quantile(sorted []float64, q float64) float64 {
	n := len(sorted)
	if n == 0 {
		return 0
	}
	if n == 1 {
		return sorted[0]
	}
	pos := q * float64(n-1)
	lo := int(math.Floor(pos))
	hi := int(math.Ceil(pos))
	if lo == hi {
		return sorted[lo]
	}
	frac := pos - float64(lo)
	return sorted[lo]*(1-frac) + sorted[hi]*frac
}

// Mode returns the most frequent value (the smallest one on ties).
func Mode(sorted []float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	best, bestCount := sorted[0], 0
	cur, curCount := sorted[0], 0
	for _, v := range sorted {
		if v == cur {
			curCount++
		} else {
			if curCount > bestCount {
				best, bestCount = cur, curCount
			}
			cur, curCount = v, 1
		}
	}
	if curCount > bestCount {
		return cur
	}
	return best
}

func countOutliers(sorted []float64, q1, q3, iqr float64) int {
	low := q1 - 1.5*iqr
	high := q3 + 1.5*iqr
	count := 0
	for _, v := range sorted {
		if v < low || v > high {
			count++
		}
	}
	return count
}

// Histogram bins the sorted values. When bins <= 0, Sturges' rule is used and
// clamped to [1, 50].
func Histogram(sorted []float64, bins int) []model.HistogramBin {
	n := len(sorted)
	if n == 0 {
		return nil
	}
	min, max := sorted[0], sorted[n-1]
	if min == max {
		return []model.HistogramBin{{From: min, To: max, Count: n}}
	}
	if bins <= 0 {
		bins = int(math.Ceil(math.Log2(float64(n)))) + 1
	}
	if bins < 1 {
		bins = 1
	}
	if bins > 50 {
		bins = 50
	}
	width := (max - min) / float64(bins)
	out := make([]model.HistogramBin, bins)
	for i := 0; i < bins; i++ {
		out[i].From = min + float64(i)*width
		out[i].To = min + float64(i+1)*width
	}
	for _, v := range sorted {
		idx := int((v - min) / width)
		if idx >= bins {
			idx = bins - 1
		}
		out[idx].Count++
	}
	return out
}

// MeanStdDev returns the mean and sample standard deviation of vals.
func MeanStdDev(vals []float64) (float64, float64) {
	n := len(vals)
	if n == 0 {
		return 0, 0
	}
	var sum float64
	for _, v := range vals {
		sum += v
	}
	mean := sum / float64(n)
	if n < 2 {
		return mean, 0
	}
	var ss float64
	for _, v := range vals {
		d := v - mean
		ss += d * d
	}
	return mean, math.Sqrt(ss / float64(n-1))
}
