#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import re
from html.parser import HTMLParser
from pathlib import Path


class PaprikaParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, dict[str, str]]] = []
        self.title = ""
        self.source_label = ""
        self.source_url = ""
        self.meta_parts: list[str] = []
        self.sections: dict[str, list[str]] = {
            "Ingredients": [],
            "Directions": [],
            "Notes": [],
            "Nutrition": [],
        }
        self.current_section: str | None = None
        self.current_line: list[str] = []
        self.in_name = False
        self.in_metadata = False
        self.in_source_link = False
        self.in_line = False
        self.in_strong = False

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = {k: v or "" for k, v in attrs_list}
        classes = set(attrs.get("class", "").split())
        self.stack.append((tag, attrs))

        if tag == "h1" and attrs.get("itemprop") == "name":
            self.in_name = True
        elif tag == "p" and "metadata" in classes:
            self.in_metadata = True
        elif tag == "a" and attrs.get("itemprop") == "url":
            self.source_url = attrs.get("href", "").strip()
            self.in_source_link = True
        elif tag == "div":
            if "ingredients" in classes:
                self.current_section = "Ingredients"
            elif "directions" in classes:
                self.current_section = "Directions"
            elif "notes" in classes:
                self.current_section = "Notes"
            elif "nutrition" in classes:
                self.current_section = "Nutrition"
        elif tag == "p" and self.current_section:
            self.in_line = True
            self.current_line = []
        elif tag == "br" and self.in_line:
            self._append_text("\n")
        elif tag in {"strong", "b"}:
            self.in_strong = True
            if self.in_line:
                self._append_text("**")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"strong", "b"}:
            if self.in_line:
                self._append_text("**")
            self.in_strong = False
        elif tag == "h1" and self.in_name:
            self.in_name = False
        elif tag == "p" and self.in_metadata:
            self.in_metadata = False
        elif tag == "a" and self.in_source_link:
            self.in_source_link = False
        elif tag == "p" and self.in_line:
            text = clean_text("".join(self.current_line))
            if text:
                self.sections[self.current_section or "Directions"].append(text)
            self.current_line = []
            self.in_line = False
        elif tag == "div" and self.current_section:
            if self.stack and " ".join(dict(self.stack[-1][1]).get("class", "").split()) in {
                "ingredients text",
                "directions text",
                "notes text",
                "nutrition text",
            }:
                self.current_section = None

        if self.stack:
            self.stack.pop()

    def handle_data(self, data: str) -> None:
        if self.in_name:
            self.title += data
        elif self.in_source_link:
            self.source_label += data
        elif self.in_metadata:
            part = clean_text(data)
            if part and part != "Source:":
                self.meta_parts.append(part)
        elif self.in_line:
            self._append_text(data)

    def _append_text(self, text: str) -> None:
        self.current_line.append(text)


def clean_text(value: str) -> str:
    value = html.unescape(value).replace("\ufeff", "")
    value = re.sub(r"[ \t\r\f\v]+", " ", value)
    value = re.sub(r" *\n+ *", "\n", value)
    return value.strip()


def safe_filename(name: str) -> str:
    name = re.sub(r"[/:]+", " - ", name)
    name = re.sub(r"[\\?%*|\"<>]", "", name)
    name = re.sub(r"\s+", " ", name).strip().rstrip(".")
    return name or "Untitled Recipe"


def unique_path(output_dir: Path, stem: str, suffix: str) -> Path:
    candidate = output_dir / f"{stem}{suffix}"
    if not candidate.exists():
        return candidate

    index = 2
    while True:
        candidate = output_dir / f"{stem} {index}{suffix}"
        if not candidate.exists():
            return candidate
        index += 1


def format_section(title: str, lines: list[str], ordered: bool = False) -> list[str]:
    if not lines:
        return []
    out = [f"## {title}", ""]
    for index, line in enumerate(lines, 1):
        chunks = [chunk.strip() for chunk in line.split("\n") if chunk.strip()]
        if not chunks:
            continue
        marker = f"{index}." if ordered else "-"
        out.append(f"{marker} {chunks[0]}")
        for chunk in chunks[1:]:
            out.append(f"  {chunk}")
    out.append("")
    return out


def convert_file(path: Path, output_dir: Path) -> Path | None:
    if path.name.lower() == "index.html":
        return None

    parser = PaprikaParser()
    parser.feed(path.read_text(encoding="utf-8", errors="replace"))
    title = clean_text(parser.title) or path.stem

    lines = [f"# {title}", ""]
    if parser.source_url:
        label = clean_text(parser.source_label) or parser.source_url
        lines.extend([f"Source: [{label}]({parser.source_url})", ""])
    if parser.meta_parts:
        meta = " ".join(parser.meta_parts)
        meta = re.sub(r"\s+", " ", meta).strip()
        if meta:
            lines.extend([meta, ""])

    lines.extend(format_section("Ingredients", parser.sections["Ingredients"]))
    lines.extend(format_section("Directions", parser.sections["Directions"], ordered=True))
    lines.extend(format_section("Notes", parser.sections["Notes"]))
    lines.extend(format_section("Nutrition", parser.sections["Nutrition"]))

    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = unique_path(output_dir, safe_filename(title), ".md")
    out_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return out_path


def main() -> None:
    argp = argparse.ArgumentParser()
    argp.add_argument("input", type=Path, help="Folder containing Paprika HTML files")
    argp.add_argument("-o", "--output", type=Path, default=Path.cwd(), help="Markdown output folder")
    args = argp.parse_args()

    html_files = sorted(args.input.glob("*.html"))
    written = [p for p in (convert_file(path, args.output) for path in html_files) if p]
    print(f"Converted {len(written)} recipe files into {args.output}")


if __name__ == "__main__":
    main()
