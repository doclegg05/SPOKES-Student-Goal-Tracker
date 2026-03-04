# SPOKES Lesson Builder — Agent Instructions

You are building an interactive HTML slideshow presentation for **SPOKES** (Strategic Planning in Occupational Knowledge for Employment and Success — Skills for Life), a WV Adult Basic Education program.

## What You Build

A **single self-contained `index.html` file** that is a fully interactive classroom presentation. No build tools, no frameworks, no external dependencies beyond Google Fonts. The CSS and JavaScript are embedded in the file.

**Output:** A complete project folder ready to serve and deploy.

## Reference Files

These files are in this directory (`SPOKES Builder/`):

| File                          | Purpose                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `brand-palette.md`            | **CANONICAL** source of truth for all 11 SPOKES brand colors. Every other file must match this.      |
| `template.html`               | Base skeleton HTML with all CSS/JS intact. Copy this and fill in content.                            |
| `components.md`               | Copy-paste HTML patterns for every slide type and component.                                         |
| `build-process.md`            | Step-by-step workflow, WIPPEA mapping, and verification checklist.                                   |
| `AGENT_THEMING_GUIDELINES.md` | Brand color enforcement, font pairing rules, video placeholders, and template variant guidance.       |
| `content-intake-template.md`  | Structured form for human content teams to deliver lesson content ready for building.                 |

## Design Philosophy

Each SPOKES lesson must be **visually distinct** from every other lesson while staying within the brand. Think of it like PowerPoint Slide Masters — the same guardrails, but no two presentations look alike.

Visual identity comes from:
1. **Template variant selection** (3-4 distinct layout styles)
2. **Google Font pairings** (unique heading + body fonts per lesson)
3. **Accent emphasis shifts** (which of the 7 brand colors gets featured most)
4. **Component selection** (different mix of cards-grid, takeaways, split-layout, etc.)

**NEVER introduce colors outside the 11 approved brand colors (see `brand-palette.md`).** See `AGENT_THEMING_GUIDELINES.md` for the full palette.

## Build Process (10 Steps)

### Step 1: Analyze Input Materials

Read everything the user provides (PowerPoint, lesson plan, PDFs). Identify:

- Lesson topic and title
- All content points and concepts
- Video topics (placeholder slides will be built — videos are added later)
- Downloadable handouts/PDFs

### Step 2: Map Content to WIPPEA Chapters

SPOKES lessons follow the **WIPPEA** instructional framework. The standard structure has **7 chapters**, but more are allowed if the content demands it:

| #   | data-chapter | data-chapter-num | Stage          | Content                        |
| --- | ------------ | ---------------- | -------------- | ------------------------------ |
| 1   | `"1"`        | `"W"`            | Warm-Up        | Title slide + opening activity |
| 2   | `"2"`        | `"I"`            | Introduction   | Objective + framing            |
| 3   | `"3"`        | `"P1"`           | Presentation 1 | Core topic area 1              |
| 4   | `"4"`        | `"P2"`           | Presentation 2 | Core topic area 2              |
| 5   | `"5"`        | `"P3"`           | Presentation 3 | Core topic area 3              |
| 6   | `"6"`        | `"E"`            | Evaluation     | Exit ticket + assessment       |
| 7   | `"7"`        | `"A"`            | Application    | Discussion + closing           |

Additional Presentation chapters (P4, P5, etc.) may be added if the lesson has more content areas.

**Target: 25-35 slides total.**

### Step 3: Select Template Variant & Font Pairing

Before building:
1. Review existing lessons to see which template variants are in use
2. Select a variant that creates visual contrast with adjacent lessons
3. **Propose a Google Font pairing to the user for approval**
4. Do not proceed until the font pairing is approved

### Step 4: Copy Template & Apply Theme

1. Copy `template.html` to the new project directory as `index.html`
2. Add lesson-specific Google Font `<link>` tags in `<head>`
3. Add a `<style id="theme-override">` block **AFTER** the main CSS block with font overrides and video placeholder CSS

### Step 5: Fill in Lesson Metadata

Replace these placeholders:

- `{{LESSON_TITLE}}` — in `<title>` tag and `<h1>` on title slide
- `{{SUBTITLE}}` — on the title slide `.subtitle` paragraph
- `chapterNames` object in JavaScript — update chapter names

### Step 6: Build Slides Chapter by Chapter

For each chapter:

1. Keep the `slide-section` divider (already in template)
2. Add content slides between dividers using components from `components.md`
3. Choose the right component for each piece of content (see decision guide below)
4. Maintain the `data-chapter` attribute matching the chapter number
5. **Vary component choices** — do not replicate the same sequence as other lessons

### Step 7: Add Video Slides

For each video referenced in the source materials:

1. Create a content slide that introduces the video topic
2. Follow it with a `slide-video` slide
3. Title format: `Watch: [Video Topic]`
4. **If a YouTube URL is provided**, embed it using the iframe pattern from `components.md`
5. **If no URL is provided**, use the video placeholder pattern from `AGENT_THEMING_GUIDELINES.md`

### Step 8: Link Resources in Sidebar

Update the `<div class="resources-section">` in the sidebar nav with links to all downloadable PDFs:

```html
<a href="Handouts/filename.pdf" target="_blank" class="resource-link"
  >Display Name</a
>
```

### Step 9: Set Up Project Folder

```
Lesson-Name/
  index.html
  SPOKES-Logo.png
  Handouts/           (student PDFs)
  Teacher-Resources/  (teacher guides)
  .claude/launch.json
  .gitignore
```

### Step 10: Verify

Use the preview server to confirm:

- All slides render correctly
- Sidebar populates with correct chapter/slide names
- Video slides display properly (embedded iframes or styled placeholders)
- Download links work
- Closing slide triggers confetti
- No console errors
- **No off-brand colors** — check all CSS values against the 11-color palette in `brand-palette.md`

## Component Selection Decision Guide

```
What type of content is this?

Key quote or transition statement?     --> big-statement (slide type)
Video topic?                           --> slide-video (embed if URL provided, placeholder if not)
Comparing 2-6 related items?           --> cards-grid
Ordered steps or numbered list?        --> takeaways
Acronym breakdown (letter per row)?    --> smart-stack
4-quadrant decision framework?         --> matrix-grid
4-6 items with hidden details?         --> dangers-grid (flip cards)
3 major categories with bullets?       --> areas-grid
Definition + visual emoji?             --> split-layout
Group activity or discussion prompt?   --> activity-box (inside another component)
Downloadable PDF reference?            --> download-resource (inside another component)
Simple arrow-pointed list?             --> content-list
```

## Design System Rules

### Colors — 11-Color Strict Palette

> **Canonical source:** `brand-palette.md` — all hex values, contrast ratios, and prohibited colors are defined there. If this summary and `brand-palette.md` diverge, the palette file wins.

7 core colors (`--primary`, `--accent`, `--dark`, `--light`, `--muted`, `--gray`, `--gold`) + 4 extended (`--royal`, `--mauve`, `--offwhite`, `--muted-gold`). No other colors permitted. See `brand-palette.md` for exact hex values, safe text/background combinations, and the full prohibited list.

### Typography

- **Default Headings:** `'DM Serif Display', serif`
- **Default Body:** `'Outfit', sans-serif`
- Each lesson overrides these with its own approved font pairing
- **h1:** 5rem (title slide only)
- **h2:** 3.5rem (slide titles) or 4rem (section dividers) or 4.5rem (big-statement)
- **Body text:** 1.25rem-2rem depending on component

### Text Highlighting

Use `<span>` with these classes inside paragraphs:

- `<span class="highlight">blue emphasis</span>`
- `<span class="accent">green emphasis</span>`
- `<span class="gold">gold emphasis</span>`
- `<span class="mauve">mauve emphasis</span>`

### Global Design Standards

- **Faded chapter watermark on section dividers:** Every `slide-section` must display a large, faded chapter identifier (letter or number) as a background watermark using the `::after` pseudo-element with `content: attr(data-chapter-num)`. This is a signature SPOKES design element and must appear in ALL template variants.

### Animations

All animations are automatic via CSS. No JS needed. Each component type has staggered entry animations (0.1s-0.6s delays per item).

## Important Rules

1. **Single file.** All CSS and JS must be inside `index.html`. No external stylesheets or scripts.
2. **Copy CSS/JS verbatim.** The `<style>` and `<script>` blocks in `template.html` are the standard. Do not modify the main block.
3. **Theme override placement.** The `<style id="theme-override">` block goes **AFTER** the main CSS block, not before it.
4. **Brand colors only.** All 11 CSS variables stay as defined. No additional color variables.
5. **The only JS you change** is the `chapterNames` object to match the lesson's chapter names.
6. **data-chapter must be sequential** starting from 1. The sidebar builds itself from these attributes.
7. **First slide** must be `slide-title` with `active` class and `data-chapter="1"`.
8. **Last slide** must be `slide-closing` with `id="closingSlide"`.
9. **Every chapter** must start with a `slide-section` divider.
10. **Videos** — if a YouTube URL is provided, embed it. If no URL is provided, use the video placeholder component.
11. **SPOKES-Logo.png** must be in the project root (same directory as index.html).
12. **File paths in links** must be relative to index.html (e.g., `Handouts/file.pdf`).
13. **File nesting** must not exceed 3 levels from project root.
14. **Font pairings require user approval** before applying to any lesson.

## File Naming Conventions

- PDFs: `SPOKES_[Module]_[Description].pdf` or `[Descriptive_Name].pdf`
- Use underscores for word separation in filenames
- Use hyphens for project folder names
- Include version numbers at end if needed: `_1`, `_2`
