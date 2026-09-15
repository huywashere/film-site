import re
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from database import fetch_movies_df, fetch_watch_history_df, fetch_ratings_df

def clean_text(text: str) -> str:
    if not text or not isinstance(text, str):
        return ""
    # Lowercase and remove punctuation
    text = re.sub(r"[^\w\s]", " ", text.lower())
    return " ".join(text.split())

class RecommendationEngine:
    def __init__(self):
        self.movies_df = pd.DataFrame()
        self.tfidf_matrix = None
        self.cosine_sim = None
        self.slug_to_idx = {}
        self.idx_to_slug = {}
        self.is_trained = False

    def build_feature_corpus(self, df: pd.DataFrame) -> list[str]:
        corpus = []
        for _, row in df.iterrows():
            slug_words = clean_text(str(row.get("slug", "")).replace("-", " "))
            title = clean_text(str(row.get("title", "")))
            origin = clean_text(str(row.get("origin_title", "")))
            genres = " ".join([clean_text(g) for g in (row.get("genres") or [])])
            countries = " ".join([clean_text(c) for c in (row.get("countries") or [])])
            actors = " ".join([clean_text(a) for a in (row.get("actors") or [])[:5]])
            directors = " ".join([clean_text(d) for d in (row.get("directors") or [])[:2]])
            m_type = clean_text(str(row.get("type", "")))
            year = str(row.get("release_year") or "")
            overview = clean_text(str(row.get("overview", "")))

            # Emphasize title/origin and slug semantics, genre tokens, type, and year
            feature_str = f"{slug_words} {slug_words} {title} {title} {origin} {origin} {genres} {genres} {countries} {m_type} {m_type} {year} {actors} {directors} {overview}".strip()
            corpus.append(feature_str)
        return corpus

    def train(self):
        """Build or refresh feature matrix from database."""
        df = fetch_movies_df()
        if df.empty:
            print("[INFO] No movies found in DB to train recommender.")
            self.is_trained = False
            return

        self.movies_df = df.copy().reset_index(drop=True)
        self.slug_to_idx = {row["slug"]: idx for idx, row in self.movies_df.iterrows()}
        self.idx_to_slug = {idx: row["slug"] for idx, row in self.movies_df.iterrows()}

        corpus = self.build_feature_corpus(self.movies_df)

        vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=5000,
            ngram_range=(1, 2),
        )
        self.tfidf_matrix = vectorizer.fit_transform(corpus)
        self.cosine_sim = cosine_similarity(self.tfidf_matrix, self.tfidf_matrix)
        self.is_trained = True
        print(f"[SUCCESS] Trained recommendation model on {len(self.movies_df)} movies.")

    def get_top10(self, user_id: str | None = None, limit: int = 10) -> list[dict]:
        """
        Computes Top 10 trending & recommended movies using:
        - View count momentum
        - Completion rate from watch history
        - Bayesian rating score
        - Genre diversity penalty
        """
        if not self.is_trained or self.movies_df.empty:
            self.train()
        if self.movies_df.empty:
            return []

        df = self.movies_df.copy()

        # 1. Base popularity score from views
        views = pd.to_numeric(df["view_count"], errors="coerce").fillna(0).values
        pop_score = np.log1p(views) * 2.5

        # 2. Bayesian rating score
        R = pd.to_numeric(df["rating_score"], errors="coerce").fillna(7.5).values
        v = pd.to_numeric(df["rating_count"], errors="coerce").fillna(0).values
        m = 5.0
        C = 7.5
        bayesian_score = (v / (v + m)) * R + (m / (v + m)) * C

        # 3. Completion rate bonus from watch_histories
        hist_df = fetch_watch_history_df()
        completion_bonus = np.zeros(len(df))
        if not hist_df.empty:
            valid_hist = hist_df[hist_df["duration"] > 60].copy()
            if not valid_hist.empty:
                valid_hist["comp_rate"] = (valid_hist["progress"] / valid_hist["duration"]).clip(0, 1)
                comp_by_movie = valid_hist.groupby("movie_id")["comp_rate"].mean().to_dict()
                for idx, row in df.iterrows():
                    m_id = str(row["id"])
                    slug = str(row["slug"])
                    avg_comp = comp_by_movie.get(m_id) or comp_by_movie.get(slug) or 0
                    completion_bonus[idx] = avg_comp * 3.0

        # Composite base score
        total_scores = pop_score + (bayesian_score * 0.8) + completion_bonus

        # 4. Diversity-Aware Selection (Max Marginal Relevance style)
        selected_indices = []
        selected_genres_count = {}
        available_indices = list(np.argsort(-total_scores))

        for idx in available_indices:
            if len(selected_indices) >= limit:
                break

            movie_genres = df.iloc[idx].get("genres") or []
            # Check genre overlap penalty
            overlap_penalty = sum(selected_genres_count.get(g, 0) for g in movie_genres)
            if overlap_penalty >= 3 and len(selected_indices) < limit - 2:
                # Postpone to maintain diversity
                continue

            selected_indices.append(idx)
            for g in movie_genres:
                selected_genres_count[g] = selected_genres_count.get(g, 0) + 1

        # Format output as FilmItem dicts
        top_movies = []
        for rank, idx in enumerate(selected_indices, start=1):
            row = df.iloc[idx]
            top_movies.append(self._format_film_item(row, rank=rank))

        return top_movies

    def get_similar(self, slug: str, limit: int = 12) -> list[dict]:
        """
        Computes top content-based + co-watch similar movies for a given movie slug.
        """
        if not self.is_trained or self.movies_df.empty:
            self.train()
        if self.movies_df.empty:
            return []

        if slug not in self.slug_to_idx:
            # Fallback to general top recommendations if movie not found in DB
            return self.get_top10(limit=limit)

        target_idx = self.slug_to_idx[slug]
        sim_scores = self.cosine_sim[target_idx].copy()

        # Co-watch boost: Check if other movies were watched in the same sessions
        hist_df = fetch_watch_history_df()
        if not hist_df.empty:
            user_sessions = hist_df[hist_df["movie_id"].isin([slug, str(self.movies_df.iloc[target_idx]["id"])])]["user_id"].unique()
            if len(user_sessions) > 0:
                co_watched = hist_df[hist_df["user_id"].isin(user_sessions)]["movie_id"].value_counts().to_dict()
                for other_slug, count in co_watched.items():
                    if other_slug in self.slug_to_idx:
                        other_idx = self.slug_to_idx[other_slug]
                        sim_scores[other_idx] += min(count * 0.05, 0.25)

        # Do not recommend the movie itself
        sim_scores[target_idx] = -1.0

        top_indices = np.argsort(-sim_scores)[:limit]

        similar_movies = []
        for idx in top_indices:
            if sim_scores[idx] <= 0:
                continue
            row = self.movies_df.iloc[idx]
            similar_movies.append(self._format_film_item(row, similarity=float(sim_scores[idx])))

        # If too few, fill with top movies from the same primary genre
        if len(similar_movies) < limit:
            target_genres = set(self.movies_df.iloc[target_idx].get("genres") or [])
            seen_slugs = {m["slug"] for m in similar_movies}
            seen_slugs.add(slug)

            for idx, row in self.movies_df.iterrows():
                if len(similar_movies) >= limit:
                    break
                r_slug = row["slug"]
                if r_slug not in seen_slugs and target_genres.intersection(set(row.get("genres") or [])):
                    seen_slugs.add(r_slug)
                    similar_movies.append(self._format_film_item(row))

        return similar_movies

    def _format_film_item(self, row: pd.Series, rank: int | None = None, similarity: float | None = None) -> dict:
        """Format DataFrame row into standard FlexPhim FilmItem dictionary."""
        def safe_str(val, default=""):
            if val is None or pd.isna(val):
                return default
            s = str(val).strip()
            return default if s.lower() == "nan" else s

        def safe_int(val, default=0):
            try:
                if val is None or pd.isna(val):
                    return default
                return int(val)
            except Exception:
                return default

        def safe_float(val, default=8.5):
            try:
                if val is None or pd.isna(val):
                    return default
                f = float(val)
                return default if np.isnan(f) else round(f, 1)
            except Exception:
                return default

        thumb = safe_str(row.get("thumb_url"))
        poster = safe_str(row.get("poster_url"))
        final_thumb = thumb or poster
        final_poster = poster or thumb

        return {
            "_id": safe_str(row.get("id")) or safe_str(row.get("slug")),
            "name": safe_str(row.get("title")),
            "origin_name": safe_str(row.get("origin_title")) or safe_str(row.get("title")),
            "slug": safe_str(row.get("slug")) or safe_str(row.get("id")),
            "thumb_url": final_thumb,
            "poster_url": final_poster,
            "year": safe_int(row.get("release_year"), 2024),
            "type": safe_str(row.get("type"), "single"),
            "quality": "HD",
            "lang": "Vietsub",
            "view": safe_int(row.get("view_count"), 0),
            "rating": safe_float(row.get("rating_score"), 8.5),
            "rank": rank,
            "ai_match_score": round(similarity * 100) if similarity is not None and not np.isnan(similarity) else None,
        }

engine = RecommendationEngine()
