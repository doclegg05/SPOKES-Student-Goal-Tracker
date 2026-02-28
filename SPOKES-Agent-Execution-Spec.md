# SPOKES Agent Execution Spec

Status: Draft v0.6 (2026-02-27)
Audience: Autonomous agents with minimal supervision
Purpose: Single operational source for planning, building, QA, and release decisions.

---

## 1) Source-of-Truth Order

If documents conflict, use this precedence:

1. This file (`SPOKES-Agent-Execution-Spec.md`)
2. `docs/final-product-definition.md` (final product behavior/experience intent)
3. `SPOKES Builder/brand-palette.md`
4. `SPOKES Builder/build-process.md`
5. `SPOKES-Master-Action-Plan.md`

---

## 2) Locked Decisions

1. Output format:
   - Produce lesson deliverables as single self-contained `index.html` files per lesson.
2. Accessibility policy:
   - WCAG 2.2 AA is required via phased rollout.
   - Phase 1 is a hard release gate.
   - Phase 2 is fast-follow compliance.
3. Media rule:
   - If a YouTube URL is provided, embed it.
   - If no URL is provided, render the approved video placeholder component.
4. Palette source:
   - Canonical color system is `SPOKES Builder/brand-palette.md`.
5. Color policy:
   - Use strict fixed 11-color palette only (no non-canonical hex values).
   - Controlled per-lesson color mixing is allowed within the 11-color palette.
   - Theme variation should come from layout, typography, spacing, component composition, and palette-safe color-role changes.
   - All color usage must follow the contrast and anti-clash guardrails in `SPOKES Builder/brand-palette.md`.
6. Agent concurrency:
   - 1 to 8 agents depending on sprint scope.
7. Capacity:
   - Plan against 20-25 hours of total agent runtime per week.
8. Milestone target:
   - Phase 1 target: 6 lessons complete by April 15, 2026.
9. Program end target:
   - All 18 lessons complete by April 15, 2027.
10. Template governance:
   - After Sprint 1 stabilization, no direct manual template edits outside controlled change workflow.
11. Severity/SLA policy:
   - Canonical SLA model is defined in Section 4 of this document (Critical/High/Medium/Low).
12. Phase 2 accessibility rollout trigger:
   - Fast-follow Phase 2 begins when the first three current project lessons are finalized.
   - At that trigger point, open Phase 2 items must be scheduled and tracked under SLA.
13. Interactive minimum:
   - Each lesson must include at least 3 qualifying interactive elements.
   - Qualifying elements include: flip cards, clickable matrices, tabs/accordions, step reveals, and quiz/checkpoint interactions.
   - If any of these component types are present in a lesson, they must be functionally interactive (not decorative only).
14. Device QA matrix (locked):
   - Mobile phone: 360x800 (portrait)
   - Tablet: 768x1024 (portrait)
   - Desktop: 1920x1080 (landscape)
   - Device-dependent layout rule:
     - Desktop and tablet: sidebar and active slide must be fully visible together on one screen.
     - Mobile: active slide must be fully visible on one screen; sidebar may be collapsed by default and accessed via toggle/drawer.
   - At all three viewports: no horizontal scrolling/panning is allowed.
15. Color schema approval:
   - Each lesson must have a final color schema approved by the user before build finalization/release.
   - Agents must not self-approve final color role combinations.

---

## 3) Hard Ship Gates (In Priority Order)

All five gates must pass for release.

### Gate 1: Accessibility and Readability (Barrier-to-Entry)

Phase 1 release blockers:
- Device QA matrix must pass at:
  - 360x800 (mobile portrait)
  - 768x1024 (tablet portrait)
  - 1920x1080 (desktop landscape)
- Device-dependent one-screen visibility rule:
  - Desktop/tablet: sidebar + active slide visible together on one screen.
  - Mobile: active slide visible on one screen; sidebar available via toggle without horizontal panning.
- No horizontal scrolling/panning at any required viewport.
- Text contrast meets WCAG AA threshold (4.5:1 for normal text, 3:1 for large text).
- Font sizing and line-height remain legible across mobile/tablet/desktop.
- Basic keyboard tab navigation works through sidebar and main slide content.

Phase 2 fast-follow:
- ARIA state/label completeness.
- Closed captions for videos.
- Focus management behavior on slide transitions and component interaction.

### Gate 2: Multimodal Core Functionality (Technical)

- Embedded media containers render without overflow or layout breakage.
- Download links resolve to valid files.
- No broken media URLs in production lessons.

### Gate 3: WIPPEA Method Adherence (Pedagogical)

- Lesson flow must align to WIPPEA stages (Warm-up, Introduction, Presentation 1/2/3+, Evaluation, Application).
- Stage progression must be logically ordered and complete.
- Additional Presentation stages (P4, P5, etc.) are permitted if content requires it.

### Gate 4: Brand and Thematic Cohesion (Professionalism)

- Must retain SPOKES structural shell (sidebar, progress, typography hierarchy, component system).
- Theme styling must conform to canonical palette policy, contrast constraints, and anti-clash guardrails.
- Per-lesson color differentiation is required, but only via controlled mixing of canonical palette colors.
- Final color schema must have explicit user approval.

### Gate 5: Interactive Engagement (Retention)

- Lesson must include at least 3 qualifying interactive elements.
- Qualifying interactions: flip cards, clickable matrix, tabs/accordions, step reveal, quiz/checkpoint.
- If these components appear, they must be truly interactive and keyboard-usable.
- Navigation controls alone (next/prev) do not satisfy this gate.

---

## 4) Severity and SLA Enforcement

Use this release policy:

- Critical:
  - Blocks access/progression or violates Phase 1 accessibility baseline.
  - Must be fixed before merge/release.
- High:
  - Major friction; feature works but quality/pedagogy/function is materially degraded.
  - Must be fixed within current sprint.
- Medium:
  - Non-blocking friction.
  - Fix within 2 sprints or polish window.
- Low:
  - Cosmetic.
  - Fix as capacity allows.

---

## 5) Agent Execution Model

For each lesson:

1. Intake and mapping:
   - Validate source assets.
   - Map content to WIPPEA stages.
2. Build:
   - Apply template shell.
   - Propose lesson color schema and receive user approval before finalizing theme choices.
   - Propose Google Font pairing to user and receive approval before applying.
   - Apply lesson theme within allowed palette policy.
   - Add components and resources.
3. QA:
   - Run hard gate checks.
   - Tag defects by severity.
4. Release:
   - Release only if all critical blockers are closed.
5. Fast-follow:
   - Track and close Phase 2 accessibility items per SLA.
   - Activate this phase once the first three current project lessons are finalized.

For each sprint:

1. Capacity plan using 20-25 hours/week.
2. Assign 1-8 agents by workload and risk.
3. Reserve explicit time for QA and rework.

---

## 6) Required Artifacts Per Lesson

1. `index.html`
2. Media and handout link inventory (with pass/fail validation)
3. Gate report:
   - Gate 1-5 results
   - Defects by severity
   - Release decision
4. Color schema approval record (approved proposal snapshot or explicit sign-off note)
5. Fast-follow log for any deferred Phase 2 items

---

## 7) Pending Clarifications (Need Final Lock)

1. None at this time for core ship gates.
