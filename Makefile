.PHONY: install api frontend dev docker-up docker-down

install:
	python3 -m venv .venv
	. .venv/bin/activate && pip install -r api/requirements.txt
	cd frontend && corepack enable && pnpm install

api:
	PYTHONPATH=. uvicorn api.app.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && pnpm exec next dev -H 0.0.0.0 -p 3000

dev:
	@echo "Run two terminals: make api and make frontend"

docker-up:
	docker compose up --build

docker-down:
	docker compose down
