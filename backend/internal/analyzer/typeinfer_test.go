package analyzer

import (
	"testing"

	"github.com/example/excel-analyzer/internal/model"
)

func col(values ...string) [][]string {
	rows := make([][]string, len(values))
	for i, v := range values {
		rows[i] = []string{v}
	}
	return rows
}

func TestInferType(t *testing.T) {
	cases := []struct {
		name    string
		header  string
		values  []string
		want    model.ColumnType
		mixed   bool
	}{
		{"integers", "age", []string{"1", "2", "3", "40"}, model.TypeInteger, false},
		{"floats", "price", []string{"1.5", "2.25", "3"}, model.TypeFloat, false},
		{"currency", "amount", []string{"$1,200.50", "$2,000", "$3,000"}, model.TypeFloat, false},
		{"percent", "rate", []string{"12%", "50%", "99%"}, model.TypeFloat, false},
		{"booleans", "active", []string{"true", "false", "yes", "no"}, model.TypeBoolean, false},
		{"dates", "joined", []string{"2024-01-05", "2024-02-10", "2023-12-01"}, model.TypeDate, false},
		{"datetimes", "ts", []string{"2024-01-05 10:00:00", "2024-02-10 11:30:00"}, model.TypeDatetime, false},
		{"bangla digits", "সংখ্যা", []string{"১২৩", "৪৫৬", "৭৮৯"}, model.TypeInteger, false},
		{"bangla booleans", "সক্রিয়", []string{"হ্যাঁ", "না", "হ্যাঁ"}, model.TypeBoolean, false},
		{"bangla date", "তারিখ", []string{"৫ জানুয়ারি ২০২৪", "৬ ফেব্রুয়ারি ২০২৪"}, model.TypeDate, false},
		{"constant", "country", []string{"BD", "BD", "BD"}, model.TypeConstant, false},
		{"categorical", "city", []string{"Dhaka", "Dhaka", "Dhaka", "Chittagong"}, model.TypeCategorical, false},
		{"id-like", "user_id", []string{"1001", "1002", "1003", "1004"}, model.TypeIDLike, false},
		{"missing markers", "note", []string{"N/A", "null", "-", "NA"}, model.TypeConstant, false},
		{"mixed numeric", "score", []string{"1", "2", "3", "4", "5", "6", "7", "8", "9", "abc"}, model.TypeFloat, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, _, mixed := InferType(c.header, col(c.values...), 0)
			if got != c.want {
				t.Errorf("type = %q, want %q", got, c.want)
			}
			if mixed != c.mixed {
				t.Errorf("mixed = %v, want %v", mixed, c.mixed)
			}
		})
	}
}

func TestInferTypeAllMissingIsConstant(t *testing.T) {
	got, sample, _ := InferType("x", col("", "N/A", "null"), 0)
	if got != model.TypeConstant {
		t.Errorf("type = %q, want constant", got)
	}
	if sample.missing != 3 {
		t.Errorf("missing = %d, want 3", sample.missing)
	}
}

func TestPerColumnIndexing(t *testing.T) {
	rows := [][]string{
		{"1", "a"},
		{"2", "b"},
		{"3", "c"},
	}
	if got, _, _ := InferType("n", rows, 0); got != model.TypeInteger {
		t.Errorf("col 0 type = %q, want integer", got)
	}
	if got, _, _ := InferType("s", rows, 1); got != model.TypeText {
		t.Errorf("col 1 type = %q, want text", got)
	}
}
