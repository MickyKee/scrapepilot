from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Tag

from .types import ScrapedEntry

_DIGITS = re.compile(r'(\d+)')


class HackerNewsScraper:
    base_url = 'https://news.ycombinator.com/'

    async def scrape(self, pages: int = 1, delay_ms: int = 900) -> list[ScrapedEntry]:
        entries: list[ScrapedEntry] = []
        current_url = self.base_url

        headers = {
            'User-Agent': (
                'ScrapePilot/1.0 (+https://github.com/MickyKee/scrapepilot) '
                'Portfolio project for public Hacker News data'
            )
        }

        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=headers) as client:
            for page in range(max(1, pages)):
                response = await client.get(current_url)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, 'html.parser')
                entries.extend(self._parse_page(soup, current_url))

                next_link = soup.select_one('a.morelink')
                if next_link is None:
                    break

                href = next_link.get('href')
                if not href:
                    break

                current_url = urljoin(self.base_url, href)
                if page < pages - 1:
                    await asyncio.sleep(max(delay_ms, 0) / 1000)

        return entries

    def _parse_page(self, soup: BeautifulSoup, page_url: str) -> list[ScrapedEntry]:
        parsed_entries: list[ScrapedEntry] = []

        for story_row in soup.select('tr.athing'):
            if not isinstance(story_row, Tag):
                continue

            link = story_row.select_one('span.titleline > a') or story_row.select_one('a.storylink')
            if not isinstance(link, Tag):
                continue

            title = link.get_text(strip=True)
            href = link.get('href', '').strip()
            full_url = urljoin(page_url, href)

            subtext_row = story_row.find_next_sibling('tr')
            points = 0
            comments = 0

            if isinstance(subtext_row, Tag):
                points_tag = subtext_row.select_one('span.score')
                comments_tag = subtext_row.select('a')[-1] if subtext_row.select('a') else None
                points = self._extract_int(points_tag.get_text(strip=True) if isinstance(points_tag, Tag) else '')
                comments = self._extract_int(
                    comments_tag.get_text(strip=True) if isinstance(comments_tag, Tag) else ''
                )

            source_domain = urlparse(full_url).netloc or 'news.ycombinator.com'

            parsed_entries.append(
                ScrapedEntry(
                    title=title,
                    url=full_url,
                    points=points,
                    comments=comments,
                    source_domain=source_domain,
                    timestamp=datetime.now(timezone.utc),
                )
            )

        return parsed_entries

    @staticmethod
    def _extract_int(raw: str) -> int:
        match = _DIGITS.search(raw)
        if not match:
            return 0
        return int(match.group(1))
