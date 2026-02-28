# Lesson Release Checklist

Use this checklist before merging or publishing any lesson.

## 1) Accessibility & Readability (Gate 1)

- [ ] Viewport checks passed at 360x800, 768x1024, 1920x1080
- [ ] No horizontal scrolling at required viewports
- [ ] Desktop/tablet shows sidebar + active slide on one screen
- [ ] Mobile shows active slide on one screen; sidebar reachable by toggle
- [ ] Contrast meets WCAG AA (4.5:1 normal, 3:1 large)
- [ ] Keyboard navigation works for sidebar + content
- [ ] `prefers-reduced-motion` path tested

## 2) Multimodal Functionality (Gate 2)

- [ ] Media containers render without overflow
- [ ] YouTube/embed or placeholder behavior follows media rule
- [ ] Resource/download links are valid
- [ ] No broken production media URLs

## 3) WIPPEA Adherence (Gate 3)

- [ ] WIPPEA stage order is complete and logical
- [ ] Warm-up, Intro, Presentation stage(s), Evaluation, Application present
- [ ] Stage labels and chapter mapping are accurate

## 4) Brand/Thematic Cohesion (Gate 4)

- [ ] Only canonical 11-color palette values used
- [ ] No off-palette hex values in CSS/JS
- [ ] Contrast + anti-clash guardrails honored
- [ ] Final color schema approved by user (record reference)
- [ ] Selected font pairing approved by user

## 5) Interactive Engagement (Gate 5)

- [ ] 4 required interactions implemented: tabs, accordion, checkpoint prompt, scenario simulator
- [ ] Optional 5th interaction included only when instructionally valuable
- [ ] Interactions are truly interactive (not decorative only)
- [ ] Interactions are keyboard-usable
- [ ] Interactions support instructor-led facilitation (no auto-grading/right-wrong engine by default)
- [ ] Instructor prompt panel toggle present on each interaction card (View Prompt/Hide Prompt)
- [ ] Instructor prompt panel hidden by default
- [ ] Next/Prev controls not counted toward minimum interactions

## 6) Stability & QA Evidence

- [ ] Browser console free of blocking errors
- [ ] Gate report attached (pass/fail + defects by severity)
- [ ] Deferred issues logged with SLA category
- [ ] Lesson registry entry updated (`lesson-registry.json`)

## Release Decision

- [ ] **Release Approved** (no Critical defects)
- [ ] **Blocked** (Critical defects present)

Decision notes:

```
Date:
Lesson:
Approver:
Decision:
Critical defects:
High defects committed to sprint:
References:
```
