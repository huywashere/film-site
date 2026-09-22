package catalog

import (
	"regexp"
	"sort"
	"strings"
)

var normalizedSeasonSuffix = regexp.MustCompile(`\b(?:phan|season|mua|s)\s*(\d+)\b`)

// High-value aliases supplement the Vietnamese/original titles supplied by
// providers. Keep the index generic first; this map only covers names users
// commonly type differently from provider metadata.
var searchSynonymGroups = [][]string{
	{"spider man", "spiderman", "nguoi nhen"},
	{"avengers", "avenger", "biet doi sieu anh hung"},
	{"batman", "nguoi doi", "ky si bong dem"},
	{"superman", "man of steel", "nguoi dan ong thep"},
	{"doraemon", "chu meo may doraemon"},
	{"detective conan", "conan", "tham tu lung danh conan"},
	{"one piece", "dao hai tac", "vua hai tac"},
	{"demon slayer", "kimetsu no yaiba", "thanh guom diet quy"},
	{"jujutsu kaisen", "chu thuat hoi chien"},
	{"attack on titan", "shingeki no kyojin", "dai chien titan"},
	{"dragon ball", "bay vien ngoc rong"},
	{"the godfather", "godfather", "bo gia"},
	{"interstellar", "ho den tu than"},
	{"inception", "ke cap giac mo"},
	{"dune", "hanh tinh cat"},
	{"fast and furious", "qua nhanh qua nguy hiem"},
	{"mission impossible", "nhiem vu bat kha thi"},
	{"transformers", "transformer", "robot dai chien"},
	{"lord of the rings", "chua te nhung chiec nhan"},
	{"game of thrones", "tro choi vuong quyen"},
	{"money heist", "la casa de papel", "phi vu trieu do"},
	{"squid game", "tro choi con muc"},
}

func compactSearchText(value string) string {
	return strings.ReplaceAll(normalizeText(value), " ", "")
}

func queryAliases(value string) []string {
	normalized := normalizeText(value)
	if normalized == "" {
		return nil
	}
	aliases := map[string]bool{normalized: true, compactSearchText(normalized): true}
	for _, group := range searchSynonymGroups {
		matched := false
		for _, entry := range group {
			entry = normalizeText(entry)
			if normalized == entry || compactSearchText(normalized) == compactSearchText(entry) {
				matched = true
				break
			}
		}
		if matched {
			for _, entry := range group {
				entry = normalizeText(entry)
				aliases[entry] = true
				aliases[compactSearchText(entry)] = true
			}
		}
	}
	result := make([]string, 0, len(aliases))
	for alias := range aliases {
		if alias != "" {
			result = append(result, alias)
		}
	}
	sort.Strings(result)
	return result
}

func movieSearchAliases(movie map[string]any) []string {
	raw := []string{
		firstString(movie["name"], movie["title"]),
		firstString(movie["origin_name"], movie["original_name"]),
		strings.ReplaceAll(firstString(movie["slug"]), "-", " "),
	}
	aliases := make(map[string]bool)
	for _, value := range raw {
		normalized := normalizeText(value)
		if normalized == "" {
			continue
		}
		aliases[normalized] = true
		aliases[compactSearchText(normalized)] = true

		// Make phan 2, season 2 and s2 interchangeable without removing the
		// season number from the canonical movie identity.
		if match := normalizedSeasonSuffix.FindStringSubmatch(normalized); len(match) == 2 {
			base := strings.TrimSpace(normalizedSeasonSuffix.ReplaceAllString(normalized, ""))
			for _, suffix := range []string{"season " + match[1], "phan " + match[1], "s" + match[1]} {
				alias := strings.TrimSpace(base + " " + suffix)
				aliases[alias] = true
				aliases[compactSearchText(alias)] = true
			}
		}
	}

	for _, group := range searchSynonymGroups {
		matched := false
		for _, entry := range group {
			entry = normalizeText(entry)
			for existing := range aliases {
				if existing == entry || existing == compactSearchText(entry) || strings.Contains(existing, entry) {
					matched = true
					break
				}
			}
			if matched {
				break
			}
		}
		if matched {
			for _, entry := range group {
				entry = normalizeText(entry)
				aliases[entry] = true
				aliases[compactSearchText(entry)] = true
			}
		}
	}

	result := make([]string, 0, len(aliases))
	for alias := range aliases {
		if alias != "" {
			result = append(result, alias)
		}
	}
	sort.Strings(result)
	return result
}

func meiliSynonyms() map[string][]string {
	result := make(map[string][]string)
	for _, group := range searchSynonymGroups {
		normalized := make([]string, 0, len(group))
		for _, value := range group {
			if value = normalizeText(value); value != "" {
				normalized = append(normalized, value)
			}
		}
		for _, key := range normalized {
			values := make([]string, 0, len(normalized)-1)
			for _, value := range normalized {
				if value != key {
					values = append(values, value)
				}
			}
			result[key] = values
		}
	}
	return result
}
