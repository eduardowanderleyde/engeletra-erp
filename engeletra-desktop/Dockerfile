# syntax=docker/dockerfile:1
# Imagem única: build do React (Vite) + API FastAPI + SQLite em volume.
# Build: docker build -t engeletra-erp .
# Run:  docker run --rm -p 8787:8787 -v engeletra-data:/data engeletra-erp

FROM node:20-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim-bookworm

WORKDIR /app/backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENGELETRA_DATA_DIR=/data \
    ENGELETRA_STATIC_DIR=/app/static

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

COPY backend/ ./

COPY --from=frontend /app/frontend/dist /app/static

RUN mkdir -p /data

VOLUME ["/data"]
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8787/health', timeout=4).read()" || exit 1

CMD ["uvicorn", "engeletra_api.main:app", "--host", "0.0.0.0", "--port", "8787"]
