# Lesson Migration Status

Date: 2026-02-27

## Completed

- Canonical lesson paths established:
  - `lesson-time-management/`
  - `lesson-employee-accountability/`
- Dashboard links updated to canonical paths.
- Placeholder `index.html` pages created so links resolve and do not 404.
- Lesson registry + release checklist + standards docs created.
- Teacher resources folder naming standardized in Interview Skills.

## In Progress

- Full content migration into canonical lesson folders.
- Gate-by-gate QA evidence capture for all three active lessons.

## Blocked / Requires Input

- Legacy lesson content for Time Management and Employee Accountability was referenced as gitlink entries (submodule-style pointers) with no local files.
- Source files must be recovered from one of the following:
  1. Original source repository/branch containing real lesson files
  2. Archived local copy
  3. Export from prior authoring environment

## Next Actions

1. Recover source content for Time Management + Employee Accountability.
2. Migrate assets to canonical lesson folders:
   - `index.html`
   - `SPOKES-Logo.png`
   - `Handouts/`
   - `Teacher-Resources/`
3. Run full gate QA and update reports under `docs/qa-reports/`.
4. Update `lesson-registry.json` statuses from `planned` to `qa`/`complete` as evidence is collected.
