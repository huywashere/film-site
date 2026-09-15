import os
from contextlib import asynccontextmanager
from typing import Annotated
from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from recommender import engine
from security import admin_token_is_configured, admin_token_matches

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Train/warm-up recommendation matrix on startup
    print("[STARTUP] Initializing AI Recommendation Engine...")
    try:
        engine.train()
    except Exception as e:
        print(f"[WARN] Startup training failed: {e}")
    yield
    print("[SHUTDOWN] Recommendation Engine stopped.")

app = FastAPI(
    title="FlexPhim AI Recommendation Engine",
    version="1.0.0",
    lifespan=lifespan,
)

def require_admin_token(
    token: Annotated[
        str | None,
        Header(alias="X-Recommendation-Admin-Token"),
    ] = None,
):
    expected = os.getenv("RECOMMENDATION_ADMIN_TOKEN", "").strip()
    if not admin_token_is_configured(expected):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recommendation administration is not configured",
        )
    if not admin_token_matches(token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid recommendation administration token",
        )

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "netphim-recommendation-engine",
        "trained": engine.is_trained,
        "indexed_movies": len(engine.movies_df) if engine.is_trained else 0,
    }

@app.get("/recommendations/top10")
def get_top10(
    limit: int = Query(10, ge=1, le=50),
    userId: str | None = Query(None),
):
    """
    Returns AI-curated Top 10 trending & recommended movies.
    Used by: Trang Duyệt Tìm (/genres) Top10RankedRow.
    """
    items = engine.get_top10(user_id=userId, limit=limit)
    return {
        "success": True,
        "source": "python-ai-engine",
        "total": len(items),
        "items": items,
    }

@app.get("/recommendations/similar/{slug}")
def get_similar(
    slug: str,
    limit: int = Query(12, ge=1, le=50),
):
    """
    Returns content-based + co-watch similar movies for the given movie slug.
    Used by: Trang Xem Phim (/watch/[slug]) tab Đề Xuất (For You).
    """
    items = engine.get_similar(slug=slug, limit=limit)
    return {
        "success": True,
        "source": "python-ai-engine",
        "target_slug": slug,
        "total": len(items),
        "items": items,
    }

@app.post(
    "/recommendations/retrain",
    dependencies=[Depends(require_admin_token)],
)
def retrain():
    """Manual trigger to refresh movie feature matrix from DB."""
    engine.train()
    return {
        "success": True,
        "indexed_movies": len(engine.movies_df),
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
