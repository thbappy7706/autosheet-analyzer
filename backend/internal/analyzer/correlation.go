package analyzer

import (
	"math"
	"sort"

	"github.com/example/excel-analyzer/internal/model"
)

// Pearson returns the Pearson correlation coefficient between x and y.
// Pairs where either value is NaN are skipped. Returns 0 when there is not
// enough variance to correlate.
func Pearson(x, y []float64) float64 {
	n := len(x)
	if len(y) < n {
		n = len(y)
	}
	var sx, sy float64
	count := 0
	for i := 0; i < n; i++ {
		if math.IsNaN(x[i]) || math.IsNaN(y[i]) {
			continue
		}
		sx += x[i]
		sy += y[i]
		count++
	}
	if count < 2 {
		return 0
	}
	mx := sx / float64(count)
	my := sy / float64(count)

	var num, dx2, dy2 float64
	for i := 0; i < n; i++ {
		if math.IsNaN(x[i]) || math.IsNaN(y[i]) {
			continue
		}
		dx := x[i] - mx
		dy := y[i] - my
		num += dx * dy
		dx2 += dx * dx
		dy2 += dy * dy
	}
	den := math.Sqrt(dx2 * dy2)
	if den == 0 {
		return 0
	}
	return num / den
}

// CorrelationMatrix computes the correlation matrix for the named numeric
// columns and extracts the strongest positive and negative pairs.
func CorrelationMatrix(names []string, cols [][]float64) model.Correlation {
	k := len(names)
	c := model.Correlation{Columns: names}
	if k == 0 {
		return c
	}
	matrix := make([][]float64, k)
	for i := range matrix {
		matrix[i] = make([]float64, k)
		matrix[i][i] = 1
	}
	for i := 0; i < k; i++ {
		for j := i + 1; j < k; j++ {
			r := Pearson(cols[i], cols[j])
			matrix[i][j] = r
			matrix[j][i] = r
		}
	}
	c.Matrix = matrix

	var pairs []model.CorrelationPair
	for i := 0; i < k; i++ {
		for j := i + 1; j < k; j++ {
			pairs = append(pairs, model.CorrelationPair{
				A: names[i], B: names[j], R: matrix[i][j],
			})
		}
	}
	sort.Slice(pairs, func(a, b int) bool { return pairs[a].R > pairs[b].R })
	c.TopPositive = topN(pairs, 5, func(p model.CorrelationPair) bool { return p.R > 0 })
	neg := append([]model.CorrelationPair(nil), pairs...)
	sort.Slice(neg, func(a, b int) bool { return neg[a].R < neg[b].R })
	c.TopNegative = topN(neg, 5, func(p model.CorrelationPair) bool { return p.R < 0 })

	for _, p := range pairs {
		if math.Abs(p.R) > 0.8 {
			c.HighPairs = append(c.HighPairs, p)
		}
	}
	sort.Slice(c.HighPairs, func(a, b int) bool {
		return math.Abs(c.HighPairs[a].R) > math.Abs(c.HighPairs[b].R)
	})
	return c
}

func topN(pairs []model.CorrelationPair, n int, keep func(model.CorrelationPair) bool) []model.CorrelationPair {
	out := make([]model.CorrelationPair, 0, n)
	for _, p := range pairs {
		if !keep(p) {
			break
		}
		out = append(out, p)
		if len(out) == n {
			break
		}
	}
	return out
}

