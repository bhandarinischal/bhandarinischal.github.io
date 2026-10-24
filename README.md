# Nischal Bhandari — academic site

A lightweight static academic site. The interface is generated from Markdown so routine updates stay out of the codebase.

## Edit content

Everything you will regularly update lives in `content/`:

| Update | Markdown file |
| --- | --- |
| Name, contact details, social links | `content/profile.md` |
| Hero, bio, training, and research areas | `content/home.md` |
| A paper or preprint | `content/publications/<slug>.md` |
| A talk | `content/talks/<slug>.md` |
| A project or package | `content/projects/<slug>.md` |
| A note, essay, or reading list | `content/notes/<slug>.md` |
| CV | `assets/Nischal_Bhandari_CV.pdf` |

Create a publication by copying this pattern:

```markdown
---
title: Paper title
authors: Your Name, Collaborator Name
venue: Journal or preprint server
year: 2026
tags:
  - Cancer genomics
  - Single-cell
url: https://doi.org/...
---

Optional one-paragraph summary for the card.
```

The text beneath the front matter is ordinary Markdown. It is optional for papers, talks, and projects; it becomes the card summary when present.

## Handy extras

- **Checklists** in notes: write `- [ ] item` or `- [x] item`; they render as checkboxes.
- **Codon strip** on the home page spells your first name as mRNA → protein. Override the word with `codon_name: Something` in `content/profile.md` (letters with no amino acid, like B, J, O, U, X, Z, are skipped).
- **Research themes** under the hero come from `themes:` in `content/home.md`.
- **Hide an entry** without deleting it: add `draft: true` to its front matter.
- **Colours and fonts** are the variables at the top of `src/css/site.css`. The floating DNA/RNA/protein motifs and the hero helix live in `src/js/site.js`.

## Build

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python main.py
```

The build writes `index.html`, the collection pages, and `posts/*.html`. Do not hand-edit generated HTML.

## Project layout

```text
content/        Markdown content you edit
assets/         CV and any future static files
src/templates/  Shared HTML layouts
src/css/site.css
src/js/site.js
main.py         Static-site builder
```

GitHub Actions rebuilds the site on every push to `master`.
