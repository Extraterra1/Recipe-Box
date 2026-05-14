#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path


SESSION_LOG = Path.home() / ".codex/sessions/2026/05/14/rollout-2026-05-14T13-16-16-019e266a-894d-7731-be0e-f86715c2d2a2.jsonl"
OUTPUT_DIR = Path("/Users/cpires/Paprika MDs/html")


def safe_html_name(name: str) -> str:
    name = re.sub(r"[/:]+", " - ", name)
    name = re.sub(r"[\\?%*|\"<>]", "", name)
    name = re.sub(r"\s+", " ", name).strip().rstrip(".")
    if not name.lower().endswith(".html"):
        name += ".html"
    return name


def parse_tool_text(text: str) -> dict | None:
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None

    if isinstance(data, dict) and "structuredContent" in data:
        nested = data["structuredContent"]
        if isinstance(nested, dict):
            return nested
    return data if isinstance(data, dict) else None


def iter_fetch_results(log_path: Path):
    with log_path.open("r", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue

            payload = record.get("payload", {})
            if payload.get("type") != "mcp_tool_call_end":
                continue

            invocation = payload.get("invocation", {})
            if invocation.get("tool") != "google drive_fetch":
                continue

            ok = payload.get("result", {}).get("Ok", {})
            for item in ok.get("content", []):
                if item.get("type") != "text":
                    continue
                parsed = parse_tool_text(item.get("text", ""))
                if parsed:
                    yield parsed


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    recipes: dict[str, dict[str, str]] = {}
    for result in iter_fetch_results(SESSION_LOG):
        title = result.get("title") or result.get("display_title")
        content = result.get("content")
        mime_type = result.get("mime_type")
        file_id = result.get("id") or title

        if not title or title.lower() == "index.html":
            continue
        if mime_type != "text/html" or not isinstance(content, str):
            continue
        if not title.lower().endswith(".html"):
            continue

        recipes[file_id] = {"title": title, "content": content}

    for recipe in recipes.values():
        path = OUTPUT_DIR / safe_html_name(recipe["title"])
        path.write_text(recipe["content"], encoding="utf-8")

    print(f"Extracted {len(recipes)} HTML recipe files into {OUTPUT_DIR}")
    for title in sorted(recipe["title"] for recipe in recipes.values()):
        print(title)


if __name__ == "__main__":
    main()
