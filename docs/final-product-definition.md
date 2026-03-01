# Final Product Definition (Authoritative)

Status: Authoritative
Effective Date: 2026-03-01
Owner: Britt

This document defines the exact target state for SPOKES lesson deliverables and interaction design. If any document conflicts with this one on final-product behavior, this document governs final-product intent while `SPOKES-Agent-Execution-Spec.md` remains governing for gate policy and release controls.

---

## 1) Product Experience Intent

### First-10-seconds emotional target
- Primary: **Professional and credible**

### Visual style priority (highest to lowest)
1. **Modern premium**
2. **Minimal corporate**
3. **Selective bold editorial accents**
4. **Utility-first fallback**

### Motion policy
- Default: subtle, smooth, non-distracting
- Expressive motion: only at key moments

### Cross-lesson consistency model
- **High variety** across lessons is allowed and encouraged
- Variety must stay within brand, accessibility, and shell constraints

---

## 2) Delivery Model

- Lessons are **instructor-led** by design
- Interactions are for facilitation and engagement, not automated grading
- Rubric use is **participation/engagement-based**, with classroom-level analysis by instructors
- Avoid right/wrong assessment framing as a default interaction behavior

---

## 3) Interaction Blueprint (Standard)

Each lesson must include:

### Required (3 interactions)
1. Tabs interaction (standard)
2. Accordion interaction (standard)
3. Checkpoint prompt interaction (standard, non-graded)

### Optional (4th+ interactions)
- Add only if it provides clear instructional value for that specific lesson.
- Candidate upgrades are tracked in `docs/future-upgrades.md`.
- Do not add filler interactions to hit volume.

---

## 4) Instructor Prompt Panel Standard

For **every interaction**, include an instructor prompt panel with:
1. Suggested prompt question
2. Expected discussion direction
3. Quick debrief cue

Behavior requirements:
- Panel is **hidden by default**
- Toggle control: **View Prompt / Hide Prompt**
- Toggle location: **top-right of each interaction card**
- Prompt length: **short** (1–2 sentences per field)

Facilitation mode support:
- Whole-class
- Pair/small-group
- Individual reflection
- Instructor can adapt mode in real time (blended model)

---

## 5) Non-Negotiables for Final Product

1. Canonical 11-color SPOKES palette only
2. WCAG 2.2 AA baseline compliance per execution spec
3. WIPPEA sequence integrity
4. 3 required interactions implemented and keyboard-usable
5. Instructor prompt panel behavior exactly as defined here

---

## 6) Release Interpretation Rule

A lesson is "final-product compliant" only when:
- It passes hard ship gates in `SPOKES-Agent-Execution-Spec.md`, and
- It conforms to this product definition for interaction/facilitation behavior.

---

## 7) Change Control

Any change to this file requires explicit Britt approval and a versioned commit note.
