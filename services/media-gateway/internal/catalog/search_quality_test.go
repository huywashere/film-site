package catalog

import (
	"strings"
	"testing"
)

// This corpus expands to more than one hundred real-world query spellings.
// Every spelling must resolve to the same canonical card and the merged result
// must retain both playback sources without duplicate cards.
func TestSearchQualityCorpusHasAccurateDuplicateFreeTopResults(t *testing.T) {
	groups := make(map[string][]map[string]any)
	expectedByQuery := make(map[string]string)
	queryCount := 0
	for index, aliases := range searchSynonymGroups {
		name := aliases[0]
		year := 1980 + index
		slug := strings.ReplaceAll(name, " ", "-")
		for _, source := range []string{"kkphim", "ophim"} {
			groups[source] = append(groups[source], map[string]any{
				"name": name, "origin_name": name, "slug": slug, "year": year, "type": "single",
			})
		}
		for _, alias := range aliases {
			for _, query := range []string{
				alias,
				strings.ToUpper(alias),
				strings.ReplaceAll(alias, " ", ""),
				strings.ReplaceAll(alias, " ", "-"),
			} {
				expectedByQuery[query] = name
				queryCount++
			}
		}
	}
	if queryCount < 100 {
		t.Fatalf("quality corpus is too small: %d queries", queryCount)
	}

	items := dedupeGroups(groups, 0)
	if len(items) != len(searchSynonymGroups) {
		t.Fatalf("expected one card per canonical movie, got %d for %d groups", len(items), len(searchSynonymGroups))
	}
	for _, item := range items {
		if numberValue(item["_duplicateCount"]) != 2 {
			t.Fatalf("merged card lost playback alternatives: %#v", item)
		}
	}

	for query, expected := range expectedByQuery {
		ranked := rankSearch(items, query)
		if len(ranked) == 0 || firstString(ranked[0]["name"]) != expected {
			t.Fatalf("query %q expected %q at rank 1, got %#v", query, expected, ranked)
		}
	}
}

func TestSearchSeasonAliasesAreEquivalent(t *testing.T) {
	items := []map[string]any{{
		"name": "Silo Season 2", "origin_name": "Silo Season 2", "slug": "silo-season-2",
		"year": 2024, "type": "series", "_canonicalKey": "film:series:silo season 2:2024",
	}}
	for _, query := range []string{"silo season 2", "silo phần 2", "silo phan 2", "silo s2", "silos2"} {
		ranked := rankSearch(items, query)
		if len(ranked) != 1 || firstString(ranked[0]["slug"]) != "silo-season-2" {
			t.Fatalf("season alias %q did not resolve: %#v", query, ranked)
		}
	}
}

func BenchmarkSearchQualityCorpus(b *testing.B) {
	items := make([]map[string]any, 0, len(searchSynonymGroups))
	for index, aliases := range searchSynonymGroups {
		items = append(items, map[string]any{
			"name": aliases[0], "origin_name": aliases[0], "slug": strings.ReplaceAll(aliases[0], " ", "-"),
			"year": 1980 + index, "type": "single",
		})
	}
	b.ResetTimer()
	for index := 0; index < b.N; index++ {
		_ = rankSearch(items, searchSynonymGroups[index%len(searchSynonymGroups)][0])
	}
}
