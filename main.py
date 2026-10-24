"""Static-site builder.

Reads Markdown from ``content/`` and renders HTML pages with the Jinja
templates in ``src/templates``. Run ``python main.py`` after editing content.
"""

import math
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import markdown  # type: ignore
import yaml  # type: ignore
from bs4 import BeautifulSoup
from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup

CONTENT_DIR = Path("content")
POSTS_DIR = Path("posts")
FRONT_MATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n?(.*)\Z", re.DOTALL)
INTERNAL_HOSTS = {
    "",
    "nischal-bh.github.io",
    "www.nischal-bh.github.io",
    "nischallllll.github.io",
    "www.nischallllll.github.io",
}
EXTERNAL_LINK_RE = re.compile(r'<a href="([^"]+)"(?![^>]*\btarget=)')
TASK_RE = re.compile(r"<li>(\s*<p>)?\s*\[([ xX])\]\s*")
MD_EXTENSIONS = ["extra", "sane_lists", "smarty", "toc"]

# Most common human codon for each amino acid (one-letter code).
CODONS = {
    "A": "GCC", "R": "AGG", "N": "AAC", "D": "GAC", "C": "UGC",
    "Q": "CAG", "E": "GAG", "G": "GGC", "H": "CAC", "I": "AUC",
    "L": "CUG", "K": "AAG", "M": "AUG", "F": "UUC", "P": "CCC",
    "S": "AGC", "T": "ACC", "W": "UGG", "Y": "UAC", "V": "GUG",
}  # fmt: skip


def is_external_url(url: Any) -> bool:
    if not isinstance(url, str):
        return False

    raw = url.strip()
    if not raw or raw.startswith(("#", "/", "./", "../", "mailto:")):
        return False

    parsed = urlparse(raw)
    return (
        parsed.scheme in {"http", "https"}
        and parsed.netloc.lower() not in INTERNAL_HOSTS
    )


def parse_markdown(source: str) -> tuple[dict[str, Any], str]:
    match = FRONT_MATTER_RE.match(source)
    if not match:
        return {}, source

    metadata, body = match.groups()
    parsed = yaml.safe_load(metadata) or {}
    return (parsed if isinstance(parsed, dict) else {}), body.lstrip("\n")


def render_task_lists(html: str) -> str:
    """Turn GitHub-style `- [ ] item` / `- [x] item` into styled checkboxes."""

    def replace(match: re.Match[str]) -> str:
        done = match.group(2).lower() == "x"
        state = " task--done" if done else ""
        label = "done" if done else "to do"
        return (
            f'<li class="task{state}">{match.group(1) or ""}'
            f'<span class="task__box" role="img" aria-label="{label}"></span>'
        )

    return TASK_RE.sub(replace, html)


def render_markdown(body: str) -> Markup:
    html = markdown.markdown(body, extensions=MD_EXTENSIONS)
    html = render_task_lists(html)

    def add_link_attributes(match: re.Match[str]) -> str:
        href = match.group(1)
        if is_external_url(href):
            return f'<a href="{href}" target="_blank" rel="noopener noreferrer"'
        return match.group(0)

    return Markup(EXTERNAL_LINK_RE.sub(add_link_attributes, html))


def plain_text(html: Any) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", str(html))).strip()


def render_inline_markdown(text: Any) -> Markup:
    """Render a short Markdown string (no wrapping <p>), e.g. for summaries."""
    if not text:
        return Markup("")
    html = markdown.markdown(str(text), extensions=["extra", "smarty"])
    soup = BeautifulSoup(html, "html.parser")

    for link in soup.find_all("a"):
        if is_external_url(link.get("href")):
            link["target"] = "_blank"
            link["rel"] = "noopener noreferrer"

    paragraphs = soup.find_all("p", recursive=False)
    if len(paragraphs) == 1:
        paragraphs[0].unwrap()

    return Markup(str(soup).strip())


def reading_time(html: Any) -> int:
    words = len(plain_text(html).split())
    return max(1, math.ceil(words / 220))


def read_document(path: Path) -> dict[str, Any]:
    metadata, body = parse_markdown(path.read_text(encoding="utf-8"))
    body_html = render_markdown(body)
    summary_source = metadata.get("summary") or metadata.get("description") or ""
    return {
        **metadata,
        "source": path,
        "slug": path.stem,
        "body_html": body_html,
        "summary": render_inline_markdown(summary_source or plain_text(body_html)),
        "reading_time": reading_time(body_html),
    }


def collection(name: str) -> list[dict[str, Any]]:
    directory = CONTENT_DIR / name
    if not directory.exists():
        return []

    items = []
    for path in directory.glob("*.md"):
        item = read_document(path)
        if item.get("draft"):
            continue
        tags = item.get("tags", item.get("category", item.get("tag", [])))
        item["tags"] = (
            [str(tag) for tag in tags]
            if isinstance(tags, list)
            else [str(tags)]
            if tags
            else []
        )
        item["year"] = str(item.get("year") or "")
        item["date"] = str(item.get("date") or "")
        if not item["year"] and item["date"]:
            item["year"] = item["date"][:4]
        items.append(item)

    return sorted(
        items,
        key=lambda item: item.get("date") or item.get("year") or item["slug"],
        reverse=True,
    )


def format_date(value: Any) -> str:
    if isinstance(value, (date, datetime)):
        return value.strftime("%b %d, %Y")
    if not value:
        return ""
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").strftime("%b %d, %Y")
    except ValueError:
        return str(value)


def translate_name(name: str) -> list[dict[str, str]]:
    """Encode a name as mRNA codons -> amino acids (letters with no amino acid are skipped)."""
    letters = [ch for ch in name.upper() if ch in CODONS]
    codons = [{"codon": "AUG", "aa": "M", "kind": "start"}]
    codons += [{"codon": CODONS[ch], "aa": ch, "kind": ""} for ch in letters]
    codons.append({"codon": "UGA", "aa": "*", "kind": "stop"})
    return codons


class Site:
    def __init__(self) -> None:
        self.env = Environment(
            loader=FileSystemLoader("src/templates"),
            autoescape=select_autoescape(["html", "xml", "j2"]),
            trim_blocks=True,
            lstrip_blocks=True,
        )
        self.env.filters["format_date"] = format_date
        self.env.filters["plain"] = plain_text
        self.env.globals["is_external_url"] = is_external_url

    def render(
        self, template_name: str, output_path: Path, context: dict[str, Any]
    ) -> None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            self.env.get_template(template_name).render(context), encoding="utf-8"
        )


def main() -> None:
    site = Site()
    profile = read_document(CONTENT_DIR / "profile.md")
    home = read_document(CONTENT_DIR / "home.md")
    home["summary"] = render_inline_markdown(home.get("summary", ""))
    publications = collection("publications")
    talks = collection("talks")
    projects = collection("projects")
    notes = collection("notes")

    for note in notes:
        note["url"] = f"posts/{note['slug']}.html"

    codon_name = profile.get("codon_name") or str(profile["name"]).split()[0]

    context = {
        "profile": profile,
        "home": home,
        "publications": publications,
        "talks": talks,
        "projects": projects,
        "notes": notes,
        "codons": translate_name(codon_name),
        "page_title": f"{profile['name']} · Computational biology",
        "page_description": profile.get("description", ""),
        "nav_current": "home",
        "asset_prefix": "",
        "year": date.today().year,
    }

    site.render("index.j2", Path("index.html"), context)

    pages = (
        (
            "Research",
            "publications.html",
            publications,
            "Papers, preprints, and research output.",
            "publications",
        ),
        ("Talks", "talks.html", talks, "Invited talks and presentations.", "talks"),
        (
            "Projects",
            "work.html",
            projects,
            "Open-source tools and selected projects.",
            "projects",
        ),
        (
            "Notes",
            "blog.html",
            notes,
            "Research notes, reading lists, and essays.",
            "notes",
        ),
    )
    for label, filename, items, description, nav_current in pages:
        site.render(
            "collection.j2",
            Path(filename),
            {
                **context,
                "page_title": f"{label} · {profile['name']}",
                "page_heading": label,
                "page_description": description,
                "items": items,
                "nav_current": nav_current,
            },
        )

    site.render(
        "404.j2",
        Path("404.html"),
        {**context, "page_title": f"Not found · {profile['name']}", "nav_current": "", "asset_prefix": "/"},
    )

    # Remove pages for notes that were deleted or renamed.
    POSTS_DIR.mkdir(exist_ok=True)
    current = {f"{note['slug']}.html" for note in notes}
    for old_post in POSTS_DIR.glob("*.html"):
        if old_post.name not in current:
            old_post.unlink()

    for note in notes:
        site.render(
            "note.j2",
            POSTS_DIR / f"{note['slug']}.html",
            {
                **context,
                "page_title": f"{note['title']} · {profile['name']}",
                "page_description": plain_text(note.get("summary", "")),
                "note": note,
                "nav_current": "notes",
                "asset_prefix": "../",
            },
        )


if __name__ == "__main__":
    main()
