from __future__ import annotations

from datetime import datetime
from typing import Literal
from typing import Optional, Union

from pydantic import BaseModel, ConfigDict


class StatCard(BaseModel):
    id: str
    label: str
    value: str
    trend_value: float
    trend_direction: Literal['up', 'down', 'flat']
    trend_label: str


class SummaryResponse(BaseModel):
    cards: list[StatCard]


class TrendPoint(BaseModel):
    time: str
    model_config = ConfigDict(extra='allow')


class TopicSeriesResponse(BaseModel):
    topics: list[str]
    points: list[dict[str, Union[int, str]]]


class DomainPoint(BaseModel):
    domain: str
    count: int


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: int
    title: str
    url: str
    points: int
    comments: int
    source_domain: str
    timestamp: datetime


class ItemListResponse(BaseModel):
    total: int
    items: list[ItemOut]


class RunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    started_at: datetime
    completed_at: Optional[datetime]
    status: str
    item_count: int
    error_message: Optional[str]


class HistoryResponse(BaseModel):
    success_rate: float
    runs: list[RunOut]


class ScrapeStatusResponse(BaseModel):
    is_running: bool
    last_run_status: Optional[str]
    last_run_completed_at: Optional[datetime]
    last_error: Optional[str]
    next_run_at: Optional[datetime]


class ScheduleResponse(BaseModel):
    interval_minutes: int
    next_run_at: Optional[datetime]


class ScheduleUpdateRequest(BaseModel):
    interval_minutes: int
