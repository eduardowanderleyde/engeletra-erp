# syntax=docker/dockerfile:1.7
# Imagem unica: build do React (Vite) + API FastAPI + SQLite em volume.
#
# Build:
#   docker build -t engeletra-erp .
#
# Run:
#   docker run --rm -p 8787:8787 -v engeletra-data:/data engeletra-erp
#
# O FastAPI serve a SPA React em / e expoe a API nas mesmas rotas.
# O banco SQLite vive em /data (volume nomeado para persistir entre execucoes).

# ───────────────────────────────────────────────
# Stage 1: build do frontend (Vite/React)
# ───────────────────────────────────────────────
FROM node:20.20.2-bookworm-slim AS frontend
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# String vazia => o fetch usa a mesma origem do navegador
# (mesmo host e porta do FastAPI). Em dev (npm run dev) o codigo
# usa o fallback http://127.0.0.1:8787.
ENV VITE_API_BASE=""
RUN npm run build


# ───────────────────────────────────────────────
# Stage 2: imagem final com FastAPI + SQLite
# ───────────────────────────────────────────────
FROM python:3.12.13-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENGELETRA_DATA_DIR=/data \
    ENGELETRA_STATIC_DIR=/app/static \
    ENGELETRA_API_HOST=0.0.0.0 \
    ENGELETRA_API_PORT=8787

WORKDIR /app/backend

# tini: PID 1 que repassa sinais corretamente (Ctrl+C, docker stop)
# curl: healthcheck simples
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl tini \
    && rm -rf /var/lib/apt/lists/*

# Instala deps Python em camada propria (cache amigavel)
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

# Codigo do backend
COPY backend/ ./

# Estaticos do React vindos do estagio 1
COPY --from=frontend /app/frontend/dist /app/static

# Remove bits SUID/SGID desnecessarios para reduzir superficie de ataque
RUN find / -xdev -perm /6000 -exec chmod a-s {} + 2>/dev/null || true

# Usuario nao-root + diretorio de dados
RUN useradd --system --uid 1001 --home /app --shell /usr/sbin/nologin engeletra \
    && mkdir -p /data \
    && chown -R engeletra:engeletra /data /app

USER engeletra

VOLUME ["/data"]
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8787/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["uvicorn", "engeletra_api.main:app", "--host", "0.0.0.0", "--port", "8787"]
