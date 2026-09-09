package catalog

import (
	"fmt"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

var nonAlphaNumeric = regexp.MustCompile(`[^a-z0-9]+`)

var sourcePriority = map[string]int{
	"kkphim": 0,
	"ophim":  1,
	"nguonc": 2,
	"vsmov":  3,
	"vicdn":  4,
}

func normalizeText(value string) string {
	value = strings.ReplaceAll(strings.ReplaceAll(value, "đ", "d"), "Đ", "D")
	decomposed := norm.NFD.String(value)
	var builder strings.Builder
	for _, character := range decomposed {
		if unicode.Is(unicode.Mn, character) {
			continue
		}
		builder.WriteRune(unicode.ToLower(character))
	}
	return strings.Trim(nonAlphaNumeric.ReplaceAllString(builder.String(), " "), " ")
}

func slugify(value string) string {
	return strings.ReplaceAll(normalizeText(value), " ", "-")
}

func normalizePayload(source string, payload map[string]any) map[string]any {
	var normalized map[string]any
	switch source {
	case "nguonc":
		normalized = normalizeNguonC(payload)
	case "vicdn":
		normalized = normalizeViCDN(payload)
	case "vsmov":
		normalized = normalizeVSMov(payload)
	default:
		normalized = tagPayload(source, payload)
	}
	normalizeArtworkPayload(source, normalized)
	return normalized
}

func normalizeArtworkPayload(source string, payload map[string]any) {
	base := artworkBase(payload)
	if movie := movieFromPayload(payload); movie != nil {
		normalizeArtwork(source, movie, base)
	}
	for _, movie := range extractItems(payload) {
		normalizeArtwork(source, movie, base)
	}
}

func artworkBase(payload map[string]any) string {
	for _, record := range []map[string]any{payload, mapValue(payload["data"])} {
		if record == nil {
			continue
		}
		if value := firstString(record["APP_DOMAIN_CDN_IMAGE"], record["pathImage"], record["path_image"]); value != "" {
			return value
		}
	}
	return ""
}

func mapValue(value any) map[string]any {
	record, _ := value.(map[string]any)
	return record
}

func normalizeArtwork(source string, movie map[string]any, base string) {
	for _, key := range []string{"poster_url", "thumb_url"} {
		if value := absoluteArtworkURL(source, firstString(movie[key]), base); value != "" {
			movie[key] = value
		}
	}
	if poster := firstString(movie["poster_url"]); poster != "" {
		movie["_posterCandidates"] = []any{poster}
	}
	if thumb := firstString(movie["thumb_url"]); thumb != "" {
		movie["_thumbCandidates"] = []any{thumb}
	}
}

func absoluteArtworkURL(source, value, base string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if strings.HasPrefix(value, "//") {
		return "https:" + value
	}
	if parsed, err := url.Parse(value); err == nil && parsed.IsAbs() {
		if parsed.Scheme == "http" {
			parsed.Scheme = "https"
		}
		return parsed.String()
	}
	if base == "" {
		switch source {
		case "kkphim":
			base = "https://phimimg.com"
		case "ophim":
			base = "https://img.ophim.live/uploads/movies"
		default:
			return value
		}
	}
	return strings.TrimRight(base, "/") + "/" + strings.TrimLeft(value, "/")
}

func tagPayload(source string, payload map[string]any) map[string]any {
	if movie := movieFromPayload(payload); movie != nil {
		movie["_source"] = source
		movie["_sourceName"] = source
	}
	return payload
}

func normalizeNguonC(payload map[string]any) map[string]any {
	if rawItems, ok := payload["items"].([]any); ok {
		items := make([]any, 0, len(rawItems))
		for _, raw := range rawItems {
			if item, ok := raw.(map[string]any); ok {
				items = append(items, normalizeNguonCMovie(item))
			}
		}
		payload["items"] = items
		return payload
	}
	movie, ok := payload["movie"].(map[string]any)
	if !ok {
		return payload
	}
	episodes := normalizeNguonCEpisodes(movie["episodes"])
	delete(movie, "episodes")
	return map[string]any{
		"status":   payload["status"],
		"movie":    normalizeNguonCMovie(movie),
		"episodes": episodes,
	}
}

func normalizeNguonCMovie(movie map[string]any) map[string]any {
	if empty(movie["origin_name"]) {
		movie["origin_name"] = movie["original_name"]
	}
	if empty(movie["episode_current"]) {
		movie["episode_current"] = movie["current_episode"]
	}
	if empty(movie["lang"]) {
		movie["lang"] = movie["language"]
	}
	if cast, ok := movie["casts"].(string); ok {
		movie["actor"] = splitNames(cast)
	}
	if director, ok := movie["director"].(string); ok {
		movie["director"] = splitNames(director)
	}
	movie["category"] = normalizeNamedList(movie["category"])
	movie["_source"] = "nguonc"
	movie["_sourceName"] = "NguonC"
	return movie
}

func normalizeNguonCEpisodes(raw any) []any {
	servers, _ := raw.([]any)
	result := make([]any, 0, len(servers))
	for _, entry := range servers {
		server, ok := entry.(map[string]any)
		if !ok {
			continue
		}
		items, _ := server["items"].([]any)
		if len(items) == 0 {
			items, _ = server["server_data"].([]any)
		}
		episodes := make([]any, 0, len(items))
		for _, rawEpisode := range items {
			episode, ok := rawEpisode.(map[string]any)
			if !ok {
				continue
			}
			if empty(episode["link_embed"]) {
				episode["link_embed"] = episode["embed"]
			}
			if _, ok := episode["link_m3u8"]; !ok {
				episode["link_m3u8"] = ""
			}
			episodes = append(episodes, episode)
		}
		result = append(result, map[string]any{
			"server_name": valueOr(server["server_name"], "NguonC"),
			"server_data": episodes,
			"_source":     "nguonc",
		})
	}
	return result
}

func normalizeViCDN(payload map[string]any) map[string]any {
	data := payload["data"]
	if list, ok := data.([]any); ok {
		items := make([]any, 0, len(list))
		for _, raw := range list {
			if item, ok := raw.(map[string]any); ok {
				items = append(items, normalizeViCDNMovie(item))
			}
		}
		return map[string]any{"status": true, "items": items, "pagination": payload["pagination"]}
	}
	movie, ok := data.(map[string]any)
	if !ok {
		return payload
	}
	episodes := make([]any, 0)
	if entries, ok := movie["list_episodes"].([]any); ok {
		serverData := make([]any, 0, len(entries))
		for _, raw := range entries {
			parts := strings.SplitN(fmt.Sprint(raw), "|", 2)
			if len(parts) != 2 || strings.TrimSpace(parts[1]) == "" {
				continue
			}
			number := strings.TrimSpace(parts[0])
			serverData = append(serverData, map[string]any{
				"name":       "Tập " + number,
				"slug":       "tap-" + number,
				"link_embed": strings.TrimSpace(parts[1]),
				"link_m3u8":  "",
			})
		}
		if len(serverData) > 0 {
			episodes = append(episodes, map[string]any{
				"server_name": "ViCDN Song Ngữ",
				"server_data": serverData,
				"_type":       "song-ngu",
				"_source":     "vicdn",
			})
		}
	}
	return map[string]any{"status": true, "movie": normalizeViCDNMovie(movie), "episodes": episodes}
}

func normalizeViCDNMovie(movie map[string]any) map[string]any {
	name := firstString(movie["vname"], movie["ename"], movie["name"])
	originName := firstString(movie["ename"], movie["vname"])
	movie["name"] = name
	movie["origin_name"] = originName
	movie["slug"] = firstString(movie["slug"], slugify(originName), slugify(name))
	movie["thumb_url"] = firstString(movie["banner"], movie["poster"])
	movie["poster_url"] = firstString(movie["poster"], movie["banner"])
	movie["quality"] = "FHD"
	movie["lang"] = "Song Ngữ"
	movie["type"] = map[bool]string{true: "series", false: "single"}[fmt.Sprint(movie["type"]) == "tv"]
	movie["category"] = normalizeNamedList(movie["genre"])
	movie["country"] = normalizeNamedList(movie["country"])
	movie["actor"] = movie["cast"]
	movie["_source"] = "vicdn"
	movie["_sourceName"] = "ViCDN"
	return movie
}

func normalizeVSMov(payload map[string]any) map[string]any {
	cdn := firstString(payload["pathImage"])
	if data, ok := payload["data"].(map[string]any); ok && cdn == "" {
		cdn = firstString(data["pathImage"])
	}
	if cdn == "" {
		cdn = "https://vsmov.com/storage/images/"
	}
	fix := func(movie map[string]any) {
		for _, key := range []string{"thumb_url", "poster_url"} {
			value := firstString(movie[key])
			if value != "" && !strings.HasPrefix(value, "http://") && !strings.HasPrefix(value, "https://") {
				movie[key] = strings.TrimRight(cdn, "/") + "/" + strings.TrimLeft(value, "/")
			}
		}
		movie["_source"] = "vsmov"
	}
	if movie := movieFromPayload(payload); movie != nil {
		fix(movie)
	}
	for _, item := range extractItems(payload) {
		fix(item)
	}
	return payload
}

func movieFromPayload(payload map[string]any) map[string]any {
	if movie, ok := payload["movie"].(map[string]any); ok {
		return movie
	}
	if data, ok := payload["data"].(map[string]any); ok {
		if movie, ok := data["item"].(map[string]any); ok {
			return movie
		}
		if movie, ok := data["movie"].(map[string]any); ok {
			return movie
		}
	}
	return nil
}

func episodesFromPayload(payload map[string]any) []any {
	if episodes, ok := payload["episodes"].([]any); ok {
		return episodes
	}
	if data, ok := payload["data"].(map[string]any); ok {
		if episodes, ok := data["episodes"].([]any); ok {
			return episodes
		}
	}
	return nil
}

func extractItems(payload map[string]any) []map[string]any {
	var raw []any
	if items, ok := payload["items"].([]any); ok {
		raw = items
	} else if data, ok := payload["data"].(map[string]any); ok {
		if items, ok := data["items"].([]any); ok {
			raw = items
		}
	}
	result := make([]map[string]any, 0, len(raw))
	for _, item := range raw {
		if record, ok := item.(map[string]any); ok {
			result = append(result, record)
		}
	}
	return result
}

func normalizeFilm(source string, film map[string]any, rank int) map[string]any {
	normalizeArtwork(source, film, "")
	name := firstString(film["name"], film["title"], film["origin_name"], film["slug"])
	originName := firstString(film["origin_name"], film["original_name"])
	slug := firstString(film["slug"], slugify(originName), slugify(name))
	year := numberValue(film["year"])
	film["name"] = name
	film["origin_name"] = originName
	film["slug"] = slug
	film["_source"] = source
	film["_sources"] = []any{source}
	film["_sourceSlugs"] = map[string]any{source: slug}
	film["_canonicalKey"] = canonicalKey(film, name, originName, year)
	film["_duplicateCount"] = 1
	film["_rank"] = rank
	return film
}

func canonicalKey(film map[string]any, name, origin string, year int) string {
	if tmdb, ok := film["tmdb"].(map[string]any); ok {
		id := firstString(tmdb["id"])
		if id != "" && id != "0" {
			return "tmdb:" + firstString(tmdb["type"], "movie") + ":" + id
		}
	}
	if imdb, ok := film["imdb"].(map[string]any); ok {
		if id := firstString(imdb["id"]); id != "" && id != "0" {
			return "imdb:" + strings.ToLower(id)
		}
	}
	primary := normalizeText(firstString(origin, name, film["slug"]))
	if year > 0 {
		return fmt.Sprintf("film:%s:%d", primary, year)
	}
	return "film:" + primary
}

func canonicalAliases(film map[string]any) []string {
	name := firstString(film["name"], film["title"])
	origin := firstString(film["origin_name"], film["original_name"])
	year := numberValue(film["year"])
	aliases := map[string]bool{canonicalKey(film, name, origin, year): true}
	// Provider slugs are stable identities even when one source omits year.
	// Keeping this alias year-independent merges incomplete copies without
	// collapsing remakes that use different provider slugs.
	if slug := normalizeText(firstString(film["slug"])); slug != "" {
		aliases["slug:"+slug] = true
	}
	for _, value := range []string{name, origin} {
		title := normalizeText(value)
		if title == "" {
			continue
		}
		if year > 0 {
			aliases[fmt.Sprintf("title:%s:%d", title, year)] = true
		} else {
			aliases["title:"+title] = true
		}
	}
	result := make([]string, 0, len(aliases))
	for alias := range aliases {
		result = append(result, alias)
	}
	return result
}

func dedupeGroups(groups map[string][]map[string]any, limit int) []map[string]any {
	keys := make([]string, 0, len(groups))
	for source := range groups {
		keys = append(keys, source)
	}
	sort.Slice(keys, func(i, j int) bool { return sourcePriority[keys[i]] < sourcePriority[keys[j]] })
	byCanonical := make(map[string]map[string]any)
	aliasToCanonical := make(map[string]string)
	order := make([]string, 0)
	rank := 0
	maximum := 0
	for _, source := range keys {
		if len(groups[source]) > maximum {
			maximum = len(groups[source])
		}
	}
	// Round-robin source rows so a large provider cannot occupy the entire
	// first viewport. Duplicate entries are still merged into the first card.
	for index := 0; index < maximum; index++ {
		for _, source := range keys {
			if index >= len(groups[source]) {
				continue
			}
			raw := groups[source][index]
			film := normalizeFilm(source, raw, rank)
			rank++
			key := firstString(film["_canonicalKey"])
			aliases := canonicalAliases(film)
			for _, alias := range aliases {
				if existingKey := aliasToCanonical[alias]; existingKey != "" {
					key = existingKey
					break
				}
			}
			existing := byCanonical[key]
			if existing == nil {
				byCanonical[key] = film
				order = append(order, key)
			} else {
				mergeFilm(existing, film)
			}
			for _, alias := range aliases {
				aliasToCanonical[alias] = key
			}
		}
	}
	result := make([]map[string]any, 0, len(order))
	for _, key := range order {
		result = append(result, byCanonical[key])
		if limit > 0 && len(result) >= limit {
			break
		}
	}
	return result
}

func mergeFilm(target, incoming map[string]any) {
	for key, value := range incoming {
		if empty(target[key]) && !empty(value) {
			target[key] = value
		}
	}
	sources := stringSet(target["_sources"])
	for source := range stringSet(incoming["_sources"]) {
		sources[source] = true
	}
	ordered := make([]string, 0, len(sources))
	for source := range sources {
		ordered = append(ordered, source)
	}
	sort.Slice(ordered, func(i, j int) bool { return sourcePriority[ordered[i]] < sourcePriority[ordered[j]] })
	target["_sources"] = ordered
	target["_duplicateCount"] = len(ordered)
	slugs, _ := target["_sourceSlugs"].(map[string]any)
	if slugs == nil {
		slugs = make(map[string]any)
	}
	if incomingSlugs, ok := incoming["_sourceSlugs"].(map[string]any); ok {
		for source, slug := range incomingSlugs {
			slugs[source] = slug
		}
	}
	target["_sourceSlugs"] = slugs
	for _, key := range []string{"_posterCandidates", "_thumbCandidates"} {
		candidates := orderedStringValues(target[key], incoming[key])
		if len(candidates) > 0 {
			target[key] = candidates
		}
	}
}

func orderedStringValues(values ...any) []string {
	seen := make(map[string]bool)
	result := make([]string, 0)
	for _, value := range values {
		switch typed := value.(type) {
		case []string:
			for _, entry := range typed {
				entry = strings.TrimSpace(entry)
				if entry != "" && !seen[entry] {
					seen[entry] = true
					result = append(result, entry)
				}
			}
		case []any:
			for _, raw := range typed {
				entry := strings.TrimSpace(fmt.Sprint(raw))
				if entry != "" && !seen[entry] {
					seen[entry] = true
					result = append(result, entry)
				}
			}
		}
	}
	return result
}

func normalizeNamedList(value any) []any {
	list, _ := value.([]any)
	result := make([]any, 0, len(list))
	for index, raw := range list {
		if record, ok := raw.(map[string]any); ok {
			result = append(result, record)
			continue
		}
		name := strings.TrimSpace(fmt.Sprint(raw))
		if name != "" {
			result = append(result, map[string]any{"id": strconv.Itoa(index + 1), "name": name, "slug": slugify(name)})
		}
	}
	return result
}

func splitNames(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if name := strings.TrimSpace(part); name != "" {
			result = append(result, name)
		}
	}
	return result
}

func stringSet(value any) map[string]bool {
	result := make(map[string]bool)
	switch list := value.(type) {
	case []string:
		for _, item := range list {
			result[item] = true
		}
	case []any:
		for _, item := range list {
			if text := firstString(item); text != "" {
				result[text] = true
			}
		}
	}
	return result
}

func firstString(values ...any) string {
	for _, value := range values {
		switch typed := value.(type) {
		case string:
			if text := strings.TrimSpace(typed); text != "" {
				return text
			}
		case float64:
			return strconv.FormatFloat(typed, 'f', -1, 64)
		case int:
			return strconv.Itoa(typed)
		}
	}
	return ""
}

func numberValue(value any) int {
	switch typed := value.(type) {
	case float64:
		return int(typed)
	case int:
		return typed
	case string:
		parsed, _ := strconv.Atoi(typed)
		return parsed
	default:
		return 0
	}
}

func empty(value any) bool {
	if value == nil {
		return true
	}
	if text, ok := value.(string); ok {
		return strings.TrimSpace(text) == ""
	}
	return false
}

func valueOr(value, fallback any) any {
	if empty(value) {
		return fallback
	}
	return value
}
