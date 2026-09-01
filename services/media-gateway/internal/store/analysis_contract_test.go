package store

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func contractFixture(t *testing.T, name string) []byte {
	t.Helper()
	path := filepath.Join("..", "..", "..", "..", "packages", "shared-types", "contracts", "fixtures", name)
	value, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read shared contract fixture: %v", err)
	}
	return value
}

func TestAnalysisJobSharedContract(t *testing.T) {
	var job AnalysisJob
	if err := json.Unmarshal(contractFixture(t, "hls-analysis-job-v1.json"), &job); err != nil {
		t.Fatalf("Go cannot decode shared job contract: %v", err)
	}
	if job.SchemaVersion != 1 || job.JobID == "" || job.URL == "" || job.TraceID == "" {
		t.Fatalf("decoded job lost required fields: %#v", job)
	}
}

func TestAnalysisResultSharedContract(t *testing.T) {
	var result AnalysisResult
	if err := json.Unmarshal(contractFixture(t, "hls-analysis-result-v1.json"), &result); err != nil {
		t.Fatalf("Go cannot decode shared result contract: %v", err)
	}
	if result.SchemaVersion != 1 || !result.Playable || result.HealthScore != 100 || result.TraceID == "" {
		t.Fatalf("decoded result lost required fields: %#v", result)
	}
}
