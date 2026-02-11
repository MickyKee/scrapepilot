from __future__ import annotations

import asyncio
import json
from typing import Optional, Union

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import Depends, FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from .config import get_settings
from .database import Base, SessionLocal, engine, get_db
from .models import ScrapeRun
from .schemas import (
    HistoryResponse,
    ItemListResponse,
    ItemOut,
    ScheduleResponse,
    ScheduleUpdateRequest,
    ScrapeStatusResponse,
    SummaryResponse,
    TopicSeriesResponse,
)
from .services import (
    ScrapeOrchestrator,
    build_domains,
    build_summary_cards,
    build_topic_trends,
    export_items,
    export_items_as_csv,
    list_history,
    list_items,
)

settings = get_settings()
app = FastAPI(title=settings.app_name, version='1.0.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

scheduler = AsyncIOScheduler(timezone='UTC')
orchestrator = ScrapeOrchestrator(settings)
SCHEDULE_JOB_ID = 'scrapepilot_scrape_job'


@app.on_event('startup')
async def on_startup() -> None:
    db_path = settings.database_path
    if not db_path.parent.exists():
        db_path.parent.mkdir(parents=True, exist_ok=True)

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        interrupted_runs = (
            db.query(ScrapeRun)
            .filter(ScrapeRun.status == 'running')
            .all()
        )
        for run in interrupted_runs:
            run.status = 'failed'
            run.error_message = 'Interrupted before completion'
        db.commit()

    if not scheduler.running:
        scheduler.add_job(
            orchestrator.run_if_idle,
            'interval',
            minutes=settings.scrape_interval_minutes,
            id=SCHEDULE_JOB_ID,
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            misfire_grace_time=120,
        )
        scheduler.start()

    asyncio.create_task(orchestrator.run_if_idle())


@app.on_event('shutdown')
async def on_shutdown() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}


@app.get('/scrape/status', response_model=ScrapeStatusResponse)
def scrape_status() -> ScrapeStatusResponse:
    job = scheduler.get_job(SCHEDULE_JOB_ID)
    next_run_at = job.next_run_time if job else None
    return ScrapeStatusResponse(
        is_running=orchestrator.state.is_running,
        last_run_status=orchestrator.state.last_run_status,
        last_run_completed_at=orchestrator.state.last_run_completed_at,
        last_error=orchestrator.state.last_error,
        next_run_at=next_run_at,
    )


@app.post('/scrape/run')
async def run_scrape() -> JSONResponse:
    if orchestrator.state.is_running:
        raise HTTPException(status_code=409, detail='Scrape already running')

    run = await orchestrator.run_once()
    payload = {
        'run_id': run.id,
        'status': run.status,
        'item_count': run.item_count,
        'error_message': run.error_message,
        'completed_at': run.completed_at.isoformat() if run.completed_at else None,
    }
    return JSONResponse(payload)


@app.get('/analytics/summary', response_model=SummaryResponse)
def analytics_summary(db: Session = Depends(get_db)) -> SummaryResponse:
    return SummaryResponse(cards=build_summary_cards(db))


@app.get('/analytics/trending', response_model=TopicSeriesResponse)
def analytics_trending(db: Session = Depends(get_db)) -> TopicSeriesResponse:
    topics, points = build_topic_trends(db)
    return TopicSeriesResponse(topics=topics, points=points)


@app.get('/analytics/domains')
def analytics_domains(db: Session = Depends(get_db)) -> list[dict[str, Union[int, str]]]:
    return build_domains(db)


@app.get('/items', response_model=ItemListResponse)
def get_items(
    search: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
    sort_by: str = Query(default='timestamp', pattern='^(timestamp|points|comments|title)$'),
    sort_order: str = Query(default='desc', pattern='^(asc|desc)$'),
    limit: int = Query(default=30, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> ItemListResponse:
    total, items = list_items(db, search, source, sort_by, sort_order, limit, offset)
    return ItemListResponse(total=total, items=[ItemOut.model_validate(item) for item in items])


@app.get('/history', response_model=HistoryResponse)
def history(limit: int = Query(default=30, ge=1, le=200), db: Session = Depends(get_db)) -> HistoryResponse:
    success_rate, runs = list_history(db, limit=limit)
    return HistoryResponse(success_rate=round(success_rate, 1), runs=runs)


@app.get('/export/json')
def export_json(db: Session = Depends(get_db)) -> Response:
    rows = export_items(db)
    data = [
        {
            'id': row.id,
            'run_id': row.run_id,
            'title': row.title,
            'url': row.url,
            'points': row.points,
            'comments': row.comments,
            'source_domain': row.source_domain,
            'timestamp': row.timestamp.isoformat(),
        }
        for row in rows
    ]
    return Response(
        content=json.dumps(data, indent=2),
        media_type='application/json',
        headers={'Content-Disposition': 'attachment; filename=scraped-items.json'},
    )


@app.get('/export/csv')
def export_csv(db: Session = Depends(get_db)) -> StreamingResponse:
    csv_text = export_items_as_csv(db)
    return StreamingResponse(
        iter([csv_text]),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename=scraped-items.csv'},
    )


@app.get('/schedule', response_model=ScheduleResponse)
def get_schedule() -> ScheduleResponse:
    job = scheduler.get_job(SCHEDULE_JOB_ID)
    next_run_at = job.next_run_time if job else None
    return ScheduleResponse(interval_minutes=settings.scrape_interval_minutes, next_run_at=next_run_at)


@app.post('/schedule', response_model=ScheduleResponse)
def update_schedule(payload: ScheduleUpdateRequest) -> ScheduleResponse:
    settings.scrape_interval_minutes = payload.interval_minutes
    job = scheduler.get_job(SCHEDULE_JOB_ID)
    if job is None:
        scheduler.add_job(
            orchestrator.run_if_idle,
            'interval',
            minutes=payload.interval_minutes,
            id=SCHEDULE_JOB_ID,
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            misfire_grace_time=120,
        )
    else:
        scheduler.reschedule_job(SCHEDULE_JOB_ID, trigger='interval', minutes=payload.interval_minutes)

    refreshed_job = scheduler.get_job(SCHEDULE_JOB_ID)
    return ScheduleResponse(
        interval_minutes=payload.interval_minutes,
        next_run_at=refreshed_job.next_run_time if refreshed_job else None,
    )
