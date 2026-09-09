FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN addgroup --system netphim && adduser --system --ingroup netphim netphim

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py database.py recommender.py security.py ./

USER netphim
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log"]
