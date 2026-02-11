FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY frontend/package.json /app/frontend/package.json
COPY frontend/pnpm-lock.yaml /app/frontend/pnpm-lock.yaml
WORKDIR /app/frontend
RUN pnpm install --frozen-lockfile

COPY frontend /app/frontend

ENV NEXT_PUBLIC_API_BASE_URL=http://api:8000

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start", "-H", "0.0.0.0", "-p", "3000"]
