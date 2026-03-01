# Curriculum Employability Skills

SPOKES interactive employability curriculum system with standards, templates, and lesson production workflow.

## Quick Start (3 minutes)

1. Read `SPOKES-Agent-Execution-Spec.md` (source of truth + locked decisions)
2. Read `SPOKES-Agent-Runbook.md` (how to execute lesson work)
3. Read `SPOKES Builder/build-process.md` (build pipeline)
4. Open `SPOKES Builder/template.html` (baseline lesson shell)

## Repository Structure

- `SPOKES-Agent-Execution-Spec.md` — authoritative operating spec
- `SPOKES-Agent-Runbook.md` — operational workflow for lesson execution
- `SPOKES-Project-Plan.md` — phased project delivery plan
- `SPOKES-Master-Action-Plan.md` — consolidated issue register + sprint plan
- `Dashboard.html` — curriculum launcher/dashboard
- `Interview-Skills/` — lesson module (existing)
- `SPOKES Builder/` — design system + template assets

### SPOKES Builder

- `template.html` — canonical lesson template baseline
- `brand-palette.md` — canonical 11-color system + usage/contrast guardrails
- `build-process.md` — end-to-end lesson construction process
- `components.md` — reusable lesson UI/content components
- `content-intake-template.md` — structured intake format for source teams
- `AGENT_THEMING_GUIDELINES.md` — theming and style override guidance

## Governance / Precedence

If docs conflict, use this order:

1. `SPOKES-Agent-Execution-Spec.md`
2. `SPOKES Builder/brand-palette.md`
3. `SPOKES Builder/build-process.md`
4. `SPOKES-Master-Action-Plan.md`

## Build Output Contract

Each lesson ships as a **single self-contained `index.html`** with:

- WCAG-aligned accessibility baseline
- WIPPEA structural adherence
- brand-compliant color usage (canonical palette only)
- 3 required qualifying interactions (+ optional 4th+ where it adds clear value)
- validated links/resources

## Quality Gates

All lesson releases must pass:

1. Accessibility/Readability
2. Multimodal Functionality
3. WIPPEA Adherence
4. Brand/Thematic Cohesion
5. Interactive Engagement

See `SPOKES-Agent-Execution-Spec.md` for full gate criteria and severity/SLA policy.

## Current Status (high level)

- Existing lessons: 3 (mixed quality state)
- Program target: 18 lessons total
- Ongoing work: template stabilization, lesson remediation, production batching

## Operational Docs in This Repo

- `lesson-registry.json` (variant/font/component tracking per lesson)
- `docs/repo-standards.md` (naming and structure policy)
- `docs/release-checklist.md` (release quality checklist)
- `docs/future-upgrades.md` (deferred optional enhancements backlog)
- `README-dashboard.md` (dashboard acceptance criteria + ownership model)
- `docs/final-product-definition.md` (authoritative final product target)
