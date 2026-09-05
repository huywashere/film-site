import os
import psycopg2
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/movie_demo_db",
)

def get_connection():
    return psycopg2.connect(DATABASE_URL)

def fetch_movies_df() -> pd.DataFrame:
    """Fetch movie metadata for feature matrix construction."""
    query = """
        SELECT
            m.id,
            m.id as slug,
            m.title,
            m."originName" as origin_title,
            m."thumbUrl" as thumb_url,
            m."posterUrl" as poster_url,
            COALESCE(m.description, '') as overview,
            COALESCE(m.type, 'single') as type,
            COALESCE(m.year, 2024) as release_year,
            m.genres,
            m.countries,
            m.actors,
            m.directors,
            COUNT(DISTINCT v.id) as view_count,
            COALESCE(AVG(r.score), 8.5) as rating_score,
            COUNT(DISTINCT r."userId") as rating_count
        FROM movies m
        LEFT JOIN view_logs v ON v."movieId" = m.id
        LEFT JOIN ratings r ON r."movieId" = m.id
        WHERE m."isHidden" = false
        GROUP BY m.id
    """
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            columns = [desc[0] for desc in cursor.description]
            data = cursor.fetchall()
            df = pd.DataFrame(data, columns=columns)
            return df
    except Exception as e:
        print(f"[WARN] Error fetching movies: {e}")
        return pd.DataFrame()

def fetch_watch_history_df() -> pd.DataFrame:
    """Fetch watch history for completion rate and co-occurrence signals."""
    query = """
        SELECT
            "userId" as user_id,
            "movieId" as movie_id,
            progress,
            duration,
            "watchedAt" as watched_at
        FROM watch_histories
    """
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            columns = [desc[0] for desc in cursor.description]
            data = cursor.fetchall()
            return pd.DataFrame(data, columns=columns)
    except Exception as e:
        print(f"[WARN] Error fetching watch histories: {e}")
        return pd.DataFrame()

def fetch_ratings_df() -> pd.DataFrame:
    """Fetch user explicit ratings."""
    query = """
        SELECT
            "userId" as user_id,
            "movieId" as movie_id,
            score
        FROM ratings
    """
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            columns = [desc[0] for desc in cursor.description]
            data = cursor.fetchall()
            return pd.DataFrame(data, columns=columns)
    except Exception as e:
        print(f"[WARN] Error fetching ratings: {e}")
        return pd.DataFrame()
