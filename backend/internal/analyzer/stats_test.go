package analyzer

import (
	"math"
	"testing"
)

func almostEqual(a, b, tol float64) bool { return math.Abs(a-b) <= tol }

func TestDescribeNumericKnownValues(t *testing.T) {
	vals := []float64{1, 2, 3, 4, 5}
	st := DescribeNumeric(vals, 0)

	cases := []struct {
		name string
		got  float64
		want float64
	}{
		{"min", st.Min, 1},
		{"max", st.Max, 5},
		{"sum", st.Sum, 15},
		{"mean", st.Mean, 3},
		{"median", st.Median, 3},
		{"mode", st.Mode, 1}, // all unique: first value wins
		{"q1", st.Q1, 2},
		{"q3", st.Q3, 4},
		{"iqr", st.IQR, 2},
		{"variance", st.Variance, 2.5}, // sample variance
		{"stddev", st.StdDev, math.Sqrt(2.5)},
		{"skewness", st.Skewness, 0},
		{"kurtosis", st.Kurtosis, -1.3},
	}
	for _, c := range cases {
		if !almostEqual(c.got, c.want, 1e-9) {
			t.Errorf("%s = %v, want %v", c.name, c.got, c.want)
		}
	}
}

func TestQuantileInterpolation(t *testing.T) {
	sorted := []float64{1, 2, 3, 4}
	if got := Quantile(sorted, 0.5); got != 2.5 {
		t.Errorf("median = %v, want 2.5", got)
	}
	if got := Quantile(sorted, 0.25); got != 1.75 {
		t.Errorf("q1 = %v, want 1.75", got)
	}
	if got := Quantile(sorted, 1); got != 4 {
		t.Errorf("max = %v, want 4", got)
	}
}

func TestModePicksMostFrequent(t *testing.T) {
	st := DescribeNumeric([]float64{1, 2, 2, 2, 3}, 0)
	if st.Mode != 2 {
		t.Errorf("mode = %v, want 2", st.Mode)
	}
}

func TestOutlierCountIQR(t *testing.T) {
	// 100 is far outside the IQR fence.
	st := DescribeNumeric([]float64{1, 2, 3, 4, 5, 6, 7, 8, 9, 100}, 0)
	if st.OutlierCount != 1 {
		t.Errorf("outlier count = %d, want 1", st.OutlierCount)
	}
}

func TestHistogramCountsAllValues(t *testing.T) {
	vals := []float64{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
	h := Histogram(vals, 5)
	total := 0
	for _, b := range h {
		total += b.Count
	}
	if total != len(vals) {
		t.Errorf("histogram total = %d, want %d", total, len(vals))
	}
	if len(h) != 5 {
		t.Errorf("bins = %d, want 5", len(h))
	}
}

func TestHistogramSingleValue(t *testing.T) {
	h := Histogram([]float64{4, 4, 4}, 0)
	if len(h) != 1 || h[0].Count != 3 {
		t.Errorf("single-value histogram = %+v, want one bin with count 3", h)
	}
}
