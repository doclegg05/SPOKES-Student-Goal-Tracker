# SPOKES Agent Runbook

Status: Draft v0.6 (2026-02-27)
Primary reference: `SPOKES-Agent-Execution-Spec.md`

---

## 1) Sprint Initialization

Before starting lesson work:

1. Confirm sprint capacity (20-25 runtime hours/week).
2. Confirm active agent count (1-8).
3. Confirm lesson targets for sprint.
4. Freeze template baseline for sprint (unless approved template-change task exists).

---

## 2) Per-Lesson Workflow

### Step A: Intake and Validation

1. Verify source materials exist and are accessible.
2. Build asset checklist:
   - YouTube URLs (optional)
   - PDFs
   - Other downloads (`.docx`, `.pptx`) if required
3. Resolve missing critical inputs before build.

Output:
- Intake checklist with missing/complete status.

### Step B: WIPPEA Mapping

1. Map lesson content to WIPPEA stages:
   - Warm-up (W)
   - Introduction (I)
   - Presentation 1, 2, 3+ (P1, P2, P3...)
   - Evaluation (E)
   - Application (A)
2. Validate logical flow between stages.

Output:
- WIPPEA map summary.

### Step C: Build

1. Start from approved template baseline.
2. Propose lesson color schema to user; do not finalize theme until approved.
3. Propose Google Font pairing to user; do not proceed until approved.
4. Apply lesson theme per canonical palette policy:
   - Use only canonical 11-color values.
   - Mix major/minor color emphasis per lesson for differentiation.
   - Validate planned foreground/background pairings against contrast and anti-clash guardrails in `brand-palette.md`.
5. Apply media rule:
   - Embed YouTube if URL exists.
   - Use placeholder if URL is missing.
6. Add interactive elements per lesson requirements:
   - Minimum 3 required qualifying interactions per lesson (tabs, accordion, checkpoint prompt); optional 4th+ only when it adds clear value.
   - Required interactions: tabs, accordion, checkpoint prompt (non-graded).
   - Optional 4th+ interaction only when it adds clear instructional value.
   - Candidate optional upgrades are tracked in `docs/future-upgrades.md`.
   - Interactions must be functionally interactive, keyboard-usable, and designed for instructor-led facilitation.
   - Next/prev navigation does not count toward this minimum.
7. Add validated download links.

Output:
- Updated `index.html`

### Step D: Hard Gate QA

Run all 5 gates:

1. Accessibility and readability.
2. Multimodal functionality.
3. WIPPEA adherence.
4. Brand/thematic cohesion.
5. Interactive engagement.

Classify issues by severity:
- Critical / High / Medium / Low.

Output:
- Gate report and defect log.

### Step E: Release Decision

1. Block release if any Critical defects remain.
2. Ensure High defects are sprint-committed.
3. Confirm final color schema has explicit user approval.
4. Publish release decision with rationale.
5. Create fast-follow ticket list for Phase 2 accessibility work.
6. If first three current project lessons are finalized, activate Phase 2 accessibility remediation workflow.

Output:
- Release decision record.

---

## 3) Required QA Evidence

Each lesson must include:

1. Link validation results.
2. Contrast validation results.
3. Color schema approval evidence:
   - User-approved color schema snapshot or explicit sign-off record.
4. Color-role validation results:
   - Confirm per-lesson color mix is unique enough to differentiate from adjacent lessons.
   - Confirm no disallowed accent-on-accent clash pairings are used.
5. Device responsiveness checks using locked matrix:
   - 360x800 (mobile portrait)
   - 768x1024 (tablet portrait)
   - 1920x1080 (desktop landscape)
6. One-screen layout checks:
   - Desktop/tablet: sidebar + active slide visible together on one screen.
   - Mobile: active slide visible on one screen; sidebar accessible via toggle/drawer.
7. Horizontal overflow checks:
   - No horizontal scrolling/panning at any required viewport.
8. Keyboard navigation checks.
9. WIPPEA stage compliance notes.
10. Interaction-facilitation evidence:
   - Instructor prompt panel present on each interaction card.
   - View Prompt/Hide Prompt toggle works.
   - Prompt panel is hidden by default.

---

## 4) Defect Triage Rules

1. Critical:
   - Fix before merge/release.
2. High:
   - Fix within current sprint.
3. Medium:
   - Fix within 2 sprints/polish.
4. Low:
   - Backlog as capacity allows.

---

## 5) Escalation Triggers

Escalate to lead immediately if:

1. A hard gate cannot be validated due to missing criteria.
2. Palette/theming conflicts appear between spec documents.
3. Accessibility blocker cannot be remediated within sprint.
4. A template-level change is needed after template freeze.

---

## 6) Unresolved Inputs Blocking Full Automation

1. None.
