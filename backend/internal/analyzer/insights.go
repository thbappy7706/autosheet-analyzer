package analyzer

import "github.com/example/excel-analyzer/internal/model"

// Severity levels for insights.
const (
	SeverityInfo    = "info"
	SeverityWarning = "warning"
)

// BuildInsights runs the rule engine over the profiles and returns
// machine-readable findings. The frontend localizes them via Insight.Code.
func BuildInsights(ov model.Overview, profiles []model.ColumnProfile, corr model.Correlation, headers []string) []model.Insight {
	insights := make([]model.Insight, 0, 24)

	if ov.DuplicateRows > 0 {
		insights = append(insights, model.Insight{
			Code:     "DUPLICATE_ROWS",
			Severity: SeverityWarning,
			Params: map[string]any{
				"count":   ov.DuplicateRows,
				"percent": round2(float64(ov.DuplicateRows) / float64(max(1, ov.Rows)) * 100),
			},
		})
	}
	if ov.EmptyColumns > 0 {
		insights = append(insights, model.Insight{
			Code:     "EMPTY_COLUMNS",
			Severity: SeverityWarning,
			Params:   map[string]any{"count": ov.EmptyColumns},
		})
	}
	if ov.Sampled {
		insights = append(insights, model.Insight{
			Code:     "SAMPLED",
			Severity: SeverityInfo,
			Params:   map[string]any{"analyzedRows": ov.AnalyzedRows, "rows": ov.Rows},
		})
	}

	numericCount := 0
	for _, p := range profiles {
		switch p.Type {
		case model.TypeInteger, model.TypeFloat:
			numericCount++
		}
	}

	for _, p := range profiles {
		if p.MissingPct > 30 {
			insights = append(insights, model.Insight{
				Code:     "HIGH_MISSING",
				Severity: SeverityWarning,
				Column:   p.Name,
				Params:   map[string]any{"column": p.Name, "percent": p.MissingPct},
			})
		}
		if p.IsConstant {
			insights = append(insights, model.Insight{
				Code:     "CONSTANT_COLUMN",
				Severity: SeverityInfo,
				Column:   p.Name,
				Params:   map[string]any{"column": p.Name},
			})
		} else if p.Unique == 2 && p.UniquePct < 80 {
			insights = append(insights, model.Insight{
				Code:     "NEAR_CONSTANT",
				Severity: SeverityInfo,
				Column:   p.Name,
				Params:   map[string]any{"column": p.Name, "unique": p.Unique},
			})
		}
		if p.Type == model.TypeIDLike {
			insights = append(insights, model.Insight{
				Code:     "LIKELY_ID",
				Severity: SeverityInfo,
				Column:   p.Name,
				Params:   map[string]any{"column": p.Name},
			})
		}
		if p.MixedTypes {
			insights = append(insights, model.Insight{
				Code:     "MIXED_TYPES",
				Severity: SeverityWarning,
				Column:   p.Name,
				Params:   map[string]any{"column": p.Name},
			})
		}
		if p.Categorical != nil && p.Categorical.Cardinality > 50 && p.UniquePct > 80 {
			insights = append(insights, model.Insight{
				Code:     "HIGH_CARDINALITY",
				Severity: SeverityInfo,
				Column:   p.Name,
				Params:   map[string]any{"column": p.Name, "unique": p.Categorical.Cardinality},
			})
		}
		if p.Numeric != nil {
			if p.Numeric.Skewness > 1 || p.Numeric.Skewness < -1 {
				insights = append(insights, model.Insight{
					Code:     "HEAVY_SKEW",
					Severity: SeverityInfo,
					Column:   p.Name,
					Params:   map[string]any{"column": p.Name, "skewness": round2(p.Numeric.Skewness)},
				})
			}
			if p.Numeric.OutlierCount > 0 {
				if pct := outlierPercent(p.Numeric); pct >= 1 {
					insights = append(insights, model.Insight{
						Code:     "OUTLIERS",
						Severity: SeverityInfo,
						Column:   p.Name,
						Params: map[string]any{
							"column":  p.Name,
							"count":   p.Numeric.OutlierCount,
							"percent": pct,
						},
					})
				}
			}
		}
	}

	if numericCount < 2 {
		insights = append(insights, model.Insight{
			Code:     "FEW_NUMERIC",
			Severity: SeverityInfo,
			Params:   map[string]any{"count": numericCount},
		})
	}

	for i, hp := range corr.HighPairs {
		if i >= 3 {
			break
		}
		insights = append(insights, model.Insight{
			Code:     "HIGH_CORRELATION",
			Severity: SeverityInfo,
			Params: map[string]any{
				"a": hp.A, "b": hp.B, "r": round2(hp.R),
			},
		})
	}

	return insights
}

func outlierPercent(ns *model.NumericStats) float64 {
	total := 0
	for _, b := range ns.Histogram {
		total += b.Count
	}
	if total == 0 {
		return 0
	}
	return round2(float64(ns.OutlierCount) / float64(total) * 100)
}
