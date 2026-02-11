from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class ScrapedEntry:
    title: str
    url: str
    points: int
    comments: int
    source_domain: str
    timestamp: datetime
