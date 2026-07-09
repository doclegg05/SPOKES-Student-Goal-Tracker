# Nicholas County SPOKES — Employment Readiness Project

## Mission

Help Nicholas County SPOKES students (WV Adult Basic Education) **find and earn jobs**. Every artifact in this project should move a real student closer to employment.

Concretely, you help produce:

- **Resumes** (Reactive Resume JSON, Word, PDF)
- **Cover letters** tailored to specific job postings
- **Interview prep guides** (STAR worksheets, common-question drills, practice scripts)
- **Career discovery guides** (interest inventories, goal-setting worksheets)
- **Employment portfolios** (certifications + benchmarks packaged for employers)
- **Supporting referrals & connections** (Legal Aid, support services, certification programs)

## Project Layout

```
SPOKES Goal Setting Project/
├── Student Portfolios/        # Templates only (samples, blank forms) — no named students
│   ├── Portfolio Blank Forms/ # Reusable employment portfolio checklists & fact sheets
│   └── Certifications/        # Sample certificates + module descriptors per credential
├── SPOKES Builder/            # SEPARATE PROJECT — lesson slideshow builder (has its own AGENTS.md)
├── data/                      # E2E fixture only (student-goals.e2e.json); live data is quarantined
├── SPOKES_Goal_Tracker.xlsx   # Master goal-tracking spreadsheet
├── Project Launch.docx        # Original project brief
└── NCSPOKES.Logo.jpg          # Brand asset

../_student-records/SPOKES Goal Setting Project/   # FERPA quarantine (never agent cwd)
├── data/student-goals.json    # Live classroom goal store
└── Student Portfolios/        # Named student folders + Student Resumes_AI (PII)
```

> **Scope boundary:** `SPOKES Builder/` is a different project (interactive HTML lessons). When the user asks about lesson content, slides, WIPPEA, or brand colors, switch context to that folder and follow its AGENTS.md. Do **not** mix lesson-builder concerns into employment-prep work.

## Privacy & PII (Critical)

Real student records live under `../_student-records/SPOKES Goal Setting Project/` (see `Dev/docs/ferpa-zones.json`). That tree contains real names, addresses, transcripts, certification numbers, legal-aid referrals, and financial receipts.

**Rules:**
- **Never** open, upload, paste, or transmit student-identifying data to third-party web tools, public gists, cloud LLMs, or external chats unless the user explicitly names both the data and the destination.
- Do **not** use `_student-records/` as an agent working directory.
- When generating a sample to share publicly, **use a placeholder name** (e.g., "Jane Doe", "Sample Student") — not a real student's data.
- When a student-specific document is being edited, work on it **in place** within that student's quarantine folder. Don't duplicate it into the lesson project tree.
- Treat scans, transcripts, IDs, and screenshots inside student folders the same as the documents themselves.

## Working Conventions

### Resumes
- The canonical machine-readable format is **Reactive Resume JSON** (see existing `*resume*.json` files under student folders).
- For Word output, mirror the structure already present in that student's folder — match their existing style, don't reformat from scratch.
- When a student has multiple resume versions, ask which is current before editing.

### Cover Letters
- Always tied to a specific job posting. Ask for the posting (URL or pasted text) before drafting.
- Keep one page. Lead with a specific match between the student's experience and the posting's requirements.

### Interview Prep
- Default to the **STAR method** (Situation, Task, Action, Result) — there's already a STAR worksheet in `Interview-Skills/` git history.
- Build practice questions from the actual job posting when one is provided.

### Certifications
- Reference real Nicholas County SPOKES credentials (Ready to Work, WorkKeys NCRC, MOS, QuickBooks, Adobe ACA, ITS Cybersecurity, IC3, Customer Service TTCE, Food Handlers, CSM, Computer Essentials).
- Use the sample certificate and module-descriptor docs in `Student Portfolios/Certifications/<credential>/` as the source of truth for what each credential covers.

### File Naming
- Student materials: `Firstname Lastname <DocumentType>.<ext>` (matches existing convention, e.g., `Karissa Spencer Resume 2025.docx`).
- Dated documents: append `MM.DD.YY` or `YYYY-MM-DD`.

### Folder Depth
- The global rule is "never more than 3 levels deep." Quarantined student folders sometimes exceed that (e.g., `_student-records/.../Student Portfolios/<Student>/<Sub-area>/file`). **Respect the existing structure** — do not reorganize student folders to flatten them. For *new* materials, follow the 3-deep guideline.

## Tools & Formats

- **DOCX / PDF** — generate via the `docx` and `pdf` skills; never hand-roll Office XML.
- **Resume JSON** — the `resume-builder` skill or `resume-writer` agent handles Reactive Resume schema.
- **XLSX** — `SPOKES_Goal_Tracker.xlsx` updates go through the `xlsx` skill.

## When in Doubt

- If a student's name or job target isn't named in the request, **ask** before generating — don't guess.
- If a job posting is mentioned but not provided, **ask for the posting** before drafting cover letters or interview prep.
- If a request could touch the lesson builder *or* the employment-prep side, **confirm which** before acting.
