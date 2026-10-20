# One-origin deployment: build React, then serve it alongside FastAPI on Render.
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN npm install --global pnpm@10.15.1 && pnpm install --frozen-lockfile
COPY frontend/ ./
# Vite imports design reference assets from outside frontend/src.
# Preserve the repository-relative path for CoordinatorParts.tsx.
COPY designs/ /build/designs/
RUN pnpm build

FROM python:3.11-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ ./backend/
COPY fall_detection/ ./fall_detection/
COPY utility_anomaly/ ./utility_anomaly/
COPY --from=frontend-build /build/frontend/dist/ ./frontend/dist/
EXPOSE 10000
CMD ["sh", "-c", "exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
