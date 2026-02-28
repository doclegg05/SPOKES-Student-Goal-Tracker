# Static QA Audit — 2026-02-28

Scope: Initial automated checks after content migration for three active lessons.

## lesson-interview-skills

- Off-palette hex values detected in CSS/style contexts: **9**
- Sample values: #001a52, #1a365d, #2b6cb0, #2e9a44, #7a1b2e, #dc2626, #e8839c, #e8e9ea, #f0f1f2
- Broken local resource links: **0**

## lesson-time-management

- Off-palette hex values detected in CSS/style contexts: **10**
- Sample values: #002a4d, #003d5e, #006a96, #2e9a44, #991b1b, #c4a34b, #dc2626, #e0e0e0, #eef2f6, #f4f8fb
- Broken local resource links: **0**

## lesson-employee-accountability

- Off-palette hex values detected in CSS/style contexts: **27**
- Sample values: #183d65, #193f68, #1a3f6b, #1a4570, #1b4872, #1c4a75, #1e4a7d, #2862a8, #2a6aaf, #2c69b2, #2d6db5, #2f6eb6, #306fb8, #3272bb, #3da33d, #4cb848, #5a6a7a, #6dd669, #a7f3d0, #dc2626
- Broken local resource links: **0**

## Preliminary Gate Impact

- Gate 2 (local link integrity): Pass for Interview Skills + Time Management after link fix; Employee Accountability local links pass.
- Gate 4 (brand palette): Failing across all three lessons due to off-palette hex usage.
- Gate 1, 3, and 5 still require manual/functional validation per runbook.
