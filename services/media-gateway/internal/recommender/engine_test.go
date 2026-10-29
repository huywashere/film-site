package recommender

import (
	"testing"
)

func TestCleanText(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"Hạ Cánh Nơi Anh (Phần 1)", "ha canh noi anh phan 1"},
		{"Đao Kiếm Thần Vực: Ác Thần", "dao kiem than vuc ac than"},
		{"Jujutsu Kaisen 0!", "jujutsu kaisen 0"},
	}

	for _, c := range cases {
		got := CleanText(c.input)
		if got != c.expected {
			t.Errorf("CleanText(%q) = %q, want %q", c.input, got, c.expected)
		}
	}
}

func TestRecommenderEngine(t *testing.T) {
	engine := NewEngine()

	movies := []MovieItem{
		{
			ID: "1", Slug: "interstellar", Title: "Hố Đen Tử Thần", OriginTitle: "Interstellar",
			Genres: []string{"Khoa Học Viễn Tưởng", "Phiêu Lưu"}, Type: "single", Year: 2014,
			ViewCount: 500000, RatingScore: 9.5, RatingCount: 5000,
		},
		{
			ID: "2", Slug: "inception", Title: "Kẻ Đánh Cắp Giấc Mơ", OriginTitle: "Inception",
			Genres: []string{"Khoa Học Viễn Tưởng", "Hành Động"}, Type: "single", Year: 2010,
			ViewCount: 450000, RatingScore: 9.3, RatingCount: 4000,
		},
		{
			ID: "3", Slug: "the-notebook", Title: "Nhật Ký Tình Yêu", OriginTitle: "The Notebook",
			Genres: []string{"Tình Cảm", "Lãng Mạn"}, Type: "single", Year: 2004,
			ViewCount: 100000, RatingScore: 8.0, RatingCount: 1000,
		},
	}

	engine.IndexMovies(movies)

	// Test Top10
	top10 := engine.GetTop10("", 10)
	if len(top10) != 3 {
		t.Fatalf("expected 3 movies in top10, got %d", len(top10))
	}
	if top10[0].Slug != "interstellar" {
		t.Errorf("expected interstellar to be rank 1, got %s", top10[0].Slug)
	}

	// Test Similar for Interstellar
	similar := engine.GetSimilar("interstellar", 5)
	if len(similar) == 0 {
		t.Fatal("expected similar movies for interstellar")
	}
	// Inception should be more similar to Interstellar than The Notebook
	if similar[0].Slug != "inception" {
		t.Errorf("expected inception to be most similar to interstellar, got %s", similar[0].Slug)
	}
}

