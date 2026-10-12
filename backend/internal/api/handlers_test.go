package api

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
	"time"

	"github.com/thbappy7706/autosheet-analyzer/backend/internal/model"
)

func newTestServer() http.Handler {
	return NewServer(Config{
		MaxUploadBytes: 10 << 20,
		CORSOrigin:     "*",
		StoreTTL:       time.Hour,
		MaxRows:        200000,
		RateLimit:      0,
	}).Routes()
}

func uploadCSV(t *testing.T, h http.Handler, name, content string) model.Upload {
	t.Helper()
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	fw, err := mw.CreateFormFile("file", name)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fw.Write([]byte(content)); err != nil {
		t.Fatal(err)
	}
	mw.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/uploads", &body)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("upload status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var up model.Upload
	if err := json.Unmarshal(rec.Body.Bytes(), &up); err != nil {
		t.Fatal(err)
	}
	return up
}

const sampleCSV = "id,name,age,score,joined,active\n" +
	"1,Alice,30,88.5,2024-01-05,true\n" +
	"2,Bob,25,92.0,2024-02-10,false\n" +
	"3,Carol,41,75.25,2023-12-01,true\n" +
	"4,Dave,35,60.0,2024-03-15,true\n" +
	"5,Erin,29,99.9,2024-04-20,false\n"

func TestHealth(t *testing.T) {
	h := newTestServer()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
}

func TestUploadAnalysisRowsFlow(t *testing.T) {
	h := newTestServer()
	up := uploadCSV(t, h, "people.csv", sampleCSV)
	if up.ID == "" {
		t.Fatal("upload id is empty")
	}
	if len(up.Sheets) != 1 || up.Sheets[0] != "Sheet1" {
		t.Fatalf("sheets = %v", up.Sheets)
	}

	// Analysis.
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/uploads/"+up.ID+"/analysis", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("analysis status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var analysis model.Analysis
	if err := json.Unmarshal(rec.Body.Bytes(), &analysis); err != nil {
		t.Fatal(err)
	}
	if analysis.Overview.Rows != 5 || analysis.Overview.Columns != 6 {
		t.Errorf("overview = %+v", analysis.Overview)
	}
	types := map[string]model.ColumnType{}
	for _, c := range analysis.Columns {
		types[c.Name] = c.Type
	}
	if types["age"] != model.TypeInteger {
		t.Errorf("age type = %q", types["age"])
	}
	if types["score"] != model.TypeFloat {
		t.Errorf("score type = %q", types["score"])
	}
	if types["active"] != model.TypeBoolean {
		t.Errorf("active type = %q", types["active"])
	}
	if types["joined"] != model.TypeDate {
		t.Errorf("joined type = %q", types["joined"])
	}
	if len(analysis.Correlation.Columns) < 2 {
		t.Errorf("expected correlation columns, got %v", analysis.Correlation.Columns)
	}

	// Rows with pagination + sort.
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet,
		"/api/v1/uploads/"+up.ID+"/rows?page=1&pageSize=2&sort=age&order=desc", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("rows status = %d", rec.Code)
	}
	var rows struct {
		Rows       [][]string `json:"rows"`
		Total      int        `json:"total"`
		TotalPages int        `json:"totalPages"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &rows); err != nil {
		t.Fatal(err)
	}
	if rows.Total != 5 || rows.TotalPages != 3 || len(rows.Rows) != 2 {
		t.Fatalf("rows response = %+v", rows)
	}
	if rows.Rows[0][2] != "41" {
		t.Errorf("first sorted row = %v, want age 41", rows.Rows[0])
	}

	// Aggregate.
	aggBody := `{"x":"name","y":"score","agg":"avg"}`
	rec = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/uploads/"+up.ID+"/aggregate", bytes.NewBufferString(aggBody))
	req.Header.Set("Content-Type", "application/json")
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("aggregate status = %d, body = %s", rec.Code, rec.Body.String())
	}

	// Delete.
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodDelete, "/api/v1/uploads/"+up.ID, nil))
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete status = %d", rec.Code)
	}
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/uploads/"+up.ID, nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 after delete, got %d", rec.Code)
	}
}

// Sorting must not depend on whether the client requested the analysis first:
// the column type is inferred on demand when the cache is cold.
func TestRowsSortNumericWithoutPriorAnalysis(t *testing.T) {
	h := newTestServer()
	up := uploadCSV(t, h, "nums.csv", "name,n\nb,2\na,10\nc,9\n")

	get := func(query string) []string {
		t.Helper()
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/uploads/"+up.ID+"/rows?"+query, nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
		}
		var page struct {
			Rows [][]string `json:"rows"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &page); err != nil {
			t.Fatal(err)
		}
		out := make([]string, 0, len(page.Rows))
		for _, r := range page.Rows {
			out = append(out, r[1])
		}
		return out
	}

	// No /analysis call before the first sort, so the cache is cold here.
	if got := get("sort=n&order=asc"); !reflect.DeepEqual(got, []string{"2", "9", "10"}) {
		t.Errorf("cold asc sort = %v, want [2 9 10]", got)
	}
	if got := get("sort=n&order=desc"); !reflect.DeepEqual(got, []string{"10", "9", "2"}) {
		t.Errorf("cold desc sort = %v, want [10 9 2]", got)
	}
}

// Non-ISO dates must sort chronologically rather than lexically.
func TestRowsSortDatesChronologically(t *testing.T) {
	h := newTestServer()
	up := uploadCSV(t, h, "dates.csv", "label,d\nlate,5 Jan 2024\nearly,2 Jan 2024\nmid,20 Mar 2024\n")

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/uploads/"+up.ID+"/rows?sort=d&order=asc", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	var page struct {
		Rows [][]string `json:"rows"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &page); err != nil {
		t.Fatal(err)
	}
	labels := make([]string, 0, len(page.Rows))
	for _, r := range page.Rows {
		labels = append(labels, r[0])
	}
	if !reflect.DeepEqual(labels, []string{"early", "late", "mid"}) {
		t.Errorf("date sort = %v, want [early late mid]", labels)
	}
}

func TestUploadRejectsMissingFile(t *testing.T) {
	h := newTestServer()
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	mw.Close()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/uploads", &body)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
	var env struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &env); err != nil {
		t.Fatal(err)
	}
	if env.Error.Code != string(CodeMissingFile) {
		t.Errorf("code = %q, want %q", env.Error.Code, CodeMissingFile)
	}
}

func TestUploadRejectsWrongContent(t *testing.T) {
	h := newTestServer()
	// A zip-looking body with a .csv extension must be rejected.
	body := append([]byte{0x50, 0x4B, 0x03, 0x04}, []byte("not really a csv")...)
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, _ := mw.CreateFormFile("file", "fake.csv")
	fw.Write(body)
	mw.Close()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/uploads", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("status = %d, want 415", rec.Code)
	}
}

func TestUploadRejectsUnknownExtension(t *testing.T) {
	h := newTestServer()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, _ := mw.CreateFormFile("file", "malware.exe")
	fw.Write([]byte("MZ"))
	mw.Close()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/uploads", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("status = %d, want 415", rec.Code)
	}
}

func TestAnalysisUnknownUpload(t *testing.T) {
	h := newTestServer()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/uploads/deadbeef/analysis", nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}
