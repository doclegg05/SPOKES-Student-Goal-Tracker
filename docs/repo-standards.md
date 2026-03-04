# Repository Standards

## Naming

- Use `kebab-case` for folders/files where practical.
- Avoid spaces and apostrophes in new paths.
- Use consistent lesson folder naming:
  - `lesson-<topic>` (example: `lesson-time-management`)
- Markdown docs should use one naming style consistently (`kebab-case.md` or `Title-Case-With-Dashes.md`).

## Lesson Folder Contract

Each lesson folder should contain:

- `index.html` (required)
- `Handouts/` (optional but preferred for student artifacts)
- `Teacher-Resources/` (optional)
- `SPOKES-Logo.png` (if needed locally)

## Governance Docs

Required root-level governance docs:

- `SPOKES-Agent-Execution-Spec.md`
- `SPOKES-Agent-Runbook.md`
- `SPOKES-Project-Plan.md`
- `SPOKES-Master-Action-Plan.md`

## Dashboard Governance

`Dashboard.html` is a governed release artifact and must pass:

- canonical palette compliance
- WCAG contrast compliance
- link integrity checks
- module launcher integrity checks
- regression check for all listed lesson links

## Versioning & Change Control

- Template baseline changes require explicit commit note:
  - `template-change: <summary>`
- Any change to color policy or hard gates must update:
  - `SPOKES-Agent-Execution-Spec.md`
  - impacted guidance docs in `SPOKES Builder/`

## Quality Enforcement

Before merge/release:

- brand color scan
- contrast review
- keyboard navigation check
- no horizontal overflow at required viewports
- required interactions present and functional
