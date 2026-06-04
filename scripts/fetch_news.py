"""
Fetch all RSS feeds listed in data/feeds.json and write data/news.json.

Run locally:   python3 scripts/fetch_news.py
Run in CI:     GitHub Actions (see .github/workflows/news.yml)

Output schema (data/news.json):
{
  "generated_ts": <unix>,
  "items": [
    {"title","link","source","published","published_ts","summary"}, ...
  ]
}
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import feedparser

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MAX_PER_FEED = 15
MAX_TOTAL = 80
SUMMARY_LIMIT = 300


def load_feeds() -> list[dict]:
    with open(DATA / "feeds.json", encoding="utf-8") as f:
        return json.load(f)["feeds"]


def clean_summary(text: str) -> str:
    import re
    text = re.sub(r"<[^>]+>", "", text or "")          # strip HTML tags
    text = text.replace("\n", " ").strip()
    if len(text) > SUMMARY_LIMIT:
        text = text[:SUMMARY_LIMIT].rstrip() + "…"
    return text


def fetch() -> dict:
    items: list[dict] = []
    for feed in load_feeds():
        print(f"  fetching: {feed['name']}")
        try:
            parsed = feedparser.parse(feed["url"])
        except Exception as e:
            print(f"    [WARN] failed: {e}")
            continue
        for entry in parsed.entries[:MAX_PER_FEED]:
            ts = 0
            if getattr(entry, "published_parsed", None):
                ts = int(time.mktime(entry.published_parsed))
            elif getattr(entry, "updated_parsed", None):
                ts = int(time.mktime(entry.updated_parsed))
            items.append({
                "title": getattr(entry, "title", "(no title)"),
                "link": getattr(entry, "link", "#"),
                "source": feed["name"],
                "published": getattr(entry, "published", "")
                             or getattr(entry, "updated", ""),
                "published_ts": ts,
                "summary": clean_summary(getattr(entry, "summary", "")),
            })

    items.sort(key=lambda x: x["published_ts"], reverse=True)
    items = items[:MAX_TOTAL]
    return {"generated_ts": int(time.time()), "items": items}


def main() -> None:
    data = fetch()
    out = DATA / "news.json"
    out.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Wrote {len(data['items'])} items -> {out}")


if __name__ == "__main__":
    main()
