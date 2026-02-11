from __future__ import annotations

import asyncio
import csv
import io
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, Optional, Union

from sqlalchemy import Select, desc, func, select
from sqlalchemy.orm import Session

from scraper.hackernews import HackerNewsScraper

from .config import Settings
from .database import SessionLocal
from .models import ScrapeRun, ScrapedItem
from .schemas import StatCard


STOP_WORDS = {
    'the',
    'a',
    'an',
    'to',
    'for',
    'of',
    'in',
    'on',
    'with',
    'and',
    'or',
    'is',
    'it',
    'from',
    'by',
    'you',
    'your',
    'this',
    'that',
    'how',
    'new',
}

WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9'\\-]{2,}")


@dataclass
class RuntimeState:
    is_running: bool = False
    last_run_status: Optional[str] = None
    last_run_completed_at: Optional[datetime] = None
    last_error: Optional[str] = None


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ScrapeOrchestrator:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._scraper = HackerNewsScraper()
        self._lock = asyncio.Lock()
        self.state = RuntimeState()

    async def run_once(self) -> ScrapeRun:
        async with self._lock:
            if self.state.is_running:
                raise RuntimeError('Scrape already running')
            self.state.is_running = True

        db = SessionLocal()
        run = ScrapeRun(status='running', started_at=utcnow())
        db.add(run)
        db.commit()
        db.refresh(run)

        try:
            entries = await self._scraper.scrape(
                pages=self._settings.scraper_pages,
                delay_ms=self._settings.scraper_request_delay_ms,
            )
            for entry in entries:
                db.add(
                    ScrapedItem(
                        run_id=run.id,
                        title=entry.title,
                        url=entry.url,
                        points=entry.points,
                        comments=entry.comments,
                        source_domain=entry.source_domain,
                        timestamp=entry.timestamp,
                    )
                )
            run.status = 'success'
            run.item_count = len(entries)
            run.error_message = None
            self.state.last_error = None
        except Exception as exc:  # pragma: no cover - network failures are expected sometimes
            run.status = 'failed'
            run.item_count = 0
            run.error_message = str(exc)
            self.state.last_error = str(exc)
        finally:
            run.completed_at = utcnow()
            self.state.is_running = False
            self.state.last_run_status = run.status
            self.state.last_run_completed_at = run.completed_at
            db.add(run)
            db.commit()
            db.refresh(run)
            db.close()

        return run

    async def run_if_idle(self) -> Optional[ScrapeRun]:
        if self.state.is_running:
            return None
        return await self.run_once()


def _trend(current: float, previous: float) -> tuple[float, Literal['up', 'down', 'flat']]:
    if previous == 0 and current == 0:
        return 0.0, 'flat'
    if previous == 0:
        return 100.0, 'up'
    delta = ((current - previous) / abs(previous)) * 100
    if abs(delta) < 0.05:
        return 0.0, 'flat'
    return round(delta, 1), ('up' if delta > 0 else 'down')


def build_summary_cards(db: Session) -> list[StatCard]:
    total_items = db.scalar(select(func.count(ScrapedItem.id))) or 0
    total_runs = db.scalar(select(func.count(ScrapeRun.id))) or 0
    successful_runs = db.scalar(select(func.count(ScrapeRun.id)).where(ScrapeRun.status == 'success')) or 0

    success_rate = (successful_runs / total_runs * 100) if total_runs else 0.0
    avg_points = db.scalar(select(func.avg(ScrapedItem.points))) or 0.0
    avg_comments = db.scalar(select(func.avg(ScrapedItem.comments))) or 0.0

    latest_runs = list(db.scalars(select(ScrapeRun).order_by(desc(ScrapeRun.started_at)).limit(2)).all())
    current_run = latest_runs[0] if latest_runs else None
    previous_run = latest_runs[1] if len(latest_runs) > 1 else None

    current_items = float(current_run.item_count if current_run else 0)
    previous_items = float(previous_run.item_count if previous_run else 0)
    items_delta, items_dir = _trend(current_items, previous_items)

    current_run_success = 100.0 if current_run and current_run.status == 'success' else 0.0
    previous_run_success = 100.0 if previous_run and previous_run.status == 'success' else 0.0
    success_delta, success_dir = _trend(current_run_success, previous_run_success)

    latest_run_id = current_run.id if current_run else None
    previous_run_id = previous_run.id if previous_run else None

    def avg_for_run(run_id: Optional[int], column: object) -> float:
        if run_id is None:
            return 0.0
        value = db.scalar(select(func.avg(column)).where(ScrapedItem.run_id == run_id))
        return float(value or 0.0)

    current_points = avg_for_run(latest_run_id, ScrapedItem.points)
    previous_points = avg_for_run(previous_run_id, ScrapedItem.points)
    points_delta, points_dir = _trend(current_points, previous_points)

    current_comments = avg_for_run(latest_run_id, ScrapedItem.comments)
    previous_comments = avg_for_run(previous_run_id, ScrapedItem.comments)
    comments_delta, comments_dir = _trend(current_comments, previous_comments)

    cards = [
        StatCard(
            id='total_items',
            label='Total Items',
            value=f'{int(total_items):,}',
            trend_value=items_delta,
            trend_direction=items_dir,
            trend_label='vs previous run volume',
        ),
        StatCard(
            id='success_rate',
            label='Run Success Rate',
            value=f'{success_rate:.1f}%',
            trend_value=success_delta,
            trend_direction=success_dir,
            trend_label='vs previous run outcome',
        ),
        StatCard(
            id='avg_points',
            label='Avg Story Points',
            value=f'{avg_points:.1f}',
            trend_value=points_delta,
            trend_direction=points_dir,
            trend_label='vs previous run avg',
        ),
        StatCard(
            id='avg_comments',
            label='Avg Comments',
            value=f'{avg_comments:.1f}',
            trend_value=comments_delta,
            trend_direction=comments_dir,
            trend_label='vs previous run avg',
        ),
    ]

    return cards


def build_topic_trends(db: Session) -> tuple[list[str], list[dict[str, Union[int, str]]]]:
    items = list(
        db.scalars(
            select(ScrapedItem)
            .order_by(ScrapedItem.timestamp.asc())
            .limit(600)
        ).all()
    )

    if not items:
        return [], []

    word_scores: dict[str, int] = {}
    for item in items:
        for match in WORD_RE.findall(item.title.lower()):
            if match in STOP_WORDS:
                continue
            word_scores[match] = word_scores.get(match, 0) + 1

    topics = [w for w, _ in sorted(word_scores.items(), key=lambda pair: pair[1], reverse=True)[:4]]
    if not topics:
        return [], []

    buckets: dict[str, dict[str, int]] = {}
    for item in items:
        bucket_key = item.timestamp.astimezone(timezone.utc).strftime('%m-%d %H:%M')
        bucket = buckets.setdefault(bucket_key, {topic: 0 for topic in topics})
        title_lower = item.title.lower()
        for topic in topics:
            if topic in title_lower:
                bucket[topic] += 1

    points: list[dict[str, Union[int, str]]] = []
    for bucket_key, topic_counts in buckets.items():
        point: dict[str, Union[int, str]] = {'time': bucket_key}
        point.update(topic_counts)
        points.append(point)

    return topics, points


def build_domains(db: Session) -> list[dict[str, Union[int, str]]]:
    rows = db.execute(
        select(ScrapedItem.source_domain, func.count(ScrapedItem.id).label('count'))
        .group_by(ScrapedItem.source_domain)
        .order_by(desc('count'))
        .limit(8)
    ).all()

    return [{'domain': row[0], 'count': int(row[1])} for row in rows]


def list_items(
    db: Session,
    search: Optional[str],
    source: Optional[str],
    sort_by: str,
    sort_order: str,
    limit: int,
    offset: int,
) -> tuple[int, list[ScrapedItem]]:
    base_query: Select[tuple[ScrapedItem]] = select(ScrapedItem)

    if search:
        base_query = base_query.where(ScrapedItem.title.ilike(f'%{search}%'))

    if source:
        base_query = base_query.where(ScrapedItem.source_domain == source)

    total = db.scalar(select(func.count()).select_from(base_query.subquery())) or 0

    sort_column = {
        'timestamp': ScrapedItem.timestamp,
        'points': ScrapedItem.points,
        'comments': ScrapedItem.comments,
        'title': ScrapedItem.title,
    }.get(sort_by, ScrapedItem.timestamp)

    if sort_order == 'asc':
        base_query = base_query.order_by(sort_column.asc())
    else:
        base_query = base_query.order_by(sort_column.desc())

    items = list(db.scalars(base_query.offset(offset).limit(limit)).all())
    return total, items


def list_history(db: Session, limit: int = 30) -> tuple[float, list[ScrapeRun]]:
    runs = list(db.scalars(select(ScrapeRun).order_by(desc(ScrapeRun.started_at)).limit(limit)).all())

    total_runs = db.scalar(select(func.count(ScrapeRun.id))) or 0
    successful_runs = db.scalar(select(func.count(ScrapeRun.id)).where(ScrapeRun.status == 'success')) or 0
    success_rate = (successful_runs / total_runs * 100) if total_runs else 0.0

    return success_rate, runs


def export_items(db: Session) -> list[ScrapedItem]:
    return list(db.scalars(select(ScrapedItem).order_by(desc(ScrapedItem.timestamp)).limit(1000)).all())


def export_items_as_csv(db: Session) -> str:
    rows = export_items(db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['id', 'run_id', 'title', 'url', 'points', 'comments', 'source_domain', 'timestamp'])

    for row in rows:
        writer.writerow(
            [
                row.id,
                row.run_id,
                row.title,
                row.url,
                row.points,
                row.comments,
                row.source_domain,
                row.timestamp.isoformat(),
            ]
        )

    return output.getvalue()
